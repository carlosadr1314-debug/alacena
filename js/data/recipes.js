// Recetario base (funciona sin internet ni IA).
// ing: "id_ingrediente:cantidad|..."  (ids de ingredients.js)
// kcal, p (proteína g), c (carbohidratos g), f (grasa g): aproximados por porción.
// La compatibilidad con cada dieta se calcula sola a partir de los ingredientes.

import { EXTRA_RECIPES } from './recipes-extra.js';

const R = (id, name, meals, time, kcal, p, c, f, ing, steps, extra = {}) => ({
  id, name, meals, time, kcal, p, c, f, servings: 1,
  ingredients: ing.split('|').map((s) => {
    const [iid, qty] = s.split(':');
    return { id: iid.trim(), qty: (qty || '').trim() };
  }),
  steps, ...extra,
});

const BASE_RECIPES = [
  // ───────────── DESAYUNOS ─────────────
  R('huevos_mexicana', 'Huevos a la mexicana', ['desayuno', 'cena'], 12, 290, 17, 7, 21,
    'huevo:2 piezas|jitomate:1 pieza|cebolla:1/4 pieza|chile_serrano:1 pieza|aceite_oliva:1 cdita|sal:al gusto',
    ['Pica el jitomate, la cebolla y el chile en cubos pequeños.',
     'Sofríe la cebolla y el chile en el aceite 2 minutos; agrega el jitomate y cocina 3 minutos más.',
     'Bate los huevos con sal, viértelos al sartén y mueve con suavidad hasta que cuajen.']),

  R('omelette_espinaca', 'Omelette de espinaca y panela', ['desayuno', 'cena'], 10, 310, 24, 3, 22,
    'huevo:2 piezas|espinaca:1 taza|queso_panela:40 g|aceite_oliva:1 cdita|sal:al gusto|pimienta:al gusto',
    ['Bate los huevos con sal y pimienta.',
     'Saltea la espinaca en el aceite hasta que se marchite.',
     'Vierte el huevo, cocina a fuego bajo y agrega el panela en cubos.',
     'Dobla el omelette a la mitad y sirve.']),

  R('avena_frutos_rojos', 'Avena con frutos rojos y nuez', ['desayuno'], 10, 360, 13, 50, 12,
    'avena:1/2 taza|leche_deslactosada:1 taza|fresa:1/2 taza|nuez:1 cda|canela:1 pizca',
    ['Calienta la leche y agrega la avena; cocina 5 minutos moviendo.',
     'Sirve y corona con fresas en rebanadas, nuez picada y canela.']),

  R('avena_nocturna', 'Avena nocturna con chía y plátano', ['desayuno'], 5, 380, 18, 52, 11,
    'avena:1/2 taza|yogur_griego:1/2 taza|chia:1 cda|platano:1/2 pieza|canela:1 pizca|agua:1/4 taza',
    ['Mezcla avena, yogur, chía, agua y canela en un frasco.',
     'Refrigera toda la noche (mínimo 4 horas).',
     'Por la mañana agrega el plátano en rodajas.']),

  R('chilaquiles_horneados', 'Chilaquiles verdes horneados', ['desayuno'], 20, 420, 20, 45, 17,
    'tortilla_maiz:4 piezas|salsa_verde:1/2 taza|huevo:1 pieza|queso_fresco:30 g|cebolla:2 aros|aceite_vegetal:1 cdita',
    ['Corta las tortillas en triángulos, barnízalas con poco aceite y hornéalas a 200 °C por 10 minutos hasta que doren.',
     'Calienta la salsa verde y baña los totopos.',
     'Sirve con huevo estrellado o cocido, queso fresco y cebolla.']),

  R('molletes_integrales', 'Molletes integrales con pico de gallo', ['desayuno', 'cena'], 15, 390, 19, 52, 11,
    'pan_integral:2 rebanadas|frijol:1/2 taza|queso_panela:40 g|jitomate:1 pieza|cebolla:1/4 pieza|cilantro:1 ramita|chile_serrano:1/2 pieza',
    ['Unta los frijoles machacados sobre el pan y agrega el panela rallado.',
     'Gratina en horno o sartén tapado 5 minutos.',
     'Pica jitomate, cebolla, cilantro y chile; mezcla con sal y sirve encima.']),

  R('tostada_aguacate_huevo', 'Pan tostado con aguacate y huevo', ['desayuno'], 10, 350, 15, 28, 20,
    'pan_integral:1 rebanada|aguacate:1/2 pieza|huevo:1 pieza|limon:1/2 pieza|chile_polvo:1 pizca|sal:al gusto',
    ['Tuesta el pan.',
     'Machaca el aguacate con limón y sal; úntalo sobre el pan.',
     'Agrega el huevo (estrellado o pochado) y espolvorea chile en polvo.']),

  R('smoothie_verde', 'Smoothie verde', ['desayuno', 'snack'], 5, 240, 6, 38, 8,
    'espinaca:1 taza|platano:1 pieza|leche_almendra:1 taza|chia:1 cdita',
    ['Licúa todos los ingredientes hasta que quede terso.',
     'Sirve de inmediato; si lo quieres frío usa el plátano congelado.']),

  R('yogur_moras', 'Yogur griego con moras y almendras', ['desayuno', 'snack'], 3, 260, 18, 14, 14,
    'yogur_griego:3/4 taza|mora:1/2 taza|almendra:10 piezas|canela:1 pizca',
    ['Sirve el yogur en un tazón.',
     'Agrega las moras, las almendras picadas y la canela.']),

  R('tofu_revuelto', 'Tofu revuelto a la mexicana', ['desayuno', 'cena'], 12, 260, 18, 9, 17,
    'tofu:150 g|jitomate:1 pieza|cebolla:1/4 pieza|chile_serrano:1 pieza|aceite_oliva:1 cdita|comino:1 pizca|sal:al gusto',
    ['Desmorona el tofu con un tenedor.',
     'Sofríe cebolla y chile en el aceite, agrega el jitomate.',
     'Incorpora el tofu con comino y sal; cocina 5 minutos moviendo.']),

  R('hotcakes_avena', 'Hot cakes de avena y plátano', ['desayuno'], 15, 340, 14, 48, 10,
    'avena:1/2 taza|platano:1 pieza|huevo:1 pieza|canela:1 pizca|polvo_hornear:1/2 cdita',
    ['Licúa la avena, el plátano, el huevo, la canela y el polvo para hornear.',
     'Cocina porciones pequeñas en sartén antiadherente a fuego medio, 2 minutos por lado.',
     'Sirve con fruta fresca en lugar de miel o jarabe.']),

  R('huevos_nopales', 'Huevos con nopales', ['desayuno'], 15, 250, 15, 8, 17,
    'huevo:2 piezas|nopal:1 taza|jitomate:1/2 pieza|cebolla:1/4 pieza|aceite_oliva:1 cdita|sal:al gusto',
    ['Corta los nopales en tiras y cuécelos en sartén hasta que suelten y sequen su baba.',
     'Agrega cebolla y jitomate picados; cocina 2 minutos.',
     'Incorpora los huevos batidos y revuelve hasta que cuajen.']),

  R('pan_centeno_salmon', 'Pan de centeno con salmón y cottage', ['desayuno'], 10, 370, 26, 30, 15,
    'pan_centeno:2 rebanadas|salmon:60 g|queso_cottage:3 cdas|pepino:1/4 pieza|limon:1/2 pieza',
    ['Cocina el salmón a la plancha y desmenúzalo (o usa sobrante).',
     'Unta el cottage sobre el pan, agrega pepino en rodajas finas y el salmón.',
     'Termina con unas gotas de limón y pimienta.']),

  R('pudin_chia_cacao', 'Pudín de chía con cacao y frambuesa', ['desayuno', 'snack'], 5, 230, 7, 14, 16,
    'chia:3 cdas|leche_almendra:3/4 taza|cacao:1 cda|vainilla:1/2 cdita|frambuesa:1/4 taza',
    ['Mezcla chía, bebida de almendra, cacao y vainilla.',
     'Refrigera al menos 3 horas o toda la noche, moviendo una vez a la mitad.',
     'Sirve con frambuesas.']),

  R('huevos_tocino_aguacate', 'Huevos con tocino y aguacate', ['desayuno'], 12, 480, 22, 6, 41,
    'huevo:2 piezas|tocino:2 rebanadas|aguacate:1/2 pieza|sal:al gusto',
    ['Dora el tocino en sartén y reserva.',
     'En la misma grasa cocina los huevos al gusto.',
     'Sirve con el aguacate en rebanadas.']),

  R('licuado_soya_cacahuate', 'Licuado de soya, avena y cacahuate', ['desayuno', 'snack'], 5, 380, 16, 44, 15,
    'leche_soya:1 taza|avena:1/4 taza|crema_cacahuate:1 cda|platano:1/2 pieza|canela:1 pizca',
    ['Licúa todo hasta que la avena quede integrada.',
     'Sirve frío.']),

  // ───────────── SNACKS ─────────────
  R('pepino_zanahoria_chile', 'Pepino y zanahoria con limón y chile', ['snack'], 5, 70, 2, 14, 0,
    'pepino:1 pieza|zanahoria:1 pieza|limon:1 pieza|chile_polvo:al gusto',
    ['Corta pepino y zanahoria en bastones.',
     'Exprime limón encima y espolvorea chile en polvo.']),

  R('hummus_verduras', 'Hummus con bastones de verdura', ['snack'], 5, 190, 7, 20, 9,
    'hummus:1/4 taza|zanahoria:1 pieza|pepino:1/2 pieza|apio:1 tallo',
    ['Corta las verduras en bastones.',
     'Sirve con el hummus para dipear.']),

  R('mix_nueces', 'Mix de nueces y pepitas', ['snack'], 1, 200, 7, 6, 18,
    'nuez:1 cda|almendra:10 piezas|pepita:1 cda',
    ['Mezcla todo y sirve una porción (aprox. 30 g).']),

  R('manzana_cacahuate', 'Manzana con crema de cacahuate', ['snack'], 3, 200, 5, 26, 9,
    'manzana:1 pieza|crema_cacahuate:1 cda|canela:1 pizca',
    ['Rebana la manzana.',
     'Acompaña con la crema de cacahuate y canela.']),

  R('edamame_limon', 'Edamame con limón y sal', ['snack'], 6, 150, 13, 10, 6,
    'edamame:1 taza|limon:1/2 pieza|sal:al gusto',
    ['Hierve o cocina al vapor el edamame 4 minutos.',
     'Escurre y sazona con sal y limón.']),

  R('cottage_fresas', 'Queso cottage con fresas', ['snack', 'desayuno'], 3, 160, 15, 12, 5,
    'queso_cottage:1/2 taza|fresa:1/2 taza',
    ['Sirve el cottage con las fresas picadas.']),

  R('huevo_aguacate', 'Huevo cocido con aguacate', ['snack'], 12, 190, 7, 4, 16,
    'huevo:1 pieza|aguacate:1/4 pieza|sal:al gusto|pimienta:al gusto',
    ['Cuece el huevo 10 minutos, enfría y pela.',
     'Sirve en mitades con aguacate, sal y pimienta.']),

  R('fruta_picada', 'Fruta picada con limón y chile', ['snack'], 5, 110, 2, 26, 0,
    'papaya:1/2 taza|melon:1/2 taza|pina:1/2 taza|limon:1/2 pieza|chile_polvo:al gusto',
    ['Pica la fruta en cubos.',
     'Agrega limón y chile en polvo al gusto.']),

  R('tostadas_atun', 'Mini tostadas de atún', ['snack', 'cena'], 8, 230, 20, 22, 6,
    'tostadas:2 piezas|atun_lata:1/2 lata|jitomate:1/2 pieza|cebolla:1/8 pieza|limon:1/2 pieza|cilantro:1 ramita',
    ['Escurre el atún y mézclalo con jitomate, cebolla y cilantro picados.',
     'Sazona con limón y sal; sirve sobre las tostadas.']),

  R('chips_kale', 'Chips de kale al horno', ['snack'], 15, 90, 3, 7, 6,
    'kale:2 tazas|aceite_oliva:1 cdita|sal:al gusto|paprika:1 pizca',
    ['Retira los tallos del kale y corta las hojas en trozos.',
     'Mezcla con aceite, sal y paprika.',
     'Hornea a 160 °C de 10 a 12 minutos hasta que estén crujientes.']),

  R('rollitos_pepino', 'Rollitos de pepino con queso crema', ['snack'], 8, 150, 4, 5, 13,
    'pepino:1 pieza|queso_crema:2 cdas|cebollin:1 cda',
    ['Corta el pepino en láminas largas con un pelador.',
     'Unta queso crema mezclado con cebollín y enrolla.']),

  R('aceitunas_feta', 'Aceitunas con queso feta', ['snack'], 3, 170, 6, 4, 15,
    'aceituna:8 piezas|queso_feta:30 g|oregano:1 pizca|aceite_oliva:1/2 cdita',
    ['Corta el feta en cubos.',
     'Mezcla con aceitunas, orégano y un hilo de aceite.']),

  R('bolitas_avena_cacao', 'Bolitas de avena y cacao', ['snack'], 15, 180, 6, 20, 9,
    'avena:1/2 taza|crema_cacahuate:2 cdas|cacao:1 cda|platano:1/2 pieza|chia:1 cdita',
    ['Machaca el plátano y mezcla con el resto de los ingredientes.',
     'Forma 6 bolitas y refrigera 30 minutos.',
     'Una porción son 2 bolitas.']),

  // ───────────── COMIDAS ─────────────
  R('pollo_plancha_ensalada', 'Pollo a la plancha con ensalada', ['comida', 'cena'], 20, 380, 38, 8, 21,
    'pechuga_pollo:150 g|lechuga:2 tazas|jitomate:1 pieza|pepino:1/2 pieza|aceite_oliva:1 cda|limon:1 pieza|oregano:1 pizca',
    ['Sazona la pechuga con sal, pimienta y orégano.',
     'Cocina a la plancha 5–6 minutos por lado hasta que esté bien cocida.',
     'Mezcla lechuga, jitomate y pepino con aceite y limón.',
     'Rebana el pollo y sírvelo sobre la ensalada.']),

  R('salmon_brocoli', 'Salmón al horno con brócoli', ['comida', 'cena'], 25, 450, 34, 10, 30,
    'salmon:150 g|brocoli:1 1/2 tazas|aceite_oliva:1 cda|limon:1 pieza|ajo:1 diente|sal:al gusto',
    ['Precalienta el horno a 200 °C.',
     'Coloca salmón y brócoli en una charola con aceite, ajo picado, sal y rodajas de limón.',
     'Hornea de 12 a 15 minutos.']),

  R('tacos_pescado', 'Tacos de pescado con col', ['comida'], 20, 430, 30, 42, 15,
    'tilapia:150 g|tortilla_maiz:3 piezas|col:1 taza|limon:1 pieza|aguacate:1/4 pieza|chile_polvo:1 pizca|aceite_vegetal:1 cdita',
    ['Sazona el pescado con chile en polvo, sal y limón.',
     'Cocínalo a la plancha con poco aceite y desmenúzalo.',
     'Calienta las tortillas y arma los tacos con col fileteada, aguacate y limón.']),

  R('lentejas_guisadas', 'Lentejas guisadas', ['comida'], 35, 360, 20, 55, 6,
    'lenteja:1 taza cocida|jitomate:1 pieza|cebolla:1/4 pieza|ajo:1 diente|zanahoria:1 pieza|comino:1 pizca|caldo_verduras:2 tazas',
    ['Licúa jitomate, cebolla y ajo; sofríe la salsa 3 minutos.',
     'Agrega la zanahoria picada, las lentejas, el caldo y el comino.',
     'Cocina a fuego medio 20 minutos hasta que espese.']),

  R('ensalada_garbanzo', 'Ensalada mediterránea de garbanzo', ['comida', 'cena'], 10, 420, 16, 40, 22,
    'garbanzo:1 taza|pepino:1/2 pieza|jitomate:1 pieza|cebolla:1/8 pieza|aceituna:6 piezas|queso_feta:30 g|aceite_oliva:1 cda|limon:1 pieza',
    ['Escurre y enjuaga los garbanzos.',
     'Pica pepino, jitomate y cebolla.',
     'Mezcla todo con aceitunas, feta, aceite y limón.']),

  R('tinga_pollo', 'Tostadas de tinga de pollo', ['comida'], 30, 420, 34, 36, 14,
    'pechuga_pollo:150 g|jitomate:2 piezas|cebolla:1/2 pieza|chipotle:1 pieza|tostadas:2 piezas|aceite_vegetal:1 cdita',
    ['Cuece y deshebra la pechuga.',
     'Licúa el jitomate con el chipotle.',
     'Acitrona la cebolla en rodajas, agrega la salsa y el pollo; cocina 10 minutos.',
     'Sirve sobre las tostadas.']),

  R('calabacitas_pollo', 'Calabacitas a la mexicana con pollo', ['comida'], 25, 360, 34, 20, 15,
    'pechuga_pollo:130 g|calabacita:2 piezas|jitomate:1 pieza|cebolla:1/4 pieza|elote:1/3 taza|ajo:1 diente|aceite_oliva:1 cdita',
    ['Corta el pollo en cubos y dóralo en el aceite.',
     'Agrega cebolla y ajo; luego calabacita en cubos, elote y jitomate.',
     'Tapa y cocina 10 minutos a fuego medio.']),

  R('bowl_quinoa_tofu', 'Bowl de quinoa con tofu y verduras', ['comida'], 25, 470, 24, 52, 18,
    'quinoa:1/2 taza|tofu:120 g|brocoli:1 taza|zanahoria:1 pieza|salsa_soya:1 cda|jengibre:1 cdita|aceite_oliva:1 cdita',
    ['Cuece la quinoa en el doble de agua 15 minutos.',
     'Dora el tofu en cubos con el aceite.',
     'Saltea brócoli y zanahoria con jengibre y salsa de soya.',
     'Sirve todo sobre la quinoa.']),

  R('pasta_verduras', 'Pasta integral con verduras', ['comida'], 20, 480, 18, 68, 15,
    'pasta_integral:80 g|calabacita:1 pieza|jitomate:2 piezas|ajo:2 dientes|albahaca:5 hojas|aceite_oliva:1 cda|parmesano:1 cda',
    ['Cuece la pasta al dente.',
     'Sofríe el ajo en el aceite, agrega calabacita y jitomate picados; cocina 8 minutos.',
     'Mezcla con la pasta, albahaca y parmesano.']),

  R('bistec_nopales', 'Bistec con nopales asados', ['comida'], 20, 410, 38, 9, 24,
    'bistec:150 g|nopal:2 piezas|cebolla:1/4 pieza|jitomate:1 pieza|aceite_oliva:1 cdita|sal:al gusto',
    ['Asa los nopales enteros en comal hasta que cambien de color.',
     'Cocina el bistec con sal en sartén caliente 3 minutos por lado.',
     'Sirve con cebolla asada y jitomate picado.']),

  R('albondigas_pavo', 'Albóndigas de pavo en salsa de jitomate', ['comida'], 35, 390, 34, 18, 20,
    'pavo_molido:150 g|huevo:1 pieza|pure_tomate:1 taza|cebolla:1/4 pieza|ajo:1 diente|chipotle:1/2 pieza|calabacita:1 pieza',
    ['Mezcla el pavo con el huevo, sal y la mitad de la cebolla picada; forma albóndigas.',
     'Licúa el puré de tomate con ajo, chipotle y el resto de la cebolla.',
     'Hierve la salsa, agrega las albóndigas y la calabacita en cubos; cocina 20 minutos tapado.']),

  R('fajitas_pollo', 'Fajitas de pollo', ['comida', 'cena'], 20, 440, 36, 36, 16,
    'pechuga_pollo:150 g|pimiento:1 pieza|cebolla:1/2 pieza|aceite_oliva:1 cdita|comino:1 pizca|tortilla_maiz:3 piezas',
    ['Corta pollo, pimiento y cebolla en tiras.',
     'Saltea el pollo con comino y sal; agrega las verduras y cocina hasta que suavicen.',
     'Sirve en tortillas calientes.']),

  R('arroz_frijoles', 'Arroz integral con frijoles y verduras', ['comida'], 40, 450, 16, 82, 6,
    'arroz_integral:1/2 taza|frijol:1/2 taza|elote:1/3 taza|zanahoria:1 pieza|cebolla:1/4 pieza|ajo:1 diente|aceite_oliva:1 cdita',
    ['Sofríe el arroz con cebolla y ajo.',
     'Agrega 1 1/4 taza de agua, la zanahoria picada y el elote; cocina tapado 30 minutos.',
     'Sirve con los frijoles calientes.']),

  R('caldo_pollo', 'Caldo de pollo con verduras', ['comida', 'cena'], 50, 340, 30, 25, 12,
    'muslo_pollo:1 pieza|zanahoria:1 pieza|calabacita:1 pieza|papa:1 pieza|apio:1 tallo|cebolla:1/4 pieza|ajo:1 diente|cilantro:1 ramita',
    ['Hierve el pollo con cebolla, ajo y sal en 1 litro de agua por 25 minutos.',
     'Agrega papa, zanahoria y apio; a los 10 minutos la calabacita.',
     'Cocina 10 minutos más y sirve con cilantro y limón.']),

  R('camarones_ajillo', 'Camarones al ajillo con calabacita', ['comida', 'cena'], 15, 330, 30, 9, 19,
    'camaron:150 g|ajo:3 dientes|aceite_oliva:1 cda|calabacita:2 piezas|limon:1/2 pieza|perejil:1 cda',
    ['Corta la calabacita en tiras tipo espagueti o medias lunas.',
     'Dora el ajo en láminas en el aceite, agrega los camarones y cocina 2 minutos por lado.',
     'Incorpora la calabacita 3 minutos; termina con limón y perejil.']),

  R('arroz_coliflor', 'Arroz frito de coliflor con huevo', ['comida', 'cena'], 20, 280, 15, 14, 18,
    'coliflor:2 tazas|huevo:2 piezas|zanahoria:1/2 pieza|cebollin:2 cdas|salsa_soya:1 cda|aceite_vegetal:1 cda',
    ['Ralla o pica la coliflor hasta que parezca arroz.',
     'Saltea la zanahoria en el aceite, agrega la coliflor y cocina 5 minutos.',
     'Haz espacio, revuelve los huevos y mezcla todo con salsa de soya y cebollín.']),

  R('chili_sin_carne', 'Chili sin carne', ['comida', 'cena'], 35, 400, 20, 62, 7,
    'frijol:1 taza|jitomate:2 piezas|cebolla:1/2 pieza|pimiento:1 pieza|comino:1 cdita|chile_polvo:1 cdita|aceite_oliva:1 cdita',
    ['Sofríe cebolla y pimiento picados.',
     'Agrega jitomate picado, comino y chile en polvo; cocina 5 minutos.',
     'Incorpora los frijoles con un poco de su caldo y cocina 20 minutos.']),

  R('ensalada_atun', 'Ensalada de atún y aguacate', ['comida', 'cena'], 10, 360, 30, 10, 23,
    'atun_lata:1 lata|lechuga:2 tazas|jitomate:1 pieza|pepino:1/2 pieza|aguacate:1/2 pieza|limon:1 pieza|aceite_oliva:1 cdita',
    ['Escurre el atún.',
     'Pica las verduras y el aguacate.',
     'Mezcla todo con limón, aceite, sal y pimienta.']),

  R('pollo_curry', 'Pollo al curry con arroz integral', ['comida'], 35, 520, 38, 55, 15,
    'pechuga_pollo:150 g|curry:1 cda|yogur_natural:1/3 taza|cebolla:1/2 pieza|ajo:1 diente|arroz_integral:1/2 taza|aceite_oliva:1 cdita',
    ['Cuece el arroz integral.',
     'Dora el pollo en cubos; agrega cebolla y ajo.',
     'Añade el curry y 1/2 taza de agua; cocina 10 minutos.',
     'Retira del fuego, incorpora el yogur y sirve con el arroz.']),

  R('lomo_camote', 'Lomo de cerdo con camote al horno', ['comida'], 45, 480, 36, 40, 18,
    'cerdo_lomo:150 g|camote:1 pieza|ajo:2 dientes|oregano:1 cdita|aceite_oliva:1 cda',
    ['Sazona el lomo con ajo, orégano, sal y aceite.',
     'Corta el camote en gajos.',
     'Hornea ambos a 200 °C por 30–35 minutos, volteando a la mitad.']),

  R('pescado_empapelado', 'Pescado empapelado con verduras', ['comida', 'cena'], 25, 260, 32, 10, 9,
    'tilapia:150 g|jitomate:1 pieza|calabacita:1 pieza|pimiento:1/2 pieza|limon:1 pieza|oregano:1 pizca|aceite_oliva:1 cdita',
    ['Coloca el pescado sobre papel aluminio o para hornear.',
     'Cubre con verduras en rodajas, limón, orégano, aceite y sal.',
     'Cierra el paquete y hornea a 200 °C por 18 minutos.']),

  R('enfrijoladas', 'Enfrijoladas con queso fresco', ['comida', 'cena'], 20, 430, 20, 58, 13,
    'tortilla_maiz:3 piezas|frijol:1 taza|queso_fresco:40 g|cebolla:2 aros|aceite_vegetal:1 cdita',
    ['Licúa los frijoles con un poco de su caldo hasta tener una salsa espesa y caliéntala.',
     'Pasa las tortillas calientes por la salsa y dóblalas.',
     'Sirve con queso fresco desmoronado y cebolla.']),

  R('tofu_salteado', 'Tofu salteado con verduras', ['comida', 'cena'], 20, 330, 22, 16, 20,
    'tofu:150 g|brocoli:1 taza|pimiento:1/2 pieza|cebollin:2 cdas|jengibre:1 cdita|salsa_soya:1 cda|aceite_vegetal:1 cdita',
    ['Dora el tofu en cubos en el aceite hasta que esté crujiente.',
     'Agrega brócoli, pimiento y jengibre; saltea 5 minutos.',
     'Termina con salsa de soya y cebollín.']),

  // ───────────── CENAS ─────────────
  R('sopa_verduras', 'Sopa de verduras', ['cena', 'comida'], 30, 160, 5, 24, 5,
    'calabacita:1 pieza|zanahoria:1 pieza|ejote:1/2 taza|jitomate:1 pieza|cebolla:1/4 pieza|ajo:1 diente|caldo_verduras:3 tazas|aceite_oliva:1 cdita',
    ['Licúa jitomate, cebolla y ajo; sofríe en el aceite.',
     'Agrega el caldo y las verduras picadas.',
     'Cocina 15–20 minutos hasta que estén suaves.']),

  R('tostadas_pollo', 'Tostadas de pollo deshebrado', ['cena'], 15, 360, 30, 32, 11,
    'tostadas:2 piezas|pechuga_pollo:100 g|lechuga:1 taza|jitomate:1/2 pieza|queso_fresco:20 g|salsa_verde:2 cdas',
    ['Cuece y deshebra el pollo (o usa sobrante).',
     'Arma las tostadas con pollo, lechuga, jitomate y queso.',
     'Termina con salsa verde.']),

  R('ensalada_espinaca_fresa', 'Ensalada de espinaca, fresa y nuez', ['cena', 'comida'], 10, 280, 9, 16, 21,
    'espinaca:2 tazas|fresa:1/2 taza|nuez:2 cdas|queso_fresco:30 g|aceite_oliva:1 cda|vinagre:1 cdita',
    ['Lava la espinaca y rebana las fresas.',
     'Mezcla con nuez y queso desmoronado.',
     'Aliña con aceite, vinagre, sal y pimienta.']),

  R('quesadillas_champinon', 'Quesadillas de champiñón', ['cena'], 15, 400, 20, 40, 18,
    'tortilla_maiz:3 piezas|champinon:1 taza|queso_oaxaca:50 g|epazote:2 hojas|ajo:1 diente',
    ['Saltea los champiñones con ajo y epazote.',
     'Rellena las tortillas con queso y champiñones.',
     'Calienta en comal hasta que el queso se derrita.']),

  R('crema_calabacita', 'Crema de calabacita (sin crema)', ['cena'], 25, 170, 9, 18, 7,
    'calabacita:3 piezas|cebolla:1/4 pieza|ajo:1 diente|caldo_verduras:1 taza|leche_deslactosada:1/2 taza|aceite_oliva:1 cdita',
    ['Sofríe cebolla y ajo, agrega la calabacita en trozos y el caldo; cocina 12 minutos.',
     'Licúa con la leche hasta que quede terso.',
     'Calienta de nuevo y ajusta de sal.']),

  R('wrap_lechuga_pavo', 'Tacos de lechuga con pavo', ['cena', 'comida'], 15, 320, 28, 8, 20,
    'lechuga:6 hojas|pavo_molido:130 g|jitomate:1 pieza|aguacate:1/4 pieza|limon:1/2 pieza|comino:1 pizca|aceite_oliva:1 cdita',
    ['Cocina el pavo con comino, sal y aceite hasta que dore.',
     'Agrega el jitomate picado 2 minutos.',
     'Sirve en hojas de lechuga con aguacate y limón.']),

  R('salmon_esparragos', 'Salmón con espárragos', ['cena', 'comida'], 20, 430, 34, 6, 30,
    'salmon:150 g|esparrago:8 piezas|aceite_oliva:1 cdita|limon:1/2 pieza|sal:al gusto',
    ['Sazona el salmón con sal y pimienta.',
     'Cocínalo a la plancha 4 minutos por lado.',
     'En el mismo sartén saltea los espárragos 5 minutos; termina con limón.']),

  R('frittata_verduras', 'Frittata de verduras', ['cena', 'desayuno'], 20, 300, 22, 7, 20,
    'huevo:3 piezas|espinaca:1 taza|pimiento:1/2 pieza|cebollin:2 cdas|queso_panela:30 g|aceite_oliva:1 cdita',
    ['Saltea pimiento y espinaca en un sartén apto para horno.',
     'Vierte los huevos batidos con sal, cebollín y panela.',
     'Cocina a fuego bajo 5 minutos y termina en horno a 180 °C por 8 minutos.']),

  R('sandwich_atun', 'Sándwich integral de atún', ['cena', 'comida'], 10, 380, 30, 34, 12,
    'pan_integral:2 rebanadas|atun_lata:1 lata|yogur_griego:2 cdas|apio:1/2 tallo|lechuga:2 hojas|limon:1/2 pieza',
    ['Mezcla el atún con yogur, apio picado, limón, sal y pimienta.',
     'Arma el sándwich con lechuga.']),

  R('calabacitas_rellenas', 'Calabacitas rellenas de carne', ['cena', 'comida'], 35, 420, 30, 12, 28,
    'calabacita:2 piezas|carne_molida:120 g|jitomate:1 pieza|cebolla:1/4 pieza|queso_manchego:30 g',
    ['Parte las calabacitas a lo largo y retira la pulpa con una cuchara.',
     'Cocina la carne con cebolla, jitomate y la pulpa picada.',
     'Rellena, cubre con queso y hornea a 190 °C por 15 minutos.']),

  R('tacos_lechuga_camaron', 'Tacos de lechuga con camarón', ['cena'], 15, 280, 27, 10, 15,
    'lechuga:6 hojas|camaron:150 g|aguacate:1/4 pieza|limon:1 pieza|chile_polvo:1 pizca|col:1/2 taza|aceite_oliva:1 cdita',
    ['Saltea los camarones con aceite, chile en polvo y sal.',
     'Sirve en hojas de lechuga con col fileteada, aguacate y limón.']),

  R('ensalada_quinoa_edamame', 'Ensalada de quinoa y edamame', ['cena', 'comida'], 20, 390, 18, 45, 14,
    'quinoa:1/2 taza|edamame:1/2 taza|pepino:1/2 pieza|zanahoria:1 pieza|limon:1 pieza|aceite_oliva:1 cdita',
    ['Cuece la quinoa y deja enfriar.',
     'Cocina el edamame 4 minutos.',
     'Mezcla con pepino y zanahoria picados, limón, aceite y sal.']),

  R('sopa_lentejas_curry', 'Sopa de lentejas al curry', ['cena', 'comida'], 30, 330, 18, 48, 7,
    'lenteja:3/4 taza cocida|curry:1 cdita|zanahoria:1 pieza|jitomate:1 pieza|jengibre:1 cdita|caldo_verduras:2 tazas|aceite_oliva:1 cdita',
    ['Sofríe jengibre y curry en el aceite 1 minuto.',
     'Agrega jitomate y zanahoria picados, las lentejas y el caldo.',
     'Cocina 15 minutos y licúa la mitad para espesar.']),

  R('pollo_limon_ejotes', 'Pollo al limón con ejotes', ['cena', 'comida'], 25, 340, 36, 10, 17,
    'pechuga_pollo:150 g|ejote:1 1/2 tazas|limon:1 pieza|aceite_oliva:1 cda|oregano:1 pizca',
    ['Marina el pollo con limón, orégano, sal y la mitad del aceite.',
     'Cocina a la plancha 5–6 minutos por lado.',
     'Saltea los ejotes en el resto del aceite 6 minutos y sirve juntos.']),

  R('tofu_kale', 'Tofu crujiente con kale', ['cena'], 25, 310, 20, 12, 21,
    'tofu:150 g|kale:2 tazas|aceite_oliva:1 cda|paprika:1/2 cdita|limon:1/2 pieza',
    ['Corta el tofu en cubos, mézclalo con la mitad del aceite, paprika y sal.',
     'Hornea a 200 °C por 20 minutos, volteando a la mitad.',
     'Saltea el kale con el resto del aceite y limón; sirve con el tofu.']),

  R('nopales_panela', 'Nopales asados con panela', ['cena'], 15, 230, 16, 10, 14,
    'nopal:3 piezas|queso_panela:80 g|salsa_verde:3 cdas|aceite_oliva:1 cdita',
    ['Asa los nopales en comal con unas gotas de aceite hasta que cambien de color.',
     'Asa el panela en rebanadas 1 minuto por lado.',
     'Sirve con salsa verde.']),
];

export const RECIPES = [...BASE_RECIPES, ...EXTRA_RECIPES];

export const RECIPE_BY_ID = Object.fromEntries(RECIPES.map((r) => [r.id, r]));
