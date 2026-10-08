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
//   ADMIN_TOKEN      (Secret)  Contraseña larga para ver las sugerencias de dietas
// Binding opcional:
//   SUGGESTIONS      (KV namespace) donde se guardan las dietas que sugieren los usuarios
//   Para verlas: https://TU-WORKER.workers.dev/sugerencias?token=TU_ADMIN_TOKEN
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
    if (!res.ok) {
      // Se ve en Cloudflare → tu Worker → Observability / Logs (nunca incluye la key).
      const detail = (await res.text().catch(() => '')).slice(0, 600);
      console.log('Gemini error', model, res.status, detail);
      const bad = /API_KEY_INVALID|API key not valid|API key expired/i.test(detail);
      const region = /location is not supported|not available in your country/i.test(detail);
      const code = bad ? 'BAD_KEY' : region ? 'REGION' : 'UPSTREAM_' + res.status;
      return { error: code, status: 502 };
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
    return { text };
  }
  return { error: 'MODEL_NOT_FOUND', status: 502 };
}

const escHtml = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Página privada para revisar las sugerencias (solo con ADMIN_TOKEN)
async function listSuggestions(request, env) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token') || '';
  if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) return new Response('No autorizado', { status: 401 });
  if (!env.SUGGESTIONS) return new Response('Falta conectar el KV "SUGGESTIONS" al Worker.', { status: 500 });
  const items = [];
  let cursor;
  do {
    const page = await env.SUGGESTIONS.list({ prefix: 'sug:', cursor, limit: 1000 });
    for (const k of page.keys) {
      const v = await env.SUGGESTIONS.get(k.name, 'json');
      if (v) items.push(v);
    }
    cursor = page.list_complete ? null : page.cursor;
  } while (cursor && items.length < 2000);
  items.sort((a, b) => String(b.receivedAt).localeCompare(String(a.receivedAt)));
  if (url.searchParams.get('format') === 'json') {
    return new Response(JSON.stringify(items, null, 2), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  }
  // Agrupa por nombre para ver cuáles piden más
  const counts = {};
  for (const it of items) {
    const k = String(it.name || '').trim().toLowerCase();
    counts[k] = (counts[k] || 0) + 1;
  }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 15);
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sugerencias de dietas</title>
<style>body{font-family:system-ui,sans-serif;margin:0;padding:16px;background:#FFFDF7;color:#22302A}h1{font-size:22px}
table{border-collapse:collapse;width:100%;font-size:14px;background:#fff}th,td{border:1px solid #E8E2D3;padding:8px;text-align:left;vertical-align:top}
th{background:#F6F2E8}.wrap{overflow-x:auto}.chip{display:inline-block;background:#FFF1E6;color:#B03A06;border-radius:99px;padding:2px 10px;margin:2px;font-weight:700}</style>
<h1>Sugerencias de dietas (${items.length})</h1>
<p>Más pedidas: ${top.map(([n, c]) => `<span class="chip">${escHtml(n)} · ${c}</span>`).join(' ') || '—'}</p>
<div class="wrap"><table><tr><th>Fecha</th><th>Dieta sugerida</th><th>¿Por qué?</th><th>Fuente</th><th>Dieta actual</th></tr>
${items.map((i) => `<tr><td>${escHtml(String(i.receivedAt).slice(0, 16).replace('T', ' '))}</td><td><b>${escHtml(i.name)}</b></td><td>${escHtml(i.why)}</td><td>${escHtml(i.source)}</td><td>${escHtml(i.currentDiet)}</td></tr>`).join('')}
</table></div><p><a href="?token=${encodeURIComponent(token)}&format=json">Descargar JSON</a></p>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}

export default {
  async fetch(request, env) {
    if (request.method === 'GET' && new URL(request.url).pathname.replace(/\/$/, '') === '/sugerencias') {
      return listSuggestions(request, env);
    }
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

    if (body.action === 'suggest') {
      if (!env.SUGGESTIONS) return json({ error: 'NO_STORAGE' }, 500, origin);
      const sg = body.suggestion || {};
      const item = {
        name: clip(sg.name, 60),
        why: clip(sg.why, 400),
        source: clip(sg.source, 200),
        currentDiet: clip(sg.currentDiet, 60),
        clientId: clip(sg.id, 40),
        receivedAt: new Date().toISOString(),
      };
      if (!item.name) return json({ error: 'BAD_REQUEST' }, 400, origin);
      await env.SUGGESTIONS.put(`sug:${item.receivedAt}:${crypto.randomUUID().slice(0, 8)}`, JSON.stringify(item));
      return json({ ok: true }, 200, origin);
    }

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
