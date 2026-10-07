// Estado de la app guardado en el dispositivo (localStorage).
// Todo vive en el teléfono del usuario: no hay servidor.

import { registerCustomDiets } from './data/diets.js';

const KEY = 'alacena.state.v1';

export const DEFAULT_STATE = {
  v: 1,
  onboarded: false,
  profile: {
    name: '',
    diet: null,
    vegan: false,
    mealsPerDay: 3,
    fastStart: '12:00', // inicio de la ventana de alimentación (ayuno)
    fastHours: 8,
    kcalGoal: 2000,    // meta diaria de calorías (Pro: calorías y macros)
    body: null,        // datos opcionales para calcular la meta {sex, age, weight, height, activity, goal}
  },
  pantry: [],          // ids del catálogo
  customPantry: [],    // [{id, name}] ingredientes escritos por el usuario
  log: {},             // { 'YYYY-MM-DD': [{slot, recipeId, xp, at}] }
  xp: 0,
  streak: { count: 0, best: 0, last: null, freezes: 0, freezeMonth: null, frozen: [] },
  achievements: {},    // { id: 'YYYY-MM-DD' }
  plan: null,          // { start, days: [{ date, slots: { slotId: recipeId } }] }
  shopping: [],        // [{ key, name, ingId, done }]
  pro: { active: false, since: null }, // plan Pro (cuando se active el cobro)
  devSimulateFree: false,              // vista previa de cuenta gratuita
  aiRecipes: {},       // recetas creadas por IA y guardadas por el usuario
  favorites: [],
  family: { enabled: false, members: [] }, // [{id, name, diet, vegan}]
  aiUsage: { date: null, count: 0 },
  customDiets: [],     // [{id, name, exclude[], avoidIngs[], kcalMax}]
  suggestions: [],     // dietas sugeridas por el usuario [{id, name, why, source, date, status}]
  water: {},           // { 'YYYY-MM-DD': vasos }
  challenges: {},      // { 'YYYY-MM-DD': true } retos del día completados
  waterXp: {},         // { 'YYYY-MM-DD': vasos que ya dieron XP }
};

let state = load();
registerCustomDiets(state.customDiets);
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const parsed = JSON.parse(raw);
    return {
      ...structuredClone(DEFAULT_STATE),
      ...parsed,
      profile: { ...DEFAULT_STATE.profile, ...(parsed.profile || {}) },
      streak: { ...DEFAULT_STATE.streak, ...(parsed.streak || {}) },
      pro: { ...DEFAULT_STATE.pro, ...(parsed.pro || {}) },
      family: { ...DEFAULT_STATE.family, ...(parsed.family || {}) },
      aiUsage: { ...DEFAULT_STATE.aiUsage, ...(parsed.aiUsage || {}) },
    };
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Almacenamiento no disponible (modo privado): la app sigue funcionando en memoria.
  }
}

export function getState() {
  return state;
}

export function update(fn) {
  fn(state);
  registerCustomDiets(state.customDiets);
  save();
  listeners.forEach((l) => l(state));
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function resetState() {
  state = structuredClone(DEFAULT_STATE);
  registerCustomDiets([]);
  save();
  listeners.forEach((l) => l(state));
}

// ── Fechas locales ──
export function today(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  return today(dt);
}

export function parseDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}
