// Catálogo de ingredientes.
// Formato: [id, nombre, categoría, lugar, banderas separadas por espacio]
// Lugar: refri | alacena | congelador
// Banderas de restricción: meat redMeat poultry fish egg dairy processed carb sugar
//   gluten fodmap sodium satfat honey fried
// Banderas de beneficio: veg fruit legume olive healthyfat lowfatdairy wholegrain
//   berry leafy oat soy nut leanprotein
// staple = básico que se asume en casa (sal, pimienta, agua)

const RAW = [
  // Básicos
  ['sal', 'Sal', 'especia', 'alacena', 'staple'],
  ['pimienta', 'Pimienta', 'especia', 'alacena', 'staple'],
  ['agua', 'Agua', 'otro', 'alacena', 'staple'],

  // Verduras
  ['jitomate', 'Jitomate', 'verdura', 'refri', 'veg'],
  ['cebolla', 'Cebolla', 'verdura', 'alacena', 'veg fodmap'],
  ['ajo', 'Ajo', 'verdura', 'alacena', 'veg fodmap'],
  ['cebollin', 'Cebollín (parte verde)', 'verdura', 'refri', 'veg'],
  ['chile_serrano', 'Chile serrano', 'verdura', 'refri', 'veg'],
  ['chile_jalapeno', 'Chile jalapeño', 'verdura', 'refri', 'veg'],
  ['chile_poblano', 'Chile poblano', 'verdura', 'refri', 'veg'],
  ['pimiento', 'Pimiento morrón', 'verdura', 'refri', 'veg'],
  ['calabacita', 'Calabacita', 'verdura', 'refri', 'veg'],
  ['zanahoria', 'Zanahoria', 'verdura', 'refri', 'veg'],
  ['brocoli', 'Brócoli', 'verdura', 'refri', 'veg'],
  ['coliflor', 'Coliflor', 'verdura', 'refri', 'veg fodmap'],
  ['espinaca', 'Espinaca', 'verdura', 'refri', 'veg leafy'],
  ['lechuga', 'Lechuga', 'verdura', 'refri', 'veg leafy'],
  ['kale', 'Kale', 'verdura', 'refri', 'veg leafy'],
  ['pepino', 'Pepino', 'verdura', 'refri', 'veg'],
  ['champinon', 'Champiñones', 'verdura', 'refri', 'veg fodmap'],
  ['nopal', 'Nopales', 'verdura', 'refri', 'veg'],
  ['ejote', 'Ejotes', 'verdura', 'refri', 'veg'],
  ['esparrago', 'Espárragos', 'verdura', 'refri', 'veg fodmap'],
  ['berenjena', 'Berenjena', 'verdura', 'refri', 'veg'],
  ['apio', 'Apio', 'verdura', 'refri', 'veg fodmap'],
  ['col', 'Col / repollo', 'verdura', 'refri', 'veg'],
  ['betabel', 'Betabel', 'verdura', 'refri', 'veg carb'],
  ['cilantro', 'Cilantro', 'verdura', 'refri', 'veg leafy'],
  ['perejil', 'Perejil', 'verdura', 'refri', 'veg leafy'],
  ['epazote', 'Epazote', 'verdura', 'refri', 'veg'],
  ['albahaca', 'Albahaca', 'verdura', 'refri', 'veg'],
  ['papa', 'Papa', 'verdura', 'alacena', 'veg carb'],
  ['camote', 'Camote', 'verdura', 'alacena', 'veg carb'],
  ['elote', 'Elote / granos de elote', 'verdura', 'congelador', 'veg carb'],
  ['chicharo', 'Chícharos', 'verdura', 'congelador', 'veg carb fodmap'],
  ['verduras_congeladas', 'Mezcla de verduras congeladas', 'verdura', 'congelador', 'veg'],

  // Frutas
  ['aguacate', 'Aguacate', 'fruta', 'refri', 'healthyfat'],
  ['limon', 'Limón', 'fruta', 'refri', 'fruit'],
  ['platano', 'Plátano', 'fruta', 'alacena', 'fruit carb'],
  ['manzana', 'Manzana', 'fruta', 'refri', 'fruit carb fodmap'],
  ['fresa', 'Fresas', 'fruta', 'refri', 'fruit berry'],
  ['mora', 'Moras / zarzamoras', 'fruta', 'refri', 'fruit berry'],
  ['arandano', 'Arándanos', 'fruta', 'refri', 'fruit berry'],
  ['frambuesa', 'Frambuesas', 'fruta', 'refri', 'fruit berry'],
  ['mango', 'Mango', 'fruta', 'refri', 'fruit carb fodmap'],
  ['papaya', 'Papaya', 'fruta', 'refri', 'fruit carb'],
  ['pina', 'Piña', 'fruta', 'refri', 'fruit carb'],
  ['naranja', 'Naranja', 'fruta', 'refri', 'fruit carb'],
  ['kiwi', 'Kiwi', 'fruta', 'refri', 'fruit'],
  ['sandia', 'Sandía', 'fruta', 'refri', 'fruit carb fodmap'],
  ['melon', 'Melón', 'fruta', 'refri', 'fruit carb'],
  ['uva', 'Uvas', 'fruta', 'refri', 'fruit carb'],
  ['frutos_rojos_cong', 'Frutos rojos congelados', 'fruta', 'congelador', 'fruit berry'],

  // Proteínas
  ['huevo', 'Huevo', 'proteina', 'refri', 'egg'],
  ['pechuga_pollo', 'Pechuga de pollo', 'proteina', 'refri', 'poultry leanprotein'],
  ['muslo_pollo', 'Muslo de pollo', 'proteina', 'refri', 'poultry'],
  ['pavo_molido', 'Pavo molido', 'proteina', 'refri', 'poultry leanprotein'],
  ['carne_molida', 'Carne molida de res', 'proteina', 'refri', 'meat redMeat'],
  ['bistec', 'Bistec de res', 'proteina', 'refri', 'meat redMeat'],
  ['cerdo_lomo', 'Lomo de cerdo', 'proteina', 'refri', 'meat redMeat'],
  ['salmon', 'Salmón', 'proteina', 'congelador', 'fish healthyfat'],
  ['tilapia', 'Filete de pescado blanco', 'proteina', 'congelador', 'fish leanprotein'],
  ['atun_lata', 'Atún en agua (lata)', 'proteina', 'alacena', 'fish leanprotein'],
  ['sardina_lata', 'Sardinas (lata)', 'proteina', 'alacena', 'fish healthyfat'],
  ['camaron', 'Camarón', 'proteina', 'congelador', 'fish leanprotein'],
  ['tofu', 'Tofu', 'proteina', 'refri', 'soy leanprotein'],
  ['tocino', 'Tocino', 'proteina', 'refri', 'meat redMeat processed sodium satfat'],
  ['jamon', 'Jamón', 'proteina', 'refri', 'meat redMeat processed sodium'],
  ['chorizo', 'Chorizo', 'proteina', 'refri', 'meat redMeat processed sodium satfat'],
  ['salchicha', 'Salchicha', 'proteina', 'refri', 'meat redMeat processed sodium'],

  // Lácteos
  ['leche', 'Leche', 'lacteo', 'refri', 'dairy fodmap'],
  ['leche_deslactosada', 'Leche deslactosada', 'lacteo', 'refri', 'dairy lowfatdairy'],
  ['yogur_griego', 'Yogur griego natural', 'lacteo', 'refri', 'dairy'],
  ['yogur_natural', 'Yogur natural', 'lacteo', 'refri', 'dairy lowfatdairy fodmap'],
  ['queso_panela', 'Queso panela', 'lacteo', 'refri', 'dairy lowfatdairy'],
  ['queso_fresco', 'Queso fresco', 'lacteo', 'refri', 'dairy'],
  ['queso_cottage', 'Queso cottage', 'lacteo', 'refri', 'dairy lowfatdairy'],
  ['queso_oaxaca', 'Queso Oaxaca', 'lacteo', 'refri', 'dairy satfat'],
  ['queso_manchego', 'Queso manchego', 'lacteo', 'refri', 'dairy satfat'],
  ['queso_feta', 'Queso feta', 'lacteo', 'refri', 'dairy sodium'],
  ['parmesano', 'Queso parmesano', 'lacteo', 'refri', 'dairy sodium'],
  ['queso_crema', 'Queso crema', 'lacteo', 'refri', 'dairy satfat'],
  ['crema', 'Crema', 'lacteo', 'refri', 'dairy satfat'],
  ['mantequilla', 'Mantequilla', 'lacteo', 'refri', 'dairy satfat'],

  // Leches vegetales
  ['leche_almendra', 'Bebida de almendra sin azúcar', 'lacteo', 'refri', 'nut'],
  ['leche_soya', 'Bebida de soya sin azúcar', 'lacteo', 'refri', 'soy'],

  // Granos y harinas
  ['tortilla_maiz', 'Tortillas de maíz', 'grano', 'refri', 'carb wholegrain'],
  ['tortilla_harina', 'Tortillas de harina', 'grano', 'alacena', 'carb gluten fodmap'],
  ['pan_integral', 'Pan integral', 'grano', 'alacena', 'carb gluten fodmap wholegrain'],
  ['pan_centeno', 'Pan de centeno', 'grano', 'alacena', 'carb gluten fodmap wholegrain'],
  ['pan_sin_gluten', 'Pan sin gluten', 'grano', 'alacena', 'carb'],
  ['arroz', 'Arroz', 'grano', 'alacena', 'carb'],
  ['arroz_integral', 'Arroz integral', 'grano', 'alacena', 'carb wholegrain'],
  ['pasta', 'Pasta', 'grano', 'alacena', 'carb gluten fodmap'],
  ['pasta_integral', 'Pasta integral', 'grano', 'alacena', 'carb gluten fodmap wholegrain'],
  ['avena', 'Avena', 'grano', 'alacena', 'carb wholegrain oat'],
  ['quinoa', 'Quinoa', 'grano', 'alacena', 'carb wholegrain'],
  ['tostadas', 'Tostadas horneadas', 'grano', 'alacena', 'carb'],
  ['harina_almendra', 'Harina de almendra', 'grano', 'alacena', 'nut'],

  // Legumbres
  ['frijol', 'Frijoles (cocidos o de lata)', 'legumbre', 'alacena', 'legume carb fodmap'],
  ['lenteja', 'Lentejas', 'legumbre', 'alacena', 'legume carb fodmap'],
  ['garbanzo', 'Garbanzos', 'legumbre', 'alacena', 'legume carb fodmap'],
  ['edamame', 'Edamame', 'legumbre', 'congelador', 'legume soy'],
  ['hummus', 'Hummus', 'legumbre', 'refri', 'legume carb fodmap'],

  // Grasas, nueces y semillas
  ['aceite_oliva', 'Aceite de oliva', 'grasa', 'alacena', 'olive healthyfat'],
  ['aceite_vegetal', 'Aceite vegetal / canola', 'grasa', 'alacena', ''],
  ['nuez', 'Nueces', 'grasa', 'alacena', 'nut healthyfat'],
  ['almendra', 'Almendras', 'grasa', 'alacena', 'nut healthyfat'],
  ['cacahuate', 'Cacahuates naturales', 'grasa', 'alacena', 'nut'],
  ['crema_cacahuate', 'Crema de cacahuate natural', 'grasa', 'alacena', 'nut'],
  ['chia', 'Semillas de chía', 'grasa', 'alacena', 'healthyfat'],
  ['linaza', 'Linaza molida', 'grasa', 'alacena', 'healthyfat'],
  ['pepita', 'Pepitas de calabaza', 'grasa', 'alacena', 'healthyfat'],
  ['aceituna', 'Aceitunas', 'grasa', 'alacena', 'olive sodium'],
  ['coco_rallado', 'Coco rallado sin azúcar', 'grasa', 'alacena', 'satfat'],

  // Condimentos y otros
  ['comino', 'Comino', 'especia', 'alacena', ''],
  ['oregano', 'Orégano', 'especia', 'alacena', ''],
  ['paprika', 'Paprika', 'especia', 'alacena', ''],
  ['canela', 'Canela', 'especia', 'alacena', ''],
  ['curry', 'Curry en polvo', 'especia', 'alacena', ''],
  ['chile_polvo', 'Chile en polvo', 'especia', 'alacena', ''],
  ['chipotle', 'Chiles chipotles (lata)', 'especia', 'alacena', 'sodium'],
  ['salsa_soya', 'Salsa de soya', 'otro', 'alacena', 'sodium soy gluten'],
  ['vinagre', 'Vinagre', 'otro', 'alacena', ''],
  ['mostaza', 'Mostaza', 'otro', 'refri', ''],
  ['mayonesa', 'Mayonesa', 'otro', 'refri', 'processed'],
  ['salsa_verde', 'Salsa verde', 'otro', 'refri', 'veg'],
  ['pure_tomate', 'Puré de tomate', 'otro', 'alacena', 'veg'],
  ['caldo_verduras', 'Caldo de verduras (bajo en sodio)', 'otro', 'alacena', ''],
  ['miel', 'Miel', 'otro', 'alacena', 'sugar honey carb fodmap'],
  ['azucar', 'Azúcar', 'otro', 'alacena', 'sugar carb'],
  ['cacao', 'Cacao en polvo sin azúcar', 'otro', 'alacena', ''],
  ['vainilla', 'Extracto de vainilla', 'otro', 'alacena', ''],
  ['polvo_hornear', 'Polvo para hornear', 'otro', 'alacena', ''],
  ['psyllium', 'Psyllium', 'otro', 'alacena', 'oat'],
  ['jengibre', 'Jengibre', 'especia', 'refri', ''],
];

export const CATEGORIES = {
  verdura: 'Verduras',
  fruta: 'Frutas',
  proteina: 'Proteínas',
  lacteo: 'Lácteos y bebidas',
  grano: 'Granos y harinas',
  legumbre: 'Legumbres',
  grasa: 'Grasas y semillas',
  especia: 'Especias',
  otro: 'Otros',
};

export const LOCATIONS = {
  refri: 'Refrigerador',
  alacena: 'Alacena',
  congelador: 'Congelador',
};

export const INGREDIENTS = RAW.map(([id, name, cat, loc, flags]) => ({
  id,
  name,
  cat,
  loc,
  flags: new Set(flags.split(' ').filter(Boolean)),
}));

export const ING = Object.fromEntries(INGREDIENTS.map((i) => [i.id, i]));

// Sugerencias rápidas para el onboarding y la despensa
export const QUICK_PICKS = [
  'huevo', 'jitomate', 'cebolla', 'ajo', 'aguacate', 'limon', 'pechuga_pollo',
  'tortilla_maiz', 'frijol', 'arroz', 'avena', 'platano', 'espinaca', 'queso_panela',
  'aceite_oliva', 'leche', 'yogur_griego', 'atun_lata', 'calabacita', 'zanahoria',
  'chile_serrano', 'manzana', 'nuez', 'pasta',
];

// Normaliza texto para búsquedas (sin acentos, minúsculas)
export function norm(s) {
  return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

// Encuentra el ingrediente del catálogo que corresponde a un nombre libre (usado por la IA)
// Sinónimos comunes en México → id del catálogo
const ALIASES = {
  tomate: 'jitomate', 'tomate rojo': 'jitomate', 'tomate saladet': 'jitomate',
  pimiento: 'pimiento', morron: 'pimiento', 'chile morron': 'pimiento',
  calabacin: 'calabacita', zucchini: 'calabacita', palta: 'aguacate',
  frijoles: 'frijol', judias: 'ejote', 'ejotes': 'ejote', poro: 'cebollin',
  'pechuga': 'pechuga_pollo', 'pollo': 'pechuga_pollo', 'atun': 'atun_lata',
  'yogurt': 'yogur_natural', 'yoghurt': 'yogur_natural', 'cacahuates': 'cacahuate', 'mani': 'cacahuate',
};

export function matchIngredient(name) {
  const n = norm(name);
  if (!n) return null;
  const firstTwo = n.split(' ').slice(0, 2).join(' ');
  for (const key of [n, firstTwo, n.split(' ')[0]]) {
    if (ALIASES[key] && ING[ALIASES[key]]) {
      // "tomate verde" no es jitomate
      if (key === 'tomate' && /verde/.test(n)) break;
      return ING[ALIASES[key]];
    }
  }
  const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // coincide como palabra completa (acepta plural: huevo → huevos, limón → limones)
  const word = (hay, needle) => new RegExp(`(^|[^a-z0-9])${esc(needle)}(s|es)?([^a-z0-9]|$)`).test(hay);
  let best = null;
  let bestScore = 0;
  for (const ing of INGREDIENTS) {
    const m = norm(ing.name);
    const short = m.split(' (')[0];
    let score = 0;
    if (m === n || short === n) score = 100;
    else if (word(n, short)) {
      // "leche de coco" no es "leche": si sobra un complemento con "de", es otro ingrediente
      const rest = n.replace(new RegExp(`.*?${esc(short)}(s|es)?`), '').trim();
      score = /^de\s/.test(rest) && !/\bde\b/.test(short) ? 0 : 80 + short.length / 10;
    }
    else if (word(short, n)) score = 60 + n.length / 10;
    if (score > bestScore) {
      bestScore = score;
      best = ing;
    }
  }
  return bestScore >= 60 ? best : null;
}
