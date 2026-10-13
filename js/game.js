// Gamificación: XP, niveles, racha diaria y logros.

import { getState, update, today, addDays } from './store.js';
import { getSlots, findRecipe, matchInfo, rankRecipes } from './engine.js';
import { ING } from './data/ingredients.js';
import { canUse } from './premium.js';
import { getDiet } from './data/diets.js';

export const XP = {
  meal: 15,          // registrar una comida de la dieta
  perfectMatch: 5,   // bono si la cocinaste solo con lo que tenías
  perfectDay: 25,    // completar todos los tiempos de comida del día
  plan: 20,          // armar tu plan semanal (una vez por semana)
  challenge: 10,     // completar el reto del día
  water: 2,          // cada vaso de agua (una vez por vaso al día)
  waterGoal: 4,      // bono al llegar a la meta de agua
  extra: 5,          // snack extra para llegar a tu meta de calorías
};

// ── Reto del día ──
export const WATER_GOAL = 8;

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function todayChallenge(state = getState()) {
  const t = today();
  const slots = getSlots(state.profile.mealsPerDay);
  const types = ['use_ing', 'perfect', 'two', 'new', 'water'];
  if (slots.some((x) => x.id === 'desayuno')) types.push('early');
  let type = types[hash(t + state.profile.name) % types.length];
  let ing = null;
  if (type === 'use_ing') {
    // un ingrediente de tu despensa que aparezca en recetas compatibles
    const usable = state.pantry.filter((id) => !ING[id]?.flags.has('staple') &&
      rankRecipes({}).some((x) => x.recipe.ingredients.some((i) => i.id === id)));
    if (usable.length) ing = usable[hash(t) % usable.length];
    else type = 'two';
  }
  const text = {
    use_ing: `Cocina algo con ${ING[ing]?.name.toLowerCase()}`,
    perfect: 'Cocina una receta solo con lo que ya tienes',
    two: 'Registra 2 comidas hoy',
    new: 'Prueba una receta que nunca has cocinado',
    water: `Toma ${WATER_GOAL} vasos de agua`,
    early: 'Registra tu desayuno antes de las 11:00',
  }[type];
  return { type, ing, text, done: !!state.challenges?.[t] };
}

// Revisa (dentro de update) si con esta acción se cumplió el reto. Devuelve true si se completó ahora.
function evalChallenge(s, ctx = {}) {
  const t = today();
  s.challenges = s.challenges || {};
  if (s.challenges[t]) return false;
  const ch = todayChallenge(s);
  const logs = s.log[t] || [];
  let ok = false;
  if (ch.type === 'use_ing') ok = !!ctx.recipe?.ingredients.some((i) => i.id === ch.ing);
  else if (ch.type === 'perfect') ok = !!ctx.perfect;
  else if (ch.type === 'two') ok = logs.length >= 2;
  else if (ch.type === 'new') ok = !!ctx.recipe && !Object.entries(s.log).some(([d, l]) => d !== t && l.some((x) => x.recipeId === ctx.recipe.id));
  else if (ch.type === 'water') ok = (s.water?.[t] || 0) >= WATER_GOAL;
  else if (ch.type === 'early') ok = ctx.slot === 'desayuno' && new Date().getHours() < 11;
  if (ok) { s.challenges[t] = true; s.xp += XP.challenge; }
  return ok;
}

export function waterToday(state = getState()) {
  return state.water?.[today()] || 0;
}

// Toca un vaso: llena hasta ese vaso (o lo vacía si ya era el último lleno)
// Agua: cada vaso da XP y quitarlo la resta. Si el usuario quita vasos muchas veces en el día
// (WATER_FREE_REMOVALS), se le avisa: desde ahí agregar ya no da XP y quitar resta el doble.
export const WATER_FREE_REMOVALS = 4;
export function waterStatus(state = getState()) {
  const w = state.waterLog?.[today()] || {};
  return { removals: w.removals || 0, warned: !!w.warned };
}
export function setWater(n) {
  const res = { challenge: false, xp: 0, warning: false };
  update((s) => {
    const t = today();
    s.water = s.water || {};
    s.waterLog = s.waterLog || {};
    const cur = s.water[t] || 0;
    const next = Math.max(0, Math.min(WATER_GOAL, n === cur ? n - 1 : n));
    if (next === cur) return;
    // estado del día (migra el contador anterior de vasos con XP)
    const w = s.waterLog[t] || (s.waterLog[t] = { credited: Math.min(s.waterXp?.[t] || 0, cur), goal: (s.waterXp?.[t] || 0) >= WATER_GOAL, removals: 0, warned: false });
    s.water[t] = next;
    let delta = 0;
    if (next > cur) {
      if (!w.warned) {
        const newGlasses = Math.max(0, next - Math.max(cur, w.credited));
        delta += newGlasses * XP.water;
        w.credited = Math.max(w.credited, next);
        if (next === WATER_GOAL && !w.goal) { delta += XP.waterGoal; w.goal = true; }
      }
    } else {
      const removed = cur - next;
      if (w.warned) {
        delta -= removed * XP.water * 2; // castigo: el doble
      } else if (w.credited > next) {
        delta -= (w.credited - next) * XP.water;
      }
      w.credited = Math.min(w.credited, next);
      if (w.goal && next < WATER_GOAL) { delta -= XP.waterGoal; w.goal = false; }
      w.removals += 1;
      if (!w.warned && w.removals >= WATER_FREE_REMOVALS) { w.warned = true; res.warning = true; }
    }
    const before = s.xp;
    s.xp = Math.max(0, s.xp + delta);
    res.xp = s.xp - before;
    res.challenge = evalChallenge(s);
  });
  return res;
}

// Nivel n requiere 25·n·(n−1) XP  → 0, 50, 150, 300, 500, 750…
export function levelFromXp(xp) {
  let n = 1;
  while (25 * (n + 1) * n <= xp) n++;
  const cur = 25 * n * (n - 1);
  const next = 25 * (n + 1) * n;
  return { level: n, cur, next, progress: (xp - cur) / (next - cur) };
}

const TITLES = [
  'Aprendiz de cocina', 'Pinche', 'Cocinero en práctica', 'Cocinero', 'Cocinero experto',
  'Sous-chef', 'Chef', 'Chef de partida', 'Chef ejecutivo', 'Chef estrella',
];
export function levelTitle(level) {
  return TITLES[Math.min(level - 1, TITLES.length - 1)];
}

// La racha mostrada es 0 si ya pasó más de un día sin registrar
export function currentStreak(state = getState()) {
  const { count, last } = state.streak;
  if (!last) return 0;
  const t = today();
  if (last === t || last === addDays(t, -1)) return count;
  return 0;
}

export function streakDoneToday(state = getState()) {
  return state.streak.last === today();
}

export const ACHIEVEMENTS = [
  { id: 'primer_paso', name: 'Primer bocado', desc: 'Registra tu primera comida.', icon: 'utensils' },
  { id: 'racha_3', name: 'En llamas', desc: 'Racha de 3 días.', icon: 'flame' },
  { id: 'racha_7', name: 'Semana completa', desc: 'Racha de 7 días.', icon: 'flame' },
  { id: 'racha_30', name: 'Imparable', desc: 'Racha de 30 días.', icon: 'crown' },
  { id: 'dia_perfecto', name: 'Día perfecto', desc: 'Completa todas las comidas de un día.', icon: 'star' },
  { id: 'recetas_10', name: 'Recetario', desc: 'Cocina 10 recetas distintas.', icon: 'book' },
  { id: 'recetas_25', name: 'Gran recetario', desc: 'Cocina 25 recetas distintas.', icon: 'book' },
  { id: 'despensa_15', name: 'Alacena llena', desc: 'Ten 15 ingredientes en tu despensa.', icon: 'pantry' },
  { id: 'plan_semana', name: 'Planeador', desc: 'Arma tu primer plan semanal.', icon: 'calendar' },
  { id: 'cero_desperdicio', name: 'Cero desperdicio', desc: 'Cocina 5 recetas solo con lo que tenías.', icon: 'leaf' },
  { id: 'chef_ia', name: 'Chef con IA', desc: 'Cocina una receta creada con IA.', icon: 'sparkles' },
  { id: 'nivel_5', name: 'Cocinero', desc: 'Llega al nivel 5.', icon: 'trophy' },
];

function grant(state, id, unlocked) {
  if (!state.achievements[id]) {
    state.achievements[id] = today();
    unlocked.push(ACHIEVEMENTS.find((a) => a.id === id));
  }
}

function checkAchievements(state, unlocked) {
  const allLogs = Object.values(state.log).flat();
  const distinct = new Set(allLogs.map((l) => l.recipeId));
  if (allLogs.length >= 1) grant(state, 'primer_paso', unlocked);
  if (state.streak.count >= 3) grant(state, 'racha_3', unlocked);
  if (state.streak.count >= 7) grant(state, 'racha_7', unlocked);
  if (state.streak.count >= 30) grant(state, 'racha_30', unlocked);
  if (distinct.size >= 10) grant(state, 'recetas_10', unlocked);
  if (distinct.size >= 25) grant(state, 'recetas_25', unlocked);
  if (state.pantry.length + state.customPantry.length >= 15) grant(state, 'despensa_15', unlocked);
  if (state.plan) grant(state, 'plan_semana', unlocked);
  if (allLogs.filter((l) => l.perfect).length >= 5) grant(state, 'cero_desperdicio', unlocked);
  if (allLogs.some((l) => l.ai)) grant(state, 'chef_ia', unlocked);
  if (levelFromXp(state.xp).level >= 5) grant(state, 'nivel_5', unlocked);
}

// Revisa logros que no dependen de cocinar (despensa, plan)
export function refreshAchievements() {
  const unlocked = [];
  update((s) => checkAchievements(s, unlocked));
  return unlocked;
}

// Registrar una comida. Devuelve el resumen para la celebración.
export function logMeal(slotId, recipeId, portion = null) {
  const t = today();
  const recipe = findRecipe(recipeId);
  const result = { xp: 0, streakUp: false, streak: 0, perfectDay: false, unlocked: [], levelUp: null };

  update((s) => {
    const before = levelFromXp(s.xp).level;
    s.log[t] = s.log[t] || [];
    const existing = s.log[t].find((l) => l.slot === slotId);
    if (existing) return; // ese tiempo ya está registrado hoy

    const perfect = recipe ? matchInfo(recipe, s).missing.length === 0 : false;
    const isExtra = String(slotId).startsWith('extra');
    let xp = isExtra ? XP.extra : XP.meal + (perfect ? XP.perfectMatch : 0);
    const entry = {
      slot: slotId, recipeId, xp, perfect, ai: !!recipe?.ai, at: Date.now(),
      // copia de nutrientes para el seguimiento (aunque la receta de IA no se guarde)
      name: recipe?.name || '', kcal: recipe?.kcal || 0, p: recipe?.p || 0, c: recipe?.c || 0, f: recipe?.f || 0,
    };
    // Cuánto se comió: escala calorías y macros (las XP no cambian)
    const factor = portion && portion.factor > 0 ? Math.min(portion.factor, 10) : 1;
    if (factor !== 1) {
      for (const k of ['kcal', 'p', 'c', 'f']) entry[k] = Math.round(entry[k] * factor);
    }
    entry.factor = Math.round(factor * 100) / 100;
    if (portion?.label) entry.portion = String(portion.label).slice(0, 40);
    s.log[t].push(entry);

    // Racha
    if (s.streak.last !== t) {
      s.streak.count = s.streak.last === addDays(t, -1) ? s.streak.count + 1 : 1;
      s.streak.last = t;
      s.streak.best = Math.max(s.streak.best, s.streak.count);
      result.streakUp = true;
    }
    result.streak = s.streak.count;

    // Día perfecto
    const slots = getSlots(s.profile.mealsPerDay).map((x) => x.id);
    const doneSlots = new Set(s.log[t].map((l) => l.slot));
    if (evalChallenge(s, { recipe, perfect, slot: slotId })) result.challenge = todayChallenge(s).text;
    if (slots.every((id) => doneSlots.has(id))) {
      xp += XP.perfectDay;
      result.perfectDay = true;
      grant(s, 'dia_perfecto', result.unlocked);
    }

    entry.xp = xp;
    s.xp += xp;
    result.xp = xp + (result.challenge ? XP.challenge : 0);
    checkAchievements(s, result.unlocked);
    const after = levelFromXp(s.xp).level;
    if (after > before) result.levelUp = after;
  });
  return result;
}

export function undoMeal(slotId) {
  const t = today();
  update((s) => {
    const list = s.log[t] || [];
    const idx = list.findIndex((l) => l.slot === slotId);
    if (idx >= 0) {
      s.xp = Math.max(0, s.xp - list[idx].xp);
      list.splice(idx, 1);
    }
  });
}

export function todayLog(state = getState()) {
  return state.log[today()] || [];
}

export function cookedCount(state = getState()) {
  return Object.values(state.log).flat().length;
}

// Últimos 7 días para el calendario de racha
export function lastWeek(state = getState()) {
  const t = today();
  const frozen = new Set(state.streak.frozen || []);
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(t, i - 6);
    return { date, done: (state.log[date] || []).length > 0, frozen: frozen.has(date) };
  });
}

// ── Protector de racha (Pro) ──
export const FREEZES_PER_MONTH = 2;

// Se llama al abrir la app. Recarga protectores cada mes y cubre días sin registro.
export function applyStreakFreezes() {
  const result = { used: 0 };
  if (!canUse('streakFreeze')) return result;
  const t = today();
  const month = t.slice(0, 7);
  update((s) => {
    const st = s.streak;
    st.frozen = st.frozen || [];
    if (st.freezeMonth !== month) {
      st.freezes = FREEZES_PER_MONTH;
      st.freezeMonth = month;
    }
    const yesterday = addDays(t, -1);
    if (!st.last || st.last >= yesterday || st.count === 0) return;
    // días perdidos entre el último registro y ayer
    const missed = [];
    for (let d = addDays(st.last, 1); d <= yesterday; d = addDays(d, 1)) missed.push(d);
    if (missed.length <= st.freezes) {
      st.freezes -= missed.length;
      st.frozen.push(...missed);
      st.frozen = st.frozen.slice(-60);
      st.last = yesterday; // la racha sigue viva (sin sumar días)
      result.used = missed.length;
    }
  });
  return result;
}

// ── Calorías y macros (Pro) ──
const SPLITS = {
  keto: { p: 0.22, c: 0.08, f: 0.7 },
  bajacal: { p: 0.3, c: 0.4, f: 0.3 },
  portfolio: { p: 0.2, c: 0.5, f: 0.3 },
  default: { p: 0.2, c: 0.5, f: 0.3 },
};

export function macroTargets(profile = getState().profile) {
  const kcal = Number(profile.kcalGoal) || 2000;
  const split = SPLITS[getDiet(profile.diet).id] || SPLITS.default;
  return {
    kcal,
    p: Math.round((kcal * split.p) / 4),
    c: Math.round((kcal * split.c) / 4),
    f: Math.round((kcal * split.f) / 9),
  };
}

export function dayTotals(date, state = getState()) {
  return (state.log[date] || []).reduce(
    (acc, l) => {
      const r = l.kcal ? l : findRecipe(l.recipeId) || {};
      acc.kcal += r.kcal || 0;
      acc.p += r.p || 0;
      acc.c += r.c || 0;
      acc.f += r.f || 0;
      return acc;
    },
    { kcal: 0, p: 0, c: 0, f: 0 },
  );
}

export function weekTotals(state = getState()) {
  const t = today();
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(t, i - 6);
    return { date, ...dayTotals(date, state) };
  });
}
