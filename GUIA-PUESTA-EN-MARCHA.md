# Guía de puesta en marcha (antes de la fase de pruebas)

Tiempo total estimado la primera vez: **45 a 60 minutos**. Todo se hace desde el navegador y no hay que programar nada.

Al terminar vas a tener:

1. La app publicada en `https://TU_USUARIO.github.io/alacena/`.
2. Tu API key de Gemini guardada en Cloudflare, nunca en el código.
3. La IA (recetas y escaneo con foto) funcionando para todos los que prueben la app.

---

## Fase 0 · Cuentas que necesitas (gratis)

| Servicio | Para qué | Link |
|---|---|---|
| GitHub | Guardar el código y publicar la app | <https://github.com/signup> |
| Google (AI Studio) | Tu API key de Gemini | <https://aistudio.google.com> |
| Cloudflare | El Worker que guarda la key | <https://dash.cloudflare.com/sign-up> |

> **No actives facturación en Google** durante las pruebas. Sin facturación, Google no te puede cobrar: si se acaba la cuota gratis, la IA solo dirá "muchas solicitudes" hasta el día siguiente.

---

## Fase 1 · Publicar la app en GitHub Pages (10 min)

1. Descomprime `alacena-app.zip`.
2. En GitHub da clic en **+ → New repository**.
   - Nombre: `alacena`
   - Visibilidad: **Public** (GitHub Pages gratis lo requiere)
   - Da clic en **Create repository**.
3. En la página del repositorio da clic en **uploading an existing file**.
4. Arrastra **el contenido** de la carpeta `alacena` (index.html, css, js, assets, worker, etc.), no la carpeta misma.
   - Revisa que también suba `.nojekyll`. Si tu sistema oculta los archivos que empiezan con punto, créalo después con **Add file → Create new file**, nombre `.nojekyll`, vacío.
5. Da clic en **Commit changes**.
6. Ve a **Settings → Pages**:
   - Source: **Deploy from a branch**
   - Branch: `main` / `/ (root)` → **Save**
7. Espera 1 o 2 minutos y recarga. Arriba aparece el link de tu app. Ábrelo.

**Cómo comprobarlo:** la app abre y puedes completar el registro inicial. La IA dirá "está por llegar", y es normal en este punto.

**Anota tu dominio:** `https://TU_USUARIO.github.io` (sin `/alacena` y sin `/` al final). Lo vas a usar en la Fase 3.

---

## Fase 2 · Sacar tu API key de Gemini (5 min)

1. Entra a <https://aistudio.google.com/apikey> con tu cuenta de Google.
2. Da clic en **Create API key**. Si te pide proyecto, elige *Create API key in new project*.
3. Copia la key (empieza con `AIza…`) y guárdala en un lugar seguro, como un gestor de contraseñas.

> **Nunca** pegues la key en ningún archivo del repositorio. Si por error la subes, bórrala en AI Studio y crea otra.

---

## Fase 3 · Crear el Worker de Cloudflare (15 min)

1. Entra a <https://dash.cloudflare.com> → **Workers & Pages** → **Create** → **Create Worker** (plantilla "Hello World").
2. Nombre: `alacena-ia` → **Deploy**.
3. Da clic en **Edit code**. Borra todo, pega el contenido completo de `worker/worker.js` y da clic en **Deploy**.
4. Regresa al Worker → **Settings → Variables and Secrets → Add**:

   | Tipo | Nombre | Valor |
   |---|---|---|
   | **Secret** | `GEMINI_API_KEY` | tu key `AIza…` |
   | Text | `ALLOWED_ORIGINS` | `https://TU_USUARIO.github.io,http://localhost:8080` |
   | Text (opcional) | `GEMINI_MODEL` | déjalo vacío al inicio |

   Guarda y, si te lo pide, da clic en **Deploy** otra vez.
5. Copia la URL del Worker, que aparece arriba: `https://alacena-ia.TU-CUENTA.workers.dev`.

**Cómo comprobarlo:** abre esa URL en el navegador. Debe decir **"Origen no permitido"**. Eso significa que está vivo y que rechaza a quien no sea tu app.

---

## Fase 4 · Conectar la app con el Worker (5 min)

1. En GitHub abre `js/config.js` → ícono de lápiz (**Edit**).
2. Cambia la línea:
   ```js
   export const AI_ENDPOINT = '';
   ```
   por:
   ```js
   export const AI_ENDPOINT = 'https://alacena-ia.TU-CUENTA.workers.dev';
   ```
3. **Commit changes**.
4. Abre `sw.js` y cambia `alacena-v3` por `alacena-v4`. Haz esto **cada vez que publiques cambios**, para que los teléfonos bajen la versión nueva.
5. Espera 1 o 2 minutos, abre la app y recarga.
6. Ve a **Perfil → Herramientas de prueba → Inteligencia artificial → Probar**.
   - "¡Conexión exitosa!" → listo.
   - Si sale un error, revisa la tabla de problemas al final.

---

## Fase 5 · Protección extra (opcional, recomendado antes de compartir con mucha gente)

El Worker ya trae tres protecciones:

- Solo acepta peticiones desde tu dominio.
- Arma él mismo el prompt, así que nadie puede usarlo como un chat gratis.
- Tiene un límite básico de 8 solicitudes por minuto por IP.

La app, además, limita a 20 usos de IA por teléfono al día. Ese número se cambia en `AI_DAILY_LIMIT`, dentro de `js/config.js`.

El límite por IP que trae el Worker vive en memoria y se reinicia cuando Cloudflare recicla el Worker. Para uno confiable usa el *Rate Limiting binding* de Cloudflare. Requiere instalar la herramienta `wrangler` en tu computadora:

```bash
npm install -g wrangler
wrangler login
```

Crea `wrangler.toml` dentro de la carpeta `worker/`:

```toml
name = "alacena-ia"
main = "worker.js"
compatibility_date = "2026-10-01"

[[ratelimits]]
name = "RATE_LIMITER"
namespace_id = "1001"
[ratelimits.simple]
limit = 8
period = 60
```

Y publica con `wrangler deploy`. El código del Worker detecta `RATE_LIMITER` solo. Las variables que ya configuraste en el panel se conservan.

---

## Fase 6 · Lista de pruebas antes de invitar gente

Hazlas en tu teléfono, con el link de GitHub Pages.

- [ ] Instalar la app: en Chrome, menú → *Instalar app*; en iPhone, Compartir → *Agregar a inicio*.
- [ ] Completar el registro con una dieta distinta a la tuya.
- [ ] Despensa: agregar 10 ingredientes, quitar uno y agregar uno "propio".
- [ ] **Escanear con foto** tu refri real. Revisa que reconozca bien y desmarca lo incorrecto.
- [ ] Hoy: cocinar una receta → celebración, XP y racha 1.
- [ ] **Calorías y macros**: que sumen lo de la receta. Cambiar la meta en Perfil.
- [ ] Recetas: filtro "Solo lo que puedo cocinar ya".
- [ ] **Recetas con IA**: crear 3, abrir una, guardarla en el recetario y cocinarla (logro "Chef con IA").
- [ ] Revisar si alguna receta de IA sale con la etiqueta **Revisar**. Así se marca cuando la IA mete un ingrediente que tu dieta evita.
- [ ] **Plan de 7 días**: generarlo, cambiar una receta y ver la lista del súper.
- [ ] Marcar 3 cosas como compradas → "Pasar a mi despensa".
- [ ] **Plan familiar**: agregar a alguien con otra dieta, activar el modo y generar un plan nuevo.
- [ ] **Protector de racha**: mañana no registres nada; pasado mañana abre la app y la racha debe seguir, con un escudo en el calendario.
- [ ] Perfil → **Simular cuenta gratuita**: revisar que los módulos Pro se vean con candado.
- [ ] Modo avión: la app debe abrir y el recetario funcionar. La IA debe dar un mensaje claro.

---

## Problemas comunes

| Mensaje en la app | Causa | Solución |
|---|---|---|
| "La IA todavía no está configurada" | `AI_ENDPOINT` vacío o no se actualizó | Revisa la Fase 4 y sube la versión en `sw.js` |
| "El servidor de IA no reconoce esta dirección" | Tu dominio no está en `ALLOWED_ORIGINS` | Debe ser exactamente `https://TU_USUARIO.github.io`, sin `/` al final |
| "Falta la API key en el servidor" | No se guardó `GEMINI_API_KEY` | Agrégala como **Secret** y vuelve a hacer Deploy |
| "El modelo de IA no está disponible" | Google retiró o renombró el modelo | En Cloudflare pon `GEMINI_MODEL` con un modelo vigente ([lista](https://ai.google.dev/gemini-api/docs/models)) |
| "Muchas solicitudes" | Se acabó la cuota gratis o el límite por minuto | Espera. Si pasa seguido, revisa tu cuota en AI Studio |
| No veo los cambios que subí | El teléfono guardó la versión anterior | Sube la versión en `sw.js` y cierra y abre la app |

---

## Qué revisar una vez por semana durante las pruebas

- **AI Studio → Usage / Rate limits**: cuánto de la cuota gratis se usa al día.
- **Cloudflare → tu Worker → Metrics**: solicitudes y errores.
- Comentarios de los testers: sobre todo recetas de IA raras o calorías que no cuadran.
