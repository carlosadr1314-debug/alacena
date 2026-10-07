// Motor de recomendaciones: compatibilidad con la dieta, coincidencia con la despensa
// y armado del plan semanal. Todo corre en el dispositivo, sin internet.

import { RECIPES } from './data/recipes.js';
import { ING, norm } from './data/ingredients.js';
import { getDiet } from './data/diets.js';
import { getState, addDays } from './store.js';
import { canUse } from './premium.js';

// Tiempos de comida según cuántas comidas al día eligió el usuario
export function getSlots(mealsPerDay = 3) {
  const base = [
    { id: 'desayuno', type: 'desayuno', name: 'Desayuno' },
    { id: 'snack1', type: 'snack', name: 'Snack de media mañana' },
    { id: 'comida', type: 'comida', name: 'Comida' },
    { id: 'snack2', type: 'snack', name: 'Snack de la tarde' },
    { id: 'cena', type: 'cena', name: 'Cena' },
  ];
  if (mealsPerDay >= 5) return base;
  if (mealsPerDay === 4) return base.filter((s) => s.id !== 'snack2');
  return base.filter((s) => s.type !== 'snack');
}

export function allRecipes() {
  const { aiRecipes } = getState();
  return [...RECIPES, ...Object.values(aiRecipes || {})];
}

// Recetas de IA recién generadas que aún no se guardan (solo en memoria)
const drafts = new Map();
export function registerDraft(recipe) {
  drafts.set(recipe.id, recipe);
}

export function findRecipe(id) {
  return allRecipes().find((r) => r.id === id) || drafts.get(id) || null;
}

// Banderas de un ingrediente de receta (de catálogo o libre)
function flagsOf(item) {
  return ING[item.id]?.flags || new Set();
}

export function ingredientName(item) {
  return item.name || ING[item.id]?.name || item.id;
}

export function excludedFlags(profile) {
  const diet = getDiet(profile.diet);
  const ex = [...diet.exclude];
  if (diet.id === 'vegetariana' && profile.vegan) ex.push(...diet.veganExtra);
  return ex;
}

// ¿La receta es compatible con la dieta para ese tiempo de comida?
export function isCompatible(recipe, profile, mealType = null) {
  if (recipe.ai) return recipe.diet === profile.diet; // la IA ya la creó para esa dieta
  const ex = excludedFlags(profile);
  const blocked = recipe.ingredients.some((i) => ex.some((f) => flagsOf(i).has(f)));
  if (blocked) return false;
  const diet = getDiet(profile.diet);
  if (diet.avoidIngs?.length && recipe.ingredients.some((i) => diet.avoidIngs.includes(i.id))) return false;
  if (diet.kcalMax) {
    const types = mealType ? [mealType] : recipe.meals;
    return types.some((t) => recipe.kcal <= (diet.kcalMax[t] ?? 9999));
  }
  return true;
}

// ── Plan familiar ──
// Perfiles para los que se cocina: tú + tu familia (si el modo familiar está activo)
export function familyActive(state = getState()) {
  return !!(state.family?.enabled && state.family.members.length && canUse('family'));
}

export function planningProfiles(state = getState()) {
  const list = [state.profile];
  if (familyActive(state)) list.push(...state.family.members.map((m) => ({ diet: m.diet, vegan: m.vegan, name: m.name })));
  return list;
}

// Identificador de la combinación de dietas (para recetas de IA)
export function dietKey(state = getState()) {
  return [...new Set(planningProfiles(state).map((p) => p.diet + (p.vegan ? '+v' : '')))].sort().join('|');
}

export function allExcludedFlags(state = getState()) {
  return [...new Set(planningProfiles(state).flatMap((p) => excludedFlags(p)))];
}

// ¿Sirve para todos los que van a comer?
export function compatibleForPlanning(recipe, mealType = null, state = getState()) {
  if (recipe.ai) return (recipe.dietKey || recipe.diet) === (recipe.dietKey ? dietKey(state) : state.profile.diet);
  return planningProfiles(state).every((p) => isCompatible(recipe, p, mealType));
}

// Ingredientes que bloquean la receta (para explicar por qué no aparece)
export function blockingIngredients(recipe, profile) {
  const ex = excludedFlags(profile);
  return recipe.ingredients.filter((i) => ex.some((f) => flagsOf(i).has(f)));
}

// ¿El usuario tiene este ingrediente?
export function hasIngredient(item, state = getState()) {
  if (ING[item.id]?.flags.has('staple')) return true;
  if (item.id && state.pantry.includes(item.id)) return true;
  const n = norm(item.name || ING[item.id]?.name || '');
  if (!n) return false;
  return state.customPantry.some((c) => {
    const cn = norm(c.name);
    return cn === n || n.includes(cn) || cn.includes(n);
  });
}

// Qué tanto puede cocinar el usuario con lo que tiene
export function matchInfo(recipe, state = getState()) {
  const needed = recipe.ingredients.filter((i) => !ING[i.id]?.flags.has('staple'));
  const have = needed.filter((i) => hasIngredient(i, state));
  const missing = needed.filter((i) => !hasIngredient(i, state));
  const ratio = needed.length ? have.length / needed.length : 1;
  return { have: have.length, total: needed.length, missing, ratio };
}

function boostScore(recipe, profile) {
  const diet = getDiet(profile.diet);
  let s = 0;
  for (const i of recipe.ingredients) {
    for (const b of diet.boost) if (flagsOf(i).has(b)) s += 1;
  }
  return Math.min(s, 6);
}

// Pseudoaleatorio estable por día para que las sugerencias varíen sin brincar en cada render
function seeded(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

// Lista ordenada de recetas sugeridas
export function rankRecipes({ mealType = null, onlyReady = false, query = '', seed = '' } = {}) {
  const state = getState();
  const { profile } = state;
  const q = norm(query);
  return allRecipes()
    .filter((r) => !mealType || r.meals.includes(mealType))
    .filter((r) => compatibleForPlanning(r, mealType, state))
    .filter((r) => !q || norm(r.name).includes(q) || r.ingredients.some((i) => norm(ingredientName(i)).includes(q)))
    .map((r) => ({ recipe: r, match: matchInfo(r, state) }))
    .filter((x) => !onlyReady || x.match.missing.length === 0)
    .sort((a, b) => {
      const sa = a.match.ratio * 10 + boostScore(a.recipe, profile) * 0.4 + seeded(seed + a.recipe.id) * 1.2;
      const sb = b.match.ratio * 10 + boostScore(b.recipe, profile) * 0.4 + seeded(seed + b.recipe.id) * 1.2;
      return sb - sa;
    });
}

// ── Plan semanal ──
export function generatePlan(startDate, days = 7) {
  const state = getState();
  const slots = getSlots(state.profile.mealsPerDay);
  const used = {}; // recipeId -> veces usada
  const lastDay = {}; // recipeId -> índice del último día usado
  const plan = { start: startDate, days: [] };

  for (let d = 0; d < days; d++) {
    const date = addDays(startDate, d);
    const day = { date, slots: {} };
    const usedToday = new Set();
    for (const slot of slots) {
      const ranked = rankRecipes({ mealType: slot.type, seed: date + slot.id });
      const pick =
        ranked.find(
          (x) =>
            !usedToday.has(x.recipe.id) &&
            (used[x.recipe.id] || 0) < 2 &&
            (lastDay[x.recipe.id] === undefined || d - lastDay[x.recipe.id] >= 3),
        ) ||
        ranked.find((x) => !usedToday.has(x.recipe.id)) ||
        ranked[0];
      if (pick) {
        day.slots[slot.id] = pick.recipe.id;
        used[pick.recipe.id] = (used[pick.recipe.id] || 0) + 1;
        lastDay[pick.recipe.id] = d;
        usedToday.add(pick.recipe.id);
      }
    }
    plan.days.push(day);
  }
  return plan;
}

// Siguiente alternativa para cambiar una receta del plan
export function alternativeFor(slotType, currentId, date, avoid = []) {
  const ranked = rankRecipes({ mealType: slotType, seed: date + Math.random() });
  return ranked.find((x) => x.recipe.id !== currentId && !avoid.includes(x.recipe.id))?.recipe || null;
}

// Lista del súper: ingredientes faltantes del plan (desde hoy, o solo un día)
export function shoppingFromPlan(plan, fromDate, onlyDate = null) {
  const state = getState();
  const map = new Map();
  for (const day of plan.days) {
    if (day.date < fromDate) continue;
    if (onlyDate && day.date !== onlyDate) continue;
    for (const rid of Object.values(day.slots)) {
      const r = findRecipe(rid);
      if (!r) continue;
      for (const item of matchInfo(r, state).missing) {
        const key = item.id && ING[item.id] ? item.id : 'c:' + norm(item.name);
        const prev = map.get(key);
        if (prev) prev.count++;
        else map.set(key, { key, ingId: ING[item.id] ? item.id : null, name: ingredientName(item), count: 1, done: false });
      }
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

// ── Ayuno intermitente ──
export function fastingStatus(profile, now = new Date()) {
  const [h, m] = profile.fastStart.split(':').map(Number);
  const start = h * 60 + m;
  const end = (start + profile.fastHours * 60) % 1440;
  const cur = now.getHours() * 60 + now.getMinutes();
  const inWindow = start < end ? cur >= start && cur < end : cur >= start || cur < end;
  const fmt = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
  let minsLeft;
  if (inWindow) minsLeft = (end - cur + 1440) % 1440;
  else minsLeft = (start - cur + 1440) % 1440;
  return { inWindow, from: fmt(start), to: fmt(end), minsLeft };
}
