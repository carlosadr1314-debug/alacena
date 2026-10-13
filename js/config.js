// ── Configuración general de la app ──

// Nombre provisional. Cámbialo aquí (y en index.html <title> y manifest.webmanifest).
export const APP_NAME = 'Valita';

// URL de tu Cloudflare Worker (ver worker/worker.js y el README).
// Ejemplo: 'https://tu-worker.tu-cuenta.workers.dev'
// Vacío = la IA aparece como "no configurada".
export const AI_ENDPOINT = 'https://alacena.carlosadr1314.workers.dev';

// Límite de usos de IA por dispositivo al día (recetas + escaneos).
// Cuida tu cuota gratuita de Gemini durante las pruebas.
export const AI_DAILY_LIMIT = 20;

// Correo de contacto que aparece en Términos y privacidad (déjalo vacío si aún no tienes)
export const CONTACT_EMAIL = '';

// ── Módulos Pro ──
// enforce: false → beta: todo desbloqueado para todos (se muestra la etiqueta PRO).
// enforce: true  → los módulos de la lista requieren plan Pro.
export const PREMIUM = {
  enforce: false,
  price: '$59 MXN/mes', // precio de referencia que se muestra en la pantalla Pro
  features: ['ai', 'scan', 'weekPlan', 'weekShopping', 'streakFreeze', 'nutrition', 'family', 'customDiet'],
};

// Módulos apagados por ahora (no se muestran ni se usan). Quita 'family' de la lista para reactivar el plan familiar.
export const HIDDEN_FEATURES = ['family'];
