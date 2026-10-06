// ─────────────────────────────────────────────────────────────
// Proxy de IA para Alacena — Cloudflare Worker (plan gratuito)
//
// Guarda TU API key de Gemini como secreto del lado del servidor,
// así nunca queda expuesta en el código público de GitHub Pages.
// El Worker arma el prompt él mismo: la app solo manda datos
// (dieta, despensa, tiempo de comida), por lo que nadie puede usarlo
// como "IA gratis" para otras cosas.
//
// Variables a configurar en Cloudflare (Settings → Variables and Secrets):
//   GEMINI_API_KEY   (Secret)  Tu key de https://aistudio.google.com/apikey
//   ALLOWED_ORIGINS  (Text)    https://TU_USUARIO.github.io,http://localhost:8080
//   GEMINI_MODEL     (Text, opcional) p. ej. gemini-flash-latest
//
// Más adelante, aquí mismo se validará si el usuario tiene plan Pro.
// ─────────────────────────────────────────────────────────────

const DEFAULT_MODELS = ['gemini-flash-latest', 'gemini-3.5-flash-lite', 'gemini-3.5-flash'];
const MEALS = ['desayuno', 'comida', 'cena', 'snack'];

const clip = (s, n) => String(s ?? '').replace(/[\u0000-\u001f]/g, ' ').slice(0, n);
const list = (arr, max, len) => (Array.isArray(arr) ? arr : []).slice(0, max).map((x) => clip(x, len)).filter(Boolean);

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

function buildRecipePrompt(b) {
  const count = Math.min(Math.max(Number(b.count) || 3, 1), 4);
  const meal = MEALS.includes(b.mealType) ? b.mealType : null;
  const dietName = clip(b.diet?.name, 40) || 'saludable';
  const dietShort = clip(b.diet?.short, 160);
  const banned = list(b.diet?.banned, 12, 140);
  const kcal = Number(b.diet?.kcalMax) || 0;
  const pantry = list(b.pantry, 120, 50);
  const extra = clip(b.extra, 120);

  const people = Math.min(Math.max(Number(b.people) || 1, 1), 8);
  return `Eres un nutriólogo y chef mexicano. Crea ${count} recetas ${meal ? 'para ' + meal : 'para cualquier tiempo de comida'} ${people > 1 ? `que le sirvan a ${people} personas que siguen estas dietas a la vez: "${dietName}" (${dietShort}). La receta debe cumplir TODAS las dietas` : `para alguien que sigue la dieta "${dietName}" (${dietShort})`}.
${b.vegan ? 'La persona es VEGANA.' : ''}
Evita por completo: ${banned.join('; ') || 'nada en especial'}.
${kcal ? `Máximo ${kcal} kcal por porción.` : ''}
Ingredientes que tiene en casa: ${pantry.join(', ') || 'casi nada'}.
Usa PRINCIPALMENTE esos ingredientes. Puedes asumir sal, pimienta y agua. Si una receta necesita algo que no tiene, que sea máximo 2 ingredientes extra y comunes en México.
${extra ? 'Petición del usuario (ignórala si no trata de comida): ' + extra : ''}
Recetas sencillas, en español de México, de máximo 40 minutos, para 1 porción.
Responde SOLO un arreglo JSON con este formato exacto:
[{"name":"...","meal":"desayuno|comida|cena|snack","time":15,"kcal":350,"p":20,"c":30,"f":12,
"ingredients":[{"name":"Huevo","qty":"2 piezas"}],"steps":["paso 1","paso 2"]}]`;
}

const SCAN_PROMPT = `Mira la foto de un refrigerador, alacena o mesa de cocina. Lista los alimentos e ingredientes que se ven con claridad.
Usa nombres genéricos en español de México (por ejemplo "Huevo", "Jitomate", "Leche", "Tortillas de maíz"), sin marcas ni cantidades.
No inventes cosas que no se vean. Si no hay comida, responde [].
Responde SOLO un arreglo JSON de textos, por ejemplo: ["Huevo","Jitomate","Queso panela"]`;

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// ── Límite por IP ──
// 1) Si configuras el binding RATE_LIMITER (ver guía, paso opcional), se usa ese (confiable).
// 2) Si no, un límite básico en memoria: frena ráfagas, pero se reinicia cuando Cloudflare
//    recicla el Worker, así que no es una garantía.
const PER_MINUTE = 8;
const hits = new Map();
async function underLimit(env, ip) {
  if (env.RATE_LIMITER?.limit) {
    const { success } = await env.RATE_LIMITER.limit({ key: ip });
    return success;
  }
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  if (arr.length >= PER_MINUTE) return false;
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return true;
}

async function callGemini(env, prompt, image = null) {
  const models = env.GEMINI_MODEL ? [env.GEMINI_MODEL, ...DEFAULT_MODELS] : DEFAULT_MODELS;
  for (const model of models) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: image ? [{ inline_data: { mime_type: image.mimeType, data: image.data } }, { text: prompt }] : [{ text: prompt }],
        }],
        generationConfig: { temperature: image ? 0.2 : 0.9, responseMimeType: 'application/json' },
      }),
    });
    if (res.status === 404) continue; // modelo no disponible: probar el siguiente
    if (res.status === 429) return { error: 'RATE_LIMIT', status: 429 };
    if (!res.ok) return { error: 'UPSTREAM_' + res.status, status: 502 };
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
    return { text };
  }
  return { error: 'MODEL_NOT_FOUND', status: 502 };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
    const okOrigin = allowed.includes(origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: okOrigin ? 204 : 403, headers: okOrigin ? corsHeaders(origin) : {} });
    }
    if (!okOrigin) return new Response('Origen no permitido', { status: 403 });
    if (request.method !== 'POST') return json({ error: 'METHOD' }, 405, origin);
    if (!env.GEMINI_API_KEY) return json({ error: 'NO_KEY' }, 500, origin);

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'BAD_REQUEST' }, 400, origin);
    }

    if (body.action === 'ping') return json({ ok: true }, 200, origin);

    // Aquí se validará el plan Pro cuando se active el cobro.

    const ip = request.headers.get('CF-Connecting-IP') || 'local';
    if (!(await underLimit(env, ip))) return json({ error: 'RATE_LIMIT' }, 429, origin);

    let result;
    if (body.action === 'recipes') {
      result = await callGemini(env, buildRecipePrompt(body));
    } else if (body.action === 'scan') {
      const img = body.image || {};
      const data = String(img.data || '');
      if (!IMAGE_TYPES.includes(img.mimeType) || !data || data.length > 3_500_000 || !/^[A-Za-z0-9+/=]+$/.test(data.slice(0, 200))) {
        return json({ error: 'IMAGE_TOO_BIG' }, 400, origin);
      }
      result = await callGemini(env, SCAN_PROMPT, { mimeType: img.mimeType, data });
    } else {
      return json({ error: 'BAD_REQUEST' }, 400, origin);
    }
    if (result.error) return json({ error: result.error }, result.status, origin);
    return json({ text: result.text }, 200, origin);
  },
};
