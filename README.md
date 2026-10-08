# Alacena (nombre provisional)

> **¿Primera vez?** Sigue [GUIA-PUESTA-EN-MARCHA.md](GUIA-PUESTA-EN-MARCHA.md) paso a paso.

App web pensada para teléfono que te ayuda a seguir una dieta cocinando con lo que ya tienes en casa.

- **12 dietas con respaldo científico**: Mediterránea, DASH, Keto, Vegetariana/Vegana, Flexitariana, Nórdica, Portfolio, MIND, Baja en calorías, Baja en FODMAP, Ayuno intermitente y Plato del Bien Comer.
- **Despensa**: el usuario registra lo que tiene en refrigerador, alacena y congelador.
- **Recetas**: 274 recetas integradas en español (al menos 40 por tiempo de comida en cada dieta). Se filtran solas según la dieta y se ordenan por lo que ya tienes.
- **Plan semanal**: 7 días de recetas y una lista del súper con lo que falta.
- **IA**: crea recetas nuevas con Google Gemini a través de un proxy gratuito en Cloudflare que guarda tu key.
- **Módulos Pro** listos para cobrar más adelante (IA, escaneo con foto, plan de 7 días, lista semanal, protector de racha, calorías y macros, plan familiar); durante la beta están desbloqueados.
- **Estilo Duolingo**: ruta del día, reto diario, vasos de agua, racha, XP y niveles, 12 logros y la mascota *Valita* (tócala y te da consejos).
- **Dietas propias** y **sugerencias de dietas** de los usuarios (se guardan en Cloudflare KV; las revisas en `/sugerencias?token=…`).
- **Instalable (PWA)** y funciona sin internet, excepto la IA.

Está hecha con HTML, CSS y JavaScript vainilla: sin frameworks, sin build y sin servidor. Los datos se guardan en el dispositivo del usuario (localStorage).

---

## Probar en tu computadora

Los módulos de JavaScript no cargan si abres el archivo con doble clic (`file://`). Hay que usar un servidor local:

```bash
cd alacena
python3 -m http.server 8080
# abre http://localhost:8080
```

Para verla como en el teléfono, abre las herramientas de desarrollador del navegador (F12) y activa la vista de dispositivo móvil.

## Publicar en GitHub Pages (gratis)

1. Crea un repositorio nuevo en GitHub, por ejemplo `alacena`.
2. Sube todos los archivos de esta carpeta a la raíz del repositorio:
   ```bash
   git init
   git add .
   git commit -m "Primera versión"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/alacena.git
   git push -u origin main
   ```
3. En el repositorio entra a **Settings → Pages**.
4. En **Source** elige *Deploy from a branch*, rama `main` y carpeta `/ (root)`. Guarda.
5. En 1 o 2 minutos queda publicada en `https://TU_USUARIO.github.io/alacena/`.
6. Abre ese link en tu teléfono. En Chrome (Android) usa el menú → *Instalar app*; en Safari (iPhone) usa Compartir → *Agregar a inicio*.

Cada vez que hagas cambios, súbelos con `git push` y **sube la versión en `sw.js`** (`alacena-v1` → `alacena-v2`) para que los teléfonos descarguen la versión nueva.

> El archivo `.nojekyll` ya va incluido para que GitHub Pages sirva los archivos tal cual.

## IA con tu propia key (gratis, sin que el usuario configure nada)

Tu API key de Gemini **no va en el código** (GitHub Pages es público y cualquiera podría copiarla; además, Google puede desactivar keys que detecta publicadas). La app llama a un **Cloudflare Worker** que guarda la key como secreto. El plan gratuito de Cloudflare incluye 100,000 solicitudes al día.

### 1. Saca tu key de Gemini
Entra a <https://aistudio.google.com/apikey> → **Create API key**. No pide tarjeta.

### 2. Crea el Worker (unos 5 minutos, desde el navegador)
1. Crea una cuenta gratis en <https://dash.cloudflare.com>.
2. Ve a **Workers & Pages → Create → Create Worker**. Ponle de nombre `alacena-ia` y da clic en **Deploy**.
3. Da clic en **Edit code**, borra lo que trae, pega todo el contenido de `worker/worker.js` y da clic en **Deploy**.
4. Ve a **Settings → Variables and Secrets** y agrega:
   | Nombre | Tipo | Valor |
   |---|---|---|
   | `GEMINI_API_KEY` | Secret | tu key de Gemini |
   | `ALLOWED_ORIGINS` | Text | `https://TU_USUARIO.github.io,http://localhost:8080` |
   | `GEMINI_MODEL` | Text (opcional) | p. ej. `gemini-flash-latest` |
5. Copia la URL del Worker (algo como `https://alacena-ia.tu-cuenta.workers.dev`).

### 3. Conéctalo a la app
En `js/config.js` pega la URL:
```js
export const AI_ENDPOINT = 'https://alacena-ia.tu-cuenta.workers.dev';
```
Sube el cambio a GitHub. En la app, ve a **Perfil → Herramientas de prueba → Probar** para confirmar la conexión.

**Por qué es seguro:** el Worker solo atiende peticiones desde los dominios de `ALLOWED_ORIGINS`, y él mismo arma el prompt (la app solo le manda dieta, despensa y tiempo de comida). Así nadie puede usar tu key para otra cosa. Para más protección, en Cloudflare puedes agregar una regla gratuita de *Rate limiting*.

## Módulos Pro

En `js/config.js`:

```js
export const PREMIUM = {
  enforce: false,          // beta: todo desbloqueado
  price: '$59 MXN/mes',
  features: ['ai', 'weekPlan', 'weekShopping'],
};
```

| Módulo | Gratis | Pro |
|---|---|---|
| Recetas con IA (`ai`) | — | Sí (límite diario por dispositivo en `AI_DAILY_LIMIT`) |
| Escanear despensa con foto (`scan`) | — | Sí |
| Plan (`weekPlan`) | Solo hoy | 7 días |
| Lista del súper (`weekShopping`) | Solo lo de hoy | Toda la semana |
| Protector de racha (`streakFreeze`) | — | 2 al mes, se usan solos |
| Calorías y macros (`nutrition`) | — | Meta diaria, macros por dieta y gráfica semanal |
| Plan familiar (`family`) | — | Hasta 8 personas con su dieta; recetas que sirvan a todos |
| Dietas propias (`customDiet`) | 1 dieta, hasta 3 restricciones | Hasta 5 dietas, todas las restricciones, ingredientes a evitar y calorías por comida |

- Con `enforce: false` todos usan todo y ven la etiqueta **PRO · gratis en beta**.
- En **Perfil → Herramientas de prueba → Simular cuenta gratuita** ves cómo se verá la app con los módulos bloqueados.
- Cuando actives los cobros: cambia `enforce` a `true`, conecta el pago (Stripe o Mercado Pago) para que llame a `setPro(true)` en `js/premium.js` y valida el plan dentro del Worker antes de llamar a la IA. El comentario en `worker/worker.js` marca dónde hacerlo.

## Estructura

```
index.html              Página única
manifest.webmanifest    Datos para instalar como app
sw.js                   Service worker (modo sin internet)
css/styles.css          Diseño (variables de color y tipografía al inicio)
js/config.js            Nombre de la app
js/app.js               Interfaz: pantallas y eventos
js/engine.js            Motor: compatibilidad con dieta, coincidencias, plan semanal
js/game.js              XP, niveles, racha y logros
js/ai.js                Conexión con la IA (vía Worker)
js/premium.js           Módulos Pro y candados
js/store.js             Guardado local
js/icons.js             Íconos SVG y la mascota Valita
js/data/diets.js        Las 12 dietas y sus reglas
js/data/ingredients.js  Catálogo de ingredientes con sus características
js/data/recipes.js      Recetario integrado
assets/                 Íconos de la app
worker/worker.js        Proxy de IA para Cloudflare (guarda tu key)
```

## Cómo funciona el filtro por dieta

Cada ingrediente tiene **banderas** (`carb`, `meat`, `dairy`, `fodmap`, `sodium`…) y cada dieta tiene una lista de banderas **excluidas**. Por ejemplo, Keto excluye `carb` y `sugar`. Una receta aparece en una dieta solo si ninguno de sus ingredientes tiene una bandera excluida. Así, una receta nueva queda clasificada en las 12 dietas sin hacer nada extra.

### Agregar una receta

En `js/data/recipes.js`:

```js
R('id_unico', 'Nombre', ['comida', 'cena'], 20 /*min*/, 380 /*kcal*/, 30 /*prot*/, 20 /*carbs*/, 15 /*grasa*/,
  'pechuga_pollo:150 g|brocoli:1 taza|aceite_oliva:1 cdita',
  ['Paso 1', 'Paso 2']),
```

Los ids de ingredientes deben existir en `js/data/ingredients.js`.

## Cambiar el nombre de la app

Edita `js/config.js`, el `<title>` de `index.html` y `name`/`short_name` en `manifest.webmanifest`.

## Siguiente paso: app de teléfono

La lógica (`engine.js`, `game.js`, `ai.js`, `data/`) no depende del navegador, así que se puede reutilizar casi tal cual en React Native + Expo. Lo que cambia:

- `store.js` → AsyncStorage
- `app.js` y `styles.css` → componentes de React Native
- El mismo Worker sirve para la app móvil.

---

Esta app da información general y no sustituye la consulta con un médico o nutriólogo.
