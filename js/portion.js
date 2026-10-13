// Cuánto se comió el usuario: porciones, piezas o gramos/mililitros.
// Todo se convierte a un "factor" sobre la porción de la receta (1 = una porción).

const FRAC = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 };

function parseNum(txt) {
  const t = String(txt || '').trim().replace(',', '.');
  const m = t.match(/^(\d+)\s*([½¼¾⅓⅔])/);
  if (m) return Number(m[1]) + FRAC[m[2]];
  if (FRAC[t[0]]) return FRAC[t[0]];
  const f = t.match(/^(\d+)\s*\/\s*(\d+)/);
  if (f) return Number(f[1]) / Number(f[2]);
  const n = t.match(/^\d+(\.\d+)?/);
  return n ? Number(n[0]) : null;
}

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// Ingredientes que la gente cuenta por pieza (singular, plural)
const COUNTABLE = [
  [/huevo/, 'huevo', 'huevos'],
  [/tortilla/, 'tortilla', 'tortillas'],
  [/tostada/, 'tostada', 'tostadas'],
  [/pan |pan$|bolillo|telera|rebanada/, 'pan', 'panes'],
  [/hot ?cake|panqueque|crepa|waffle/, 'pieza', 'piezas'],
  [/taco/, 'taco', 'tacos'],
];

const LIQUID = /sopa|caldo|crema de|consom|pozole|menudo|licuado|smoothie|batido|agua de|jugo|atole|leche dorada|\bte\b|cafe|bebida/;

function ingWeight(ing) {
  const q = norm(ing.qty);
  const n = parseNum(q) ?? 1;
  const name = norm(ing.name || ing.id);
  if (/\bkg\b/.test(q)) return n * 1000;
  if (/\b(g|gr|gramos?)\b/.test(q)) return n;
  if (/\b(l|litros?)\b/.test(q)) return n * 1000;
  if (/\bml\b/.test(q)) return n;
  if (/taza/.test(q)) return n * 200;
  if (/cdita|cucharadita/.test(q)) return n * 5;
  if (/cda|cucharada/.test(q)) return n * 15;
  if (/diente/.test(q)) return n * 4;
  if (/rebanada/.test(q)) return n * 30;
  if (/pizca|al gusto/.test(q)) return 0;
  if (/huevo/.test(name)) return n * 50;
  if (/tortilla|tostada/.test(name)) return n * 30;
  if (/chile|limon|ajo|rabano|cebollin|hierba|hoja|laurel/.test(name)) return n * 12;
  return n * 90; // pieza o unidad genérica
}

// Peso aproximado de una porción (para registrar por gramos o mililitros)
export function servingSize(recipe) {
  const total = (recipe.ingredients || []).reduce((a, i) => a + ingWeight(i), 0);
  const servings = recipe.servings || 1;
  const v = Math.round(Math.min(700, Math.max(120, total / servings)) / 10) * 10;
  return v;
}

// Opciones de medida que tienen sentido para esta receta
export function portionModes(recipe) {
  const modes = [{ id: 'portion', label: 'Porciones', unit: 'porción', units: 'porciones', step: 0.5, min: 0.5, max: 6, def: 1 }];
  const servings = recipe.servings || 1;
  for (const ing of recipe.ingredients || []) {
    const name = norm(ing.name || ing.id);
    const hit = COUNTABLE.find(([re]) => re.test(name));
    if (!hit) continue;
    const q = norm(ing.qty);
    if (/\b(g|gr|kg|ml|taza|cda|cdita)\b/.test(q)) continue;
    const n = parseNum(q);
    if (!n || n < 1) continue;
    const per = n / servings;
    const [, one, many] = hit;
    const label = hit[1] === 'pieza' ? 'Piezas' : many[0].toUpperCase() + many.slice(1);
    modes.push({ id: 'pieces', label, unit: one, units: many, step: 1, min: 1, max: Math.max(12, Math.ceil(per * 4)), def: Math.max(1, Math.round(per)), per });
    break;
  }
  const liquid = LIQUID.test(norm(recipe.name));
  const size = servingSize(recipe);
  modes.push({
    id: 'mass', label: liquid ? 'Mililitros' : 'Gramos', unit: liquid ? 'ml' : 'g', units: liquid ? 'ml' : 'g',
    step: liquid ? 50 : 25, min: 25, max: 2000, def: size, per: size,
  });
  return modes;
}

export function portionFactor(mode, value) {
  const v = Number(value) || 0;
  if (mode.id === 'portion') return v;
  return mode.per ? v / mode.per : 1;
}

export function portionLabel(mode, value) {
  const v = Number(value) || 0;
  const nice = Number.isInteger(v) ? String(v) : String(v).replace('.', ',');
  if (mode.id === 'portion') return `${nice} ${v === 1 ? 'porción' : 'porciones'}`;
  if (mode.id === 'pieces') return `${nice} ${v === 1 ? mode.unit : mode.units}`;
  return `${nice} ${mode.unit}`;
}
