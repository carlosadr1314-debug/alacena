// Cuánto se comió el usuario: por porciones o por gramos/mililitros.
// Todo se convierte a un "factor" sobre la porción de la receta (1 = una porción).
// portionInfo() describe qué es "1 porción" de cada receta (piezas y peso aproximado).

const FRAC = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 };

function parseNum(txt) {
  const t = String(txt || '').trim().replace(',', '.');
  const m = t.match(/^(\d+)\s*([½¼¾⅓⅔])/);
  if (m) return Number(m[1]) + FRAC[m[2]];
  if (FRAC[t[0]]) return FRAC[t[0]];
  const mixed = t.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const f = t.match(/^(\d+)\s*\/\s*(\d+)/);
  if (f) return Number(f[1]) / Number(f[2]);
  const n = t.match(/^\d+(\.\d+)?/);
  return n ? Number(n[0]) : null;
}

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// Peso aproximado (g) de 1 pieza de cada ingrediente
const PIECE_G = {
  aguacate: 150, berenjena: 300, calabacita: 150, camote: 150, cebolla: 150, champinon: 15, chayote: 200,
  chile_jalapeno: 15, chile_poblano: 100, chile_serrano: 8, chipotle: 10, esparrago: 15, huevo: 50, jitomate: 120,
  kiwi: 75, limon: 10, manzana: 180, muslo_pollo: 130, naranja: 180, nopal: 80, papa: 170, pepino: 200,
  pimiento: 150, platano: 120, tortilla_harina: 45, tortilla_maiz: 30, tostadas: 15, zanahoria: 80,
  aceituna: 4, almendra: 1.2, tocino: 10, jamon: 20, pan_integral: 30, pan_centeno: 30, pan_sin_gluten: 30,
  atun_lata: 120, sardina_lata: 110, apio: 40, lechuga: 10, albahaca: 0.5, epazote: 0.5, cilantro: 2, canela: 0,
};
// Peso aproximado (g) de 1 taza según el tipo de ingrediente
const LEAFY = /espinaca|kale|lechuga|col$|^col|cilantro|perejil|albahaca|arugula|acelga|berro/;
const LIQ = /agua|caldo|leche|pure_tomate|salsa|crema$|^crema|yogur|cottage|hummus|bebida/;
const GRAIN = /arroz|quinoa|frijol|lenteja|garbanzo|edamame|chicharo|elote|pasta/;
const NUTS = /nuez|cacahuate|almendra|pepita|ajonjoli|chia|linaza|crema_cacahuate|cacao/;
function cupGrams(id) {
  if (LEAFY.test(id)) return 30;
  if (/setas|champinon|brocoli|coliflor|kale/.test(id)) return 80;
  if (/avena|coco_rallado|soya_texturizada|harina/.test(id)) return 80;
  if (NUTS.test(id)) return 130;
  if (LIQ.test(id)) return 240;
  if (GRAIN.test(id)) return 170;
  return 150; // fruta o verdura picada
}

function ingWeight(ing) {
  const q = norm(ing.qty);
  const id = ing.id || norm(ing.name);
  const n = parseNum(q) ?? 1;
  if (/pizca|al gusto/.test(q)) return 0;
  if (/\bkg\b/.test(q)) return n * 1000;
  if (/\b(g|gr|gramos?)\b/.test(q)) return n;
  if (/\b(l|litros?)\b/.test(q)) return n * 1000;
  if (/\bml\b/.test(q)) return n;
  if (/taza/.test(q)) return n * cupGrams(id);
  if (/cdita|cucharadita/.test(q)) return n * 5;
  if (/cda|cucharada/.test(q)) return n * 15;
  if (/diente/.test(q)) return n * 4;
  if (/hoja|ramita|raja/.test(q)) return n * (PIECE_G[id] ?? 1);
  if (/aros/.test(q)) return n * 10;
  if (/lata/.test(q)) return n * (PIECE_G[id] ?? 120);
  if (/tallo/.test(q)) return n * 40;
  if (/rebanada/.test(q)) return n * (PIECE_G[id] ?? 30);
  if (PIECE_G[id] != null) return n * PIECE_G[id];
  return n * 90; // pieza o unidad genérica
}

const LIQUID_NAME = /sopa|caldo|crema de (?!cacahuate|almendra|chipotle)|consom|pozole|menudo|licuado|smoothie|batido|agua de|agua fresca|jugo|atole|leche dorada|\bte\b|cafe|bebida|gazpacho/;
const DRINK_NAME = /licuado|smoothie|batido|agua de|agua fresca|jugo|atole|leche dorada|\bte\b|cafe|bebida/;

function countOf(recipe, re) {
  const ing = (recipe.ingredients || []).find((i) => re.test(i.id || norm(i.name)));
  if (!ing) return 0;
  const q = norm(ing.qty);
  if (/\b(g|ml|taza|cda|cdita)\b/.test(q)) return 0;
  return parseNum(q) || 0;
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// Qué es "1 porción" de esta receta, en palabras
function pieceText(recipe) {
  if (OVERRIDES[recipe.id]?.text) return OVERRIDES[recipe.id].text;
  const name = norm(recipe.name);
  const tort = countOf(recipe, /tortilla/);
  const tost = countOf(recipe, /tostada/);
  const eggs = countOf(recipe, /^huevo$/);
  const bread = countOf(recipe, /^pan_/);
  const lettuce = countOf(recipe, /^lechuga$/);
  const zucchini = countOf(recipe, /^calabacita$/);
  if (DRINK_NAME.test(name) && !/bowl/.test(name)) return '1 vaso';
  if (LIQUID_NAME.test(name)) return '1 plato hondo';
  if (/tacos? de lechuga/.test(name)) return lettuce >= 2 ? `${plural(lettuce, 'taco', 'tacos')} de lechuga` : '3 tacos de lechuga';
  if (/\btacos?\b/.test(name) && tort) return plural(tort, 'taco', 'tacos');
  if (/quesadilla/.test(name) && tort) return plural(tort, 'quesadilla', 'quesadillas');
  if (/enchilada|enfrijolada|entomatada|flauta|taquito/.test(name) && tort) return `${plural(tort, 'pieza', 'piezas')} con su salsa`;
  if (/tostad(a|ita)/.test(name) && tost) return plural(tost, 'tostada', 'tostadas') + ' con su preparación';
  if (/burrito|wrap|sincronizada/.test(name)) return '1 pieza';
  if ((/^pan |s[aá]ndwich|sandwich|torta|mollete/.test(name)) && bread) return `${plural(bread, 'rebanada', 'rebanadas')} de pan con su preparación`;
  if (/bowl|tazon|poke/.test(name)) return '1 bowl';
  if (/milanesa/.test(name)) return '1 milanesa con su ensalada';
  if (/pechuga/.test(name)) return '1 pechuga con su acompañamiento';
  if (/muslo/.test(name)) return '1 muslo con su acompañamiento';
  if (/^(filete|salm[oó]n|pescado|tilapia|robalo)/.test(name)) return '1 filete con su acompañamiento';
  if (/hamburguesa/.test(name)) return '1 hamburguesa';
  if (/albondiga/.test(name)) return '4 o 5 albóndigas con su salsa';
  if (/tortitas/.test(name)) return '2 o 3 tortitas';
  if (/hot ?cakes?|panqueque|crepa|waffle/.test(name)) return '2 o 3 piezas';
  if (/muffin/.test(name)) return '2 muffins';
  if (/bolitas/.test(name)) return '2 o 3 bolitas';
  if (/barritas/.test(name)) return '1 barrita';
  if (/chiles? (poblanos? )?rellenos?|chile poblano relleno/.test(name)) return '1 chile relleno';
  if (/calabacitas rellenas/.test(name)) return `${plural(zucchini || 2, 'calabacita rellena', 'calabacitas rellenas')}`;
  if (/relleno/.test(name) && /aguacate/.test(name)) return '1/2 aguacate relleno';
  if (/^(huevos?|omelette|omelet|frittata|tortilla espa)/.test(name) && eggs) return `${plural(eggs, 'huevo', 'huevos')} con su preparación`;
  if (/ensalada/.test(name)) return '1 plato';
  if (/yogur|parfait|avena|overnight|chia|pudin|cottage/.test(name)) return '1 tazón';
  return '1 plato';
}

// Descripciones revisadas a mano (texto y, si hace falta, tamaño en g/ml)
const OVERRIDES = {
  pan_centeno_salmon: { text: '1 rebanada de pan con salmón y cottage' },
  tostada_hummus_huevo: { text: '1 rebanada de pan con hummus y 1 huevo' },
  pan_sin_gluten_aguacate: { text: '1 rebanada de pan con aguacate y 1 huevo' },
  pan_frances_integral: { text: '2 rebanadas de pan con fresas' },
  v_pan_centeno_cacahuate: { text: '1 rebanada de pan con cacahuate y plátano' },
  v_tostada_hummus: { text: '1 rebanada de pan con hummus y jitomate' },
  v_pan_almendra: { text: '1 pieza de pan con aguacate' },
  k_pan_almendra_taza: { text: '1 panecito en taza con aguacate' },
  manzana_cacahuate: { text: '1 manzana con 1 cda de crema de cacahuate', size: 200 },
  platano_cacahuate: { text: '1 plátano con 1 cda de crema de cacahuate', size: 140 },
  apio_cacahuate: { text: '2 o 3 tallos de apio con crema de cacahuate', size: 110 },
  v_platano_cacahuates: { text: '1 plátano con un puñito de cacahuates' },
  manzana_nuez: { text: '1 manzana con un puñito de nuez' },
  naranja_almendras: { text: '1 naranja con un puñito de almendras' },
  v_uvas_nueces: { text: '1 taza chica de uvas con nueces' },
  mix_nueces: { text: '1 puñito (unas 3 cucharadas)', size: 40 },
  v_almendras_paprika: { text: '1 puñito (unas 20 almendras)', size: 30 },
  pepitas_chile: { text: '1 puñito (unas 3 cucharadas)', size: 30 },
  garbanzos_tostados: { text: '1/2 taza de garbanzos', size: 90 },
  k_manchego_nueces: { text: '2 o 3 cubos de queso con nueces', size: 60 },
  edamame_limon: { text: '1 taza de edamame en vaina' },
  edamame_chile: { text: '1 taza de edamame en vaina' },
  huevo_aguacate: { text: '1 huevo cocido con aguacate' },
  huevos_endiablados: { text: '2 huevos (4 mitades rellenas)' },
  k_huevo_en_aguacate: { text: '1/2 aguacate con 1 huevo horneado' },
  k_huevos_salmon: { text: '2 huevos revueltos con salmón y aguacate' },
  k_bistec_huevo: { text: '1 bistec con 1 huevo y su salsa' },
  k_ensalada_atun_huevo: { text: '1 plato' },
  arroz_coliflor: { text: '1 plato' },
  aceitunas_feta: { text: '1 platito (8 a 10 aceitunas con queso)', size: 60 },
  chips_kale: { text: '1 tazón de chips', size: 60 },
  chips_calabacita: { text: '1 platito de chips', size: 120 },
  k_chips_parmesano: { text: '4 o 5 chips de queso', size: 30 },
  rollitos_pepino: { text: '6 a 8 rollitos', size: 180 },
  rollitos_atun: { text: '3 o 4 rollitos de lechuga' },
  k_rollitos_salmon: { text: '6 a 8 rollitos' },
  bolitas_avena_cacao: { text: '2 o 3 bolitas', size: 50 },
  bolitas_coco_almendra: { text: '2 o 3 bolitas', size: 40 },
  v_bolitas_nuez_cacao: { text: '2 o 3 bolitas', size: 40 },
  v_barritas_avena: { text: '1 barrita', size: 60 },
  cottage_fresas: { text: '1 tazón' },
  k_cottage_frambuesa: { text: '1 tazón' },
  cottage_pepino: { text: '1 tazón' },
  panela_jitomate: { text: '2 o 3 rebanadas de panela con jitomate' },
  tostadita_aguacate: { text: '1 tostada con aguacate' },
  melon_limon: { text: '1 taza de melón' },
  fruta_picada: { text: '1 vaso de fruta picada' },
  v_fruta_kiwi_pina: { text: '1 vaso de fruta picada' },
  pepino_zanahoria_chile: { text: '1 vaso de verdura en bastones' },
  v_jicama_chile: { text: '1 vaso de jícama en bastones' },
  v_rabanos_limon: { text: '1 taza de rábanos' },
  v_pepino_tahini: { text: '1 pepino con tahini' },
  hummus_verduras: { text: '1/3 taza de hummus con bastones de verdura' },
  v_guacamole_jicama: { text: '1/2 taza de guacamole con jícama' },
  sardinas_pepino: { text: '1 lata chica de sardinas con pepino' },
  k_pepinos_atun: { text: '1 pepino relleno (2 mitades)' },
  k_apio_queso_crema: { text: '2 o 3 tallos de apio con queso crema' },
  k_champinones_rellenos: { text: '5 o 6 champiñones' },
  v_aguacate_ajonjoli: { text: '1/2 aguacate' },
  v_camote_almendra: { text: '1 camote chico' },
  v_kale_tofu_almendra: { text: '1 plato' },
  v_lentejas_lata_arroz: { text: '1 plato' },
  k_quesadilla_queso: { text: '1 quesadilla grande' },
  wrap_lechuga_pavo: { text: '3 tacos de lechuga' },
  lomo_salsa_verde: { text: '1 trozo de lomo con su salsa' },
  lomo_camote: { text: '1 trozo de lomo con camote' },
  bistec_nopales: { text: '1 bistec con nopales' },
  k_carne_asada_nopal: { text: '1 porción de carne con nopales y guacamole' },
  k_pollo_chipotle: { text: '1 plato' },
  k_lasana_calabacita: { text: '1 rebanada de lasaña' },
  coliflor_gratinada: { text: '1 plato' },
  v_granola: { text: '1 tazón (1/2 taza de granola con bebida)', unit: 'g' },
  v_smoothie_bowl: { text: '1 bowl' },
  v_arroz_almendra: { text: '1 tazón', unit: 'g' },
  v_quinoa_frutos: { text: '1 tazón' },
  v_avena_cacahuate: { text: '1 tazón' },
  k_crepas_huevo: { text: '2 crepas' },
  v_crepas_avena: { text: '2 o 3 crepas' },
  v_hash_papa_tofu: { text: '1 plato' },
  k_chile_relleno_carne: { text: '1 chile relleno' },
  v_chiles_frijol: { text: '1 o 2 chiles rellenos' },
  aguacate_relleno_atun: { text: '1/2 aguacate relleno' },
  v_aguacate_tofu: { text: '1/2 aguacate relleno' },
  tortitas_atun: { text: '2 o 3 tortitas' },
  v_tortitas_quinoa: { text: '2 o 3 tortitas' },
  muffins_huevo: { text: '2 muffins' },
  k_muffins_tocino: { text: '2 muffins' },
};

// Descripción y tamaño aproximado de 1 porción
export function portionInfo(recipe) {
  const liquid = OVERRIDES[recipe.id]?.unit ? OVERRIDES[recipe.id].unit === 'ml' : LIQUID_NAME.test(norm(recipe.name));
  const raw = (recipe.ingredients || []).reduce((a, i) => {
    const w = ingWeight(i);
    // en guisos el caldo se reduce al cocinar
    return a + (!liquid && /^(agua|caldo)/.test(i.id || '') && i.id !== 'aguacate' ? w * 0.4 : w);
  }, 0);
  const servings = recipe.servings || 1;
  // las verduras pierden agua al cocinarse: ~10 % menos en platillos calientes
  const cooked = /ensalada|smoothie|licuado|fruta|yogur|chia|crud/.test(norm(recipe.name)) ? raw : raw * 0.9;
  const auto = Math.round(Math.min(liquid ? 600 : 700, Math.max(30, cooked / servings)) / 10) * 10;
  const size = OVERRIDES[recipe.id]?.size || auto;
  const unit = liquid ? 'ml' : 'g';
  return { size, unit, liquid, text: `${pieceText(recipe)} (~${size}\u00a0${unit})` };
}

export function servingSize(recipe) {
  return portionInfo(recipe).size;
}

// Opciones de medida: porciones y gramos/mililitros
export function portionModes(recipe) {
  const info = portionInfo(recipe);
  return [
    { id: 'portion', label: 'Porciones', unit: 'porción', units: 'porciones', step: 0.5, min: 0.5, max: 6, def: 1 },
    {
      id: 'mass', label: info.liquid ? 'Mililitros' : 'Gramos', unit: info.unit, units: info.unit,
      step: info.liquid ? 50 : 25, min: 25, max: 3000, def: info.size, per: info.size,
    },
  ];
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
  return `${nice} ${mode.unit}`;
}
