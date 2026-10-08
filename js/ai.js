// Recetas con IA a través de tu Cloudflare Worker (que guarda tu API key de Gemini).
// La app nunca ve la key: solo manda la dieta, la despensa y el tiempo de comida.

import { AI_ENDPOINT, AI_DAILY_LIMIT } from './config.js';
import { getState, update, today } from './store.js';
import { getDiet } from './data/diets.js';
import { ING, matchIngredient } from './data/ingredients.js';
import { planningProfiles, allExcludedFlags, dietKey, familyActive } from './engine.js';

const FLAG_TEXT = {
  gluten: 'gluten (trigo, pan, pasta, tortilla de harina)', soy: 'soya', nut: 'nueces y cacahuate',
  meat: 'carne roja o de cerdo', redMeat: 'carne roja', poultry: 'pollo o pavo', fish: 'pescados y mariscos',
  egg: 'huevo', dairy: 'lácteos', honey: 'miel', processed: 'ultraprocesados y embutidos',
  carb: 'alimentos altos en carbohidratos (tortilla, pan, arroz, pasta, papa, legumbres, frutas dulces)',
  sugar: 'azúcar añadida', satfat: 'mantequilla, crema y quesos grasos', sodium: 'alimentos altos en sodio',
  fodmap: 'alimentos altos en FODMAP (ajo, cebolla, trigo, lactosa, leguminosas, manzana, mango)', fried: 'frituras',
};

export function aiConfigured() {
  return !!AI_ENDPOINT;
}

// Usos de IA restantes hoy en este dispositivo
export function aiUsesLeft(state = getState()) {
  const used = state.aiUsage?.date === today() ? state.aiUsage.count : 0;
  return Math.max(0, AI_DAILY_LIMIT - used);
}

function countUse() {
  update((s) => {
    const t = today();
    if (s.aiUsage?.date !== t) s.aiUsage = { date: t, count: 0 };
    s.aiUsage.count += 1;
  });
}

async function callWorker(payload, { signal } = {}) {
  if (!AI_ENDPOINT) throw new Error('NOT_CONFIGURED');
  const metered = payload.action === 'recipes' || payload.action === 'scan';
  if (metered && aiUsesLeft() <= 0) throw new Error('DAILY_LIMIT');
  let res;
  try {
    res = await fetch(AI_ENDPOINT, {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new Error('NETWORK');
  }
  let data = {};
  try {
    data = await res.json();
  } catch {
    // respuesta sin JSON (p. ej. 403 por origen no permitido)
  }
  if (!res.ok) throw new Error(data.error || (res.status === 403 ? 'FORBIDDEN' : 'HTTP_' + res.status));
  if (metered) countUse();
  return data;
}

export function aiErrorMessage(err) {
  switch (err?.message) {
    case 'NOT_CONFIGURED': return 'La IA todavía no está configurada en esta versión de la app.';
    case 'RATE_LIMIT': return 'Hay muchas solicitudes en este momento. Espera un minuto y vuelve a intentar.';
    case 'FORBIDDEN': return 'El servidor de IA no reconoce esta dirección. Revisa ALLOWED_ORIGINS en el Worker.';
    case 'NO_KEY': return 'Falta la API key en el servidor de IA (GEMINI_API_KEY).';
    case 'MODEL_NOT_FOUND': return 'El modelo de IA no está disponible. Cambia GEMINI_MODEL en el Worker.';
    case 'DAILY_LIMIT': return 'Llegaste al límite de usos de IA de hoy. Mañana se renueva.';
    case 'IMAGE_TOO_BIG': return 'La foto es muy pesada. Intenta con otra o acércate un poco más.';
    case 'NO_ITEMS': return 'No reconocí ingredientes en la foto. Intenta con más luz y que se vean las etiquetas.';
    case 'PARSE': return 'La IA respondió en un formato inesperado. Intenta de nuevo.';
    case 'BUSY': return 'La IA de Google está saturada en este momento. Intenta de nuevo en un minuto.';
    case 'BAD_KEY': return 'La API key de Gemini no es válida. Revisa GEMINI_API_KEY en el Worker.';
    case 'REGION': return 'Google no permite usar Gemini desde la región del servidor.';
    case 'NETWORK': return 'No hay conexión con el servidor de IA. Revisa tu internet.';
    default:
      if (err?.name === 'AbortError') return 'Se canceló la solicitud.';
      return 'No se pudo crear la receta. Intenta de nuevo en un momento.' + (err?.message ? ` (${err.message})` : '');
  }
}

export async function pingAI() {
  const data = await callWorker({ action: 'ping' });
  return !!data.ok;
}

function pantryNames(state) {
  return [
    ...state.pantry.map((id) => ING[id]?.name).filter(Boolean),
    ...state.customPantry.map((c) => c.name),
  ];
}

// Pide recetas nuevas usando la despensa y la dieta del usuario
export async function generateRecipes({ mealType, count = 3, extra = '', signal } = {}) {
  const state = getState();
  const profiles = planningProfiles(state);
  const diets = [...new Set(profiles.map((p) => p.diet))].map(getDiet);
  const main = getDiet(state.profile.diet);
  const kcals = profiles.map((p) => getDiet(p.diet).kcalMax?.[mealType]).filter(Boolean);
  const data = await callWorker(
    {
      action: 'recipes',
      mealType,
      count,
      extra,
      people: profiles.length,
      vegan: profiles.some((p) => getDiet(p.diet).id === 'vegetariana' && p.vegan),
      diet: {
        name: diets.map((d) => d.name).join(' + '),
        short: diets.map((d) => d.short).join(' / '),
        banned: [
          ...allExcludedFlags(state).map((f) => FLAG_TEXT[f]).filter(Boolean),
          ...avoidedIngredients(state).map((id) => ING[id]?.name).filter(Boolean),
        ],
        kcalMax: mealType && kcals.length ? Math.min(...kcals) : 0,
      },
      pantry: pantryNames(state),
    },
    { signal },
  );

  let arr;
  try {
    arr = JSON.parse(String(data.text || '').replace(/^```json|```$/g, '').trim());
    if (!Array.isArray(arr)) arr = arr.recipes || [arr];
  } catch {
    throw new Error('PARSE');
  }
  const key = dietKey(state);
  return arr.slice(0, count).map((r, idx) => {
    const recipe = normalizeAIRecipe(r, main.id, mealType, idx);
    recipe.dietKey = key;
    recipe.family = familyActive(state);
    recipe.warnings = dietWarnings(recipe, state);
    return recipe;
  });
}

// La IA a veces se equivoca: revisamos sus ingredientes contra las reglas de la dieta
export function dietWarnings(recipe, state = getState()) {
  const ex = allExcludedFlags(state);
  const avoid = avoidedIngredients(state);
  return recipe.ingredients
    .filter((i) => i.id && ING[i.id] && (ex.some((f) => ING[i.id].flags.has(f)) || avoid.includes(i.id)))
    .map((i) => i.name);
}

// Ingredientes específicos que evitan las dietas propias de quienes van a comer
function avoidedIngredients(state) {
  return [...new Set(planningProfiles(state).flatMap((p) => getDiet(p.diet).avoidIngs || []))];
}

// ── Escanear despensa con foto ──
// Reduce la foto en el teléfono (máx. 1024 px, JPEG) antes de enviarla
export async function compressImage(file, max = 1024, quality = 0.8) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = reject;
      im.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    return { data: dataUrl.split(',')[1], mimeType: 'image/jpeg', preview: dataUrl };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function scanPantry(image, { signal } = {}) {
  if (image.data.length > 3_500_000) throw new Error('IMAGE_TOO_BIG');
  const data = await callWorker({ action: 'scan', image: { data: image.data, mimeType: image.mimeType } }, { signal });
  let arr;
  try {
    arr = JSON.parse(String(data.text || '').replace(/^```json|```$/g, '').trim());
    if (!Array.isArray(arr)) arr = arr.ingredients || [];
  } catch {
    throw new Error('PARSE');
  }
  const seen = new Set();
  const items = [];
  for (const raw of arr.slice(0, 40)) {
    const name = String(raw?.name || raw).trim().slice(0, 40);
    if (!name) continue;
    const m = matchIngredient(name);
    if (m?.flags.has('staple')) continue; // sal, agua… se asumen
    const key = m ? m.id : 'c:' + name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({ key, id: m ? m.id : null, name: m ? m.name : name[0].toUpperCase() + name.slice(1) });
  }
  if (!items.length) throw new Error('NO_ITEMS');
  return items;
}

function normalizeAIRecipe(r, dietId, mealType, idx) {
  const meal = ['desayuno', 'comida', 'cena', 'snack'].includes(r.meal) ? r.meal : mealType || 'comida';
  return {
    id: 'ai_' + Date.now().toString(36) + idx,
    ai: true,
    diet: dietId,
    name: String(r.name || 'Receta sin nombre').slice(0, 80),
    meals: [meal],
    time: Number(r.time) || 20,
    kcal: Number(r.kcal) || 0,
    p: Number(r.p) || 0,
    c: Number(r.c) || 0,
    f: Number(r.f) || 0,
    servings: 1,
    ingredients: (r.ingredients || []).map((i) => {
      const name = String(i.name || i).slice(0, 60);
      const m = matchIngredient(name);
      return { id: m ? m.id : null, name, qty: String(i.qty || '') };
    }),
    steps: (r.steps || []).map((s) => String(s)).slice(0, 10),
  };
}

// ── Sugerencias de dietas ──
export async function sendSuggestion(sug) {
  const data = await callWorker({
    action: 'suggest',
    suggestion: { name: sug.name, why: sug.why, source: sug.source, currentDiet: sug.currentDiet, date: sug.date, id: sug.id },
  });
  return !!data.ok;
}
