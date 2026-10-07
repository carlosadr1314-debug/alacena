// ── Configuración general de la app ──

// Nombre provisional. Cámbialo aquí (y en index.html <title> y manifest.webmanifest).
export const APP_NAME = 'Alacena';

// URL de tu Cloudflare Worker (ver worker/worker.js y el README).
// Ejemplo: 'https://alacena-ia.tu-cuenta.workers.dev'
// Vacío = la IA aparece como "no configurada".
export const AI_ENDPOINT = '';

// Límite de usos de IA por dispositivo al día (recetas + escaneos).
// Cuida tu cuota gratuita de Gemini durante las pruebas.
export const AI_DAILY_LIMIT = 20;

// ── Módulos Pro ──
// enforce: false → beta: todo desbloqueado para todos (se muestra la etiqueta PRO).
// enforce: true  → los módulos de la lista requieren plan Pro.
export const PREMIUM = {
  enforce: false,
  price: '$59 MXN/mes', // precio de referencia que se muestra en la pantalla Pro
  features: ['ai', 'scan', 'weekPlan', 'weekShopping', 'streakFreeze', 'nutrition', 'family', 'customDiet'],
};
