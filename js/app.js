// Interfaz principal. HTML/CSS/JS vainilla, sin frameworks ni build.

import { APP_NAME, CONTACT_EMAIL } from './config.js';
import { getState, update, subscribe, resetState, today, addDays, parseDate } from './store.js';
import { DIETS, EVIDENCE_LABEL, getDiet, CUSTOM_RULES, CUSTOM_LIMITS, customDiets } from './data/diets.js';
import { INGREDIENTS, ING, CATEGORIES, LOCATIONS, QUICK_PICKS, norm } from './data/ingredients.js';
import {
  getSlots, rankRecipes, findRecipe, matchInfo, hasIngredient, ingredientName, generatePlan,
  alternativeFor, shoppingFromPlan, fastingStatus, registerDraft, familyActive, planningProfiles,
} from './engine.js';
import {
  logMeal, undoMeal, todayLog, currentStreak, streakDoneToday, levelFromXp, levelTitle,
  ACHIEVEMENTS, refreshAchievements, cookedCount, lastWeek, XP,
  applyStreakFreezes, macroTargets, dayTotals, weekTotals, FREEZES_PER_MONTH,
  todayChallenge, waterToday, setWater, WATER_GOAL,
} from './game.js';
import { aiConfigured, generateRecipes, aiErrorMessage, pingAI, aiUsesLeft, compressImage, scanPantry, sendSuggestion } from './ai.js';
import { canUse, isProFeature, isOpenBeta, PRO_FEATURES } from './premium.js';
import { PREMIUM } from './config.js';
import { icon, mascot, MEAL_ICON } from './icons.js';

const $app = document.getElementById('app');

// Estado de interfaz (no se guarda)
const ui = {
  tab: 'hoy',
  ob: { step: 0, name: '', diet: null, vegan: false, mealsPerDay: 3, fastStart: '12:00', fastHours: 8, pantry: new Set(), dietOpen: null, nameError: '' },
  recipes: { meal: null, onlyReady: false, query: '' },
  pantry: { loc: 'all', query: '', view: 'tengo' },
  planDay: null,
  planView: 'dias',
  ai: { loading: false, error: '', results: [], controller: null, extra: '' },
  scan: { loading: false, error: '', items: [], picked: new Set(), preview: '', controller: null },
  famForm: { name: '', diet: 'mediterranea', vegan: false, error: '' },
  dietForm: null,
  sugForm: { name: '', why: '', source: '', error: '', sending: false },
  tip: null,
  installEvt: null,
};

// ── Utilidades ──
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const S = () => getState();

// Etiqueta PRO (en beta indica que es gratis por ahora)
function proBadge(feature, extraCls = '') {
  if (!isProFeature(feature)) return '';
  const locked = !canUse(feature);
  return `<span class="badge pro ${extraCls}">${locked ? icon('lock', 'icon-xs') : ''}PRO${isOpenBeta() ? ' · gratis en beta' : ''}</span>`;
}
const DAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DAY_LONG = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function toast(msg) {
  document.querySelector('.toast')?.remove();
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function dietIconText(d) {
  const map = { mediterranea: 'Me', dash: 'DA', keto: 'K', vegetariana: 'Ve', flexitariana: 'Fx', nordica: 'Nó', portfolio: 'Po', mind: 'Mi', bajacal: 'Bc', fodmap: 'Fo', ayuno: 'Ay', biencomer: 'BC' };
  return map[d.id] || (d.name || '?').trim().slice(0, 2);
}

// ═════════════════════════ RENDER PRINCIPAL ═════════════════════════
function render() {
  const s = S();
  document.title = APP_NAME;
  if (!s.onboarded) return renderOnboarding();
  $app.innerHTML = topbar() + `<main id="main" class="screen">${screen()}</main>` + bottomnav();
}

function screen() {
  switch (ui.tab) {
    case 'despensa': return pantryScreen();
    case 'recetas': return recipesScreen();
    case 'plan': return planScreen();
    case 'perfil': return profileScreen();
    default: return todayScreen();
  }
}

function rerenderMain() {
  const main = document.getElementById('main');
  if (!main) return render();
  main.innerHTML = screen();
  const tb = document.querySelector('.topbar');
  if (tb) tb.outerHTML = topbar();
  const nav = document.querySelector('.bottomnav');
  if (nav) nav.outerHTML = bottomnav();
}

function topbar() {
  const s = S();
  const diet = getDiet(s.profile.diet);
  const streak = currentStreak();
  const done = streakDoneToday();
  return `<header class="topbar">
    <button class="diet-chip" data-act="go" data-tab="perfil" aria-label="${familyActive() ? 'Modo familiar activo' : 'Tu dieta: ' + esc(diet.name)}. Ver perfil">
      <span class="diet-dot" style="background:${diet.color}"></span>${familyActive() ? `${icon('users', 'icon-sm')} Familia (${planningProfiles().length})` : esc(diet.name)}
    </button>
    <div class="stat-pills">
      <button class="stat-pill flame ${done ? '' : 'off'}" data-act="go" data-tab="perfil" aria-label="Racha de ${streak} días${done ? '' : ', aún no registras hoy'}">${icon('flame')}<span class="num">${streak}</span></button>
      <button class="stat-pill xp" data-act="go" data-tab="perfil" aria-label="${s.xp} puntos de experiencia">${icon('bolt')}<span class="num">${s.xp}</span></button>
    </div>
  </header>`;
}

function bottomnav() {
  const items = [
    ['hoy', 'home', 'Hoy'],
    ['despensa', 'pantry', 'Despensa'],
    ['recetas', 'chef', 'Recetas'],
    ['plan', 'calendar', 'Plan'],
    ['perfil', 'user', 'Perfil'],
  ];
  return `<nav class="bottomnav" aria-label="Navegación principal">${items
    .map(([id, ic, label]) => {
      const n = id === 'despensa' ? S().shopping.filter((x) => !x.done).length : 0;
      return `<button class="navbtn" data-act="go" data-tab="${id}" ${ui.tab === id ? 'aria-current="page"' : ''} ${n ? `aria-label="${label}, ${n} por comprar"` : ''}><span class="nav-ic">${icon(ic)}${n ? `<span class="nav-badge num" aria-hidden="true">${n > 9 ? '9+' : n}</span>` : ''}</span><span>${label}</span></button>`;
    })
    .join('')}</nav>`;
}

// ═════════════════════════ ONBOARDING ═════════════════════════
const OB_STEPS = 6;

function renderOnboarding() {
  const o = ui.ob;
  let body = '';
  const top = (canBack = true) => `<div class="ob-top">
      ${canBack ? `<button class="btn btn-ghost btn-icon" data-act="ob-back" aria-label="Regresar">${icon('back')}</button>` : '<span style="width:44px"></span>'}
      <div class="progress" role="progressbar" aria-label="Progreso de configuración" aria-valuemin="0" aria-valuemax="${OB_STEPS - 1}" aria-valuenow="${o.step}"><span style="width:${(o.step / (OB_STEPS - 1)) * 100}%"></span></div>
    </div>`;

  if (o.step === 0) {
    body = `<div class="ob-hero">
      ${mascot('cheer', 'lg')}
      <h1>¡Hola! Soy Valita</h1>
      <p class="muted" style="max-width:320px">Te ayudo a seguir tu dieta cocinando con lo que <b>ya tienes</b> en tu cocina. Recetas, plan semanal y rachas para que no la sueltes.</p>
    </div>
    <div class="sticky-foot stack-sm">
      <button class="btn btn-block" data-act="ob-next">Empezar</button>
      <p class="tiny muted center">Toma menos de un minuto. Al continuar aceptas los <button class="linkbtn tiny" data-act="terms">Términos y privacidad</button>.</p>
    </div>`;
  } else if (o.step === 1) {
    body = `${top()}
      <div class="speech">${mascot('happy', 'sm')}<div class="bubble">¿Cómo te llamas?</div></div>
      <div class="field" style="margin-top:24px">
        <label for="ob-name">Tu nombre</label>
        <input id="ob-name" class="input" autocomplete="given-name" maxlength="30" value="${esc(o.name)}" ${o.nameError ? 'aria-invalid="true" aria-describedby="ob-name-err"' : ''}>
        ${o.nameError ? `<p class="field-error" id="ob-name-err">${o.nameError}</p>` : ''}
      </div>
      <div class="sticky-foot"><button class="btn btn-block" data-act="ob-next">Continuar</button></div>`;
  } else if (o.step === 2) {
    body = `${top()}
      <div class="speech">${mascot('think', 'sm')}<div class="bubble">¿Qué dieta quieres seguir, ${esc(o.name)}?</div></div>
      <p class="small muted" style="margin:14px 0 10px">Todas tienen respaldo científico o de autoridades de salud. Toca una para ver su evidencia.</p>
      <div class="stack-sm" role="list">${[...customDiets(), ...DIETS].map((d) => dietOption(d, o.diet === d.id)).join('')}</div>
      <button class="card pressable row" data-act="diet-new" style="gap:14px;margin-top:8px">
        <span class="diet-icon" style="background:var(--ink)" aria-hidden="true">${icon('plus')}</span>
        <span style="flex:1"><b>Crear mi propia dieta</b><br><span class="small muted">Elige lo que no comes y te armo recetas a tu medida.</span></span>${icon('chevron')}
      </button>
      <p class="center small" style="margin-top:12px">¿No ves tu dieta? <button class="linkbtn" data-act="suggest-open">Sugiérela</button></p>
      <div class="sticky-foot"><button class="btn btn-block" data-act="ob-next" ${o.diet ? '' : 'disabled'}>Continuar</button></div>`;
  } else if (o.step === 3) {
    const diet = getDiet(o.diet);
    body = `${top()}
      <div class="speech">${mascot('happy', 'sm')}<div class="bubble">Ajustemos tu día</div></div>
      <div class="stack" style="margin-top:20px">
        <div>
          <p class="label" id="mpd-label">¿Cuántas comidas haces al día?</p>
          <div class="segmented" role="group" aria-labelledby="mpd-label">
            ${[3, 4, 5].map((n) => `<button data-act="ob-mpd" data-n="${n}" aria-pressed="${o.mealsPerDay === n}">${n} comidas</button>`).join('')}
          </div>
          <p class="field-help">${o.mealsPerDay === 3 ? 'Desayuno, comida y cena.' : o.mealsPerDay === 4 ? 'Desayuno, snack, comida y cena.' : 'Desayuno, 2 snacks, comida y cena.'}</p>
        </div>
        ${diet.id === 'vegetariana' ? `<div class="card"><div class="toggle-row"><label for="ob-vegan"><b>Modo vegano</b><br><span class="small muted">Sin huevo, lácteos ni miel</span></label><span class="switch"><input type="checkbox" id="ob-vegan" ${o.vegan ? 'checked' : ''}><span></span></span></div></div>` : ''}
        ${diet.fasting ? fastingFields(o.fastStart, o.fastHours, 'ob') : ''}
        ${diet.warning ? `<div class="notice warn">${icon('alert')}<span>${esc(diet.warning)}</span></div>` : ''}
      </div>
      <div class="sticky-foot"><button class="btn btn-block" data-act="ob-next">Continuar</button></div>`;
  } else if (o.step === 4) {
    body = `${top()}
      <div class="speech">${mascot('think', 'sm')}<div class="bubble">¿Qué tienes en tu cocina?</div></div>
      <p class="small muted" style="margin:14px 0 12px">Elige lo que tengas ahora. Después puedes agregar más desde Despensa.</p>
      <div class="chips">${QUICK_PICKS.map((id) => `<button class="chip ok-on" data-act="ob-pick" data-id="${id}" aria-pressed="${o.pantry.has(id)}">${o.pantry.has(id) ? icon('check', 'icon-sm') : ''}${esc(ING[id].name)}</button>`).join('')}</div>
      <div class="sticky-foot"><button class="btn btn-block" data-act="ob-next">${o.pantry.size ? `Listo (${o.pantry.size})` : 'Saltar por ahora'}</button></div>`;
  } else if (o.step === 5) {
    const diet = getDiet(o.diet);
    body = `<div class="ob-hero">
        ${mascot('cheer', 'lg')}
        <h1>¡Todo listo, ${esc(o.name)}!</h1>
        <p class="muted" style="max-width:330px">Vas a seguir la dieta <b>${esc(diet.name)}</b>. Cocina una receta hoy para empezar tu racha.</p>
        <div class="reward-row">
          <div class="reward fl"><div class="reward-h">Racha</div><div class="reward-b">${icon('flame')}0</div></div>
          <div class="reward xp"><div class="reward-h">Meta diaria</div><div class="reward-b">${icon('bolt')}${getSlots(o.mealsPerDay).length * XP.meal}</div></div>
        </div>
      </div>
      <div class="sticky-foot"><button class="btn btn-block" data-act="ob-finish">Ir a mi cocina</button></div>`;
  }
  $app.innerHTML = `<main class="screen no-chrome">${body}</main>`;
  if (o.step === 1) setTimeout(() => document.getElementById('ob-name')?.focus(), 50);
}

function dietOption(d, selected) {
  const open = ui.ob.dietOpen === d.id || selected;
  return `<button class="card pressable diet-option" role="listitem" data-act="ob-diet" data-id="${d.id}" aria-pressed="${selected}">
    <span class="diet-icon" style="background:${d.color}" aria-hidden="true">${dietIconText(d)}</span>
    <span style="flex:1;min-width:0">
      <span class="row between" style="align-items:flex-start"><b style="font-size:17px">${esc(d.name)}</b><span class="badge ${d.evidence}">${EVIDENCE_LABEL[d.evidence]}</span></span>
      <span class="small muted" style="display:block;margin-top:2px">${esc(d.short)}</span>
      ${open ? `<span class="diet-more" style="display:block"><b>Respaldo:</b> ${esc(d.proof)}</span>` : ''}
    </span>
  </button>`;
}

function fastingFields(start, hours, prefix) {
  return `<div class="card stack-sm">
    <p class="label">Tu ventana de alimentación</p>
    <div class="row" style="gap:12px">
      <div class="field" style="flex:1">
        <label for="${prefix}-fstart" class="small">Empiezo a comer</label>
        <input type="time" id="${prefix}-fstart" class="input" value="${start}">
      </div>
      <div class="field" style="flex:1">
        <label for="${prefix}-fhours" class="small">Horas para comer</label>
        <select id="${prefix}-fhours" class="input">
          ${[6, 8, 10, 12].map((h) => `<option value="${h}" ${hours === h ? 'selected' : ''}>${h} h (${24 - h}:${h})</option>`).join('')}
        </select>
      </div>
    </div>
    <p class="field-help">El esquema más común es 16:8: ayunas 16 horas y comes en 8.</p>
  </div>`;
}

// ═════════════════════════ HOY ═════════════════════════
function todayScreen() {
  const s = S();
  const slots = getSlots(s.profile.mealsPerDay);
  const log = todayLog();
  const doneIds = new Set(log.map((l) => l.slot));
  const doneCount = slots.filter((x) => doneIds.has(x.id)).length;
  const currentIdx = slots.findIndex((x) => !doneIds.has(x.id));
  const pantryCount = s.pantry.length + s.customPantry.length;
  const diet = getDiet(s.profile.diet);
  const allDone = currentIdx === -1;

  let msg;
  if (allDone) msg = `¡Día perfecto, ${esc(s.profile.name)}! Completaste todas tus comidas.`;
  else if (doneCount === 0) msg = `${greeting()}, ${esc(s.profile.name)}. ${currentStreak() ? `Llevas ${currentStreak()} días de racha, ¡no la pierdas!` : 'Cocina algo hoy y empieza tu racha.'}`;
  else msg = `¡Vas muy bien! Te faltan ${slots.length - doneCount} ${slots.length - doneCount === 1 ? 'comida' : 'comidas'} hoy.`;

  const plan = s.plan;
  const planDay = plan?.days.find((d) => d.date === today());

  return `<div class="stack">
    <div class="speech">
      <button class="alita-btn" data-act="alita" aria-label="Toca a Valita para un consejo">${mascot(allDone ? 'cheer' : 'happy')}</button>
      <div class="bubble" id="alita-bubble" aria-live="polite">${ui.tip ? tipHtml(ui.tip) : msg}<span class="bubble-hint">Tócame para un consejo</span></div>
    </div>

    <div class="card">
      <div class="row between" style="margin-bottom:10px"><b>Meta de hoy</b><span class="small muted num">${doneCount} de ${slots.length} comidas</span></div>
      <div class="progress" role="progressbar" aria-label="Comidas de hoy" aria-valuemin="0" aria-valuemax="${slots.length}" aria-valuenow="${doneCount}"><span style="width:${(doneCount / slots.length) * 100}%"></span></div>
    </div>
    ${diet.fasting ? fastingCard() : ''}

    <section aria-label="Tu ruta de hoy">
      <div class="path">
        ${slots.map((slot, i) => {
          const done = doneIds.has(slot.id);
          const cur = i === currentIdx;
          const entry = log.find((l) => l.slot === slot.id);
          const r = entry ? findRecipe(entry.recipeId) : planDay ? findRecipe(planDay.slots[slot.id]) : null;
          const sub = done ? esc(r?.name || 'Registrada') : r ? `Plan: ${esc(r.name)}` : 'Toca para ver ideas';
          return `<div class="path-node-wrap ${cur ? 'has-start' : ''}">
            <button class="path-node ${done ? 'done' : cur ? 'current' : ''}" data-act="slot" data-slot="${slot.id}" aria-label="${slot.name}: ${done ? 'completado' : 'pendiente'}">
              ${cur ? '<span class="start-tag" aria-hidden="true">EMPEZAR</span>' : ''}
              ${icon(done ? 'check' : MEAL_ICON[slot.type])}
            </button>
            <span class="path-label">${slot.name}</span>
            <span class="path-sub">${sub}</span>
          </div>`;
        }).join('')}
      </div>
    </section>

    ${challengeCard()}
    ${weekStrip()}
    ${waterCard()}
    ${nutritionCard()}

    ${pantryCount < 6 ? `<button class="card pressable brand row" data-act="go" data-tab="despensa" style="gap:14px">
        <span style="color:var(--brand-ink)">${icon('pantry', 'icon-lg')}</span>
        <span style="flex:1"><b>Llena tu despensa</b><br><span class="small muted">Con más ingredientes te doy mejores recetas. Tienes ${pantryCount}.</span></span>
        ${icon('chevron')}
      </button>` : ''}

    ${!plan || plan.days[plan.days.length - 1].date < today() ? `<button class="card pressable row" data-act="go" data-tab="plan" style="gap:14px">
        <span style="color:var(--ai)">${icon('calendar', 'icon-lg')}</span>
        <span style="flex:1"><b>Arma tu plan de la semana</b><br><span class="small muted">7 días de recetas con lo que tienes y tu lista del súper. +${XP.plan} XP</span></span>
        ${icon('chevron')}
      </button>` : ''}
  </div>`;
}

// ── Inicio interactivo ──
const TIPS = [
  'Tomar agua antes de comer ayuda a reconocer si de verdad tienes hambre.',
  'Llena la mitad de tu plato con verduras: es la regla más fácil de recordar.',
  'Cocinar en casa te deja controlar la sal, el azúcar y el aceite.',
  '¿Te sobró comida? Guárdala en el refri antes de 2 horas.',
  'Las legumbres (frijol, lenteja, garbanzo) son proteína barata y con mucha fibra.',
  'Planear tu semana evita que compres de más… y que tires comida.',
  'Puedes escanear tu refri con una foto desde Despensa.',
  'Si un ingrediente te falta, toca “Lo tengo” o mándalo al carrito.',
  'Una racha se construye con días normales, no con días perfectos.',
  'Masticar despacio ayuda a sentirte satisfecho con menos.',
  'Las frutas enteras llenan más que los jugos.',
  'Dormir bien también influye en el hambre del día siguiente.',
];

const TIP_PREFIX = ['Valita dice', 'Valita aconseja', 'Valita sabe', 'Dato de Valita', 'Valita recomienda'];

function alitaTip() {
  const diet = getDiet(S().profile.diet);
  const pool = [...TIPS, `Tu dieta ${diet.name}: ${diet.short}`, diet.proof && !diet.custom ? diet.proof : null].filter(Boolean);
  let t;
  do { t = pool[Math.floor(Math.random() * pool.length)]; } while (pool.length > 1 && t === ui.tip?.text);
  return { text: t, prefix: TIP_PREFIX[Math.floor(Math.random() * TIP_PREFIX.length)] };
}

function tipHtml(tip) {
  return `<span class="tip-prefix">${esc(tip.prefix)}:</span> ${esc(tip.text)}`;
}

function floatXp(anchor, xp) {
  if (!anchor) return;
  const r = anchor.getBoundingClientRect();
  const el = document.createElement('span');
  el.className = 'xp-float num';
  el.setAttribute('aria-hidden', 'true');
  el.textContent = `+${xp} XP`;
  el.style.left = `${r.left + r.width / 2}px`;
  el.style.top = `${r.top}px`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

// Snacks para alcanzar la meta de calorías del día
function openSnackBoost() {
  const tg = macroTargets();
  const left = Math.max(0, Math.round(tg.kcal - dayTotals(today()).kcal));
  const target = Math.min(left, 350);
  const list = rankRecipes({ mealType: 'snack', seed: today() })
    .map((x) => ({ ...x, diff: Math.abs(x.recipe.kcal - target) + (1 - x.match.ratio) * 400 }))
    .sort((a, b) => a.diff - b.diff)
    .slice(0, 6);
  const body = `<div class="stack">
    <div class="speech">${mascot('happy', 'sm')}<div class="bubble"><span class="tip-prefix">Valita aconseja:</span> te faltan <b class="num">${left} kcal</b>. Estos snacks de tu dieta te acercan a tu meta.</div></div>
    <div class="stack-sm">${list.map((x) => recipeCard(x.recipe, 'extra', x.match)).join('') || emptyRecipes()}</div>
    <p class="tiny muted center">Los snacks extra suman a tus calorías y dan +${XP.extra} XP. No cuentan como comida de tu ruta.</p>
  </div>`;
  openSheet('<h2>Snacks para tu meta</h2>', body);
}

// ── Calculadora de meta (fórmula de Mifflin-St Jeor) ──
const ACTIVITY = [
  { v: 1.2, label: 'Poco o nada de ejercicio' },
  { v: 1.375, label: 'Ligero (1–3 días por semana)' },
  { v: 1.55, label: 'Moderado (3–5 días por semana)' },
  { v: 1.725, label: 'Intenso (6–7 días por semana)' },
];
const GOALS = [
  { v: 'bajar', label: 'Bajar de peso', delta: -400 },
  { v: 'mantener', label: 'Mantener mi peso', delta: 0 },
  { v: 'subir', label: 'Subir de peso / masa muscular', delta: 300 },
];

function openKcalCalc(result = null, error = '') {
  const b = S().profile.body || { sex: 'm', age: '', weight: '', height: '', activity: 1.375, goal: 'mantener' };
  const body = `<div class="stack">
    <p class="small muted">Te doy una estimación con la fórmula de Mifflin-St Jeor, de las más usadas por nutriólogos. Es un punto de partida, no una indicación médica.</p>
    <div>
      <p class="label" id="kc-sex-l">Sexo</p>
      <div class="segmented" role="group" aria-labelledby="kc-sex-l">
        <button data-act="kc-sex" data-v="m" aria-pressed="${b.sex === 'm'}">Hombre</button>
        <button data-act="kc-sex" data-v="f" aria-pressed="${b.sex === 'f'}">Mujer</button>
      </div>
    </div>
    <div class="kcal-grid">
      <div class="field"><label for="kc-age">Edad</label><input id="kc-age" class="input num" type="number" inputmode="numeric" min="18" max="90" value="${esc(b.age)}" placeholder="años"></div>
      <div class="field"><label for="kc-w">Peso (kg)</label><input id="kc-w" class="input num" type="number" inputmode="decimal" min="35" max="250" step="0.1" value="${esc(b.weight)}" placeholder="kg"></div>
      <div class="field"><label for="kc-h">Estatura (cm)</label><input id="kc-h" class="input num" type="number" inputmode="numeric" min="130" max="220" value="${esc(b.height)}" placeholder="cm"></div>
    </div>
    <div class="field"><label for="kc-act">Actividad física</label>
      <select id="kc-act" class="input">${ACTIVITY.map((a) => `<option value="${a.v}" ${Number(b.activity) === a.v ? 'selected' : ''}>${a.label}</option>`).join('')}</select></div>
    <div class="field"><label for="kc-goal">Tu objetivo</label>
      <select id="kc-goal" class="input">${GOALS.map((g) => `<option value="${g.v}" ${b.goal === g.v ? 'selected' : ''}>${g.label}</option>`).join('')}</select></div>
    ${error ? `<div class="notice err" role="alert">${icon('alert')}<span>${esc(error)}</span></div>` : ''}
    ${result ? `<div class="card brand stack-sm" role="status">
      <div class="row between"><span class="small">Lo que tu cuerpo usa en reposo</span><b class="num">${result.bmr} kcal</b></div>
      <div class="row between"><span class="small">Con tu actividad diaria</span><b class="num">${result.tdee} kcal</b></div>
      <div class="row between"><b>Meta recomendada</b><b class="num" style="font-size:22px;color:var(--brand-ink)">${result.goal} kcal</b></div>
      ${result.floored ? '<p class="tiny muted">Ajustamos al mínimo seguro recomendado. Para bajar más rápido, consulta a un profesional.</p>' : ''}
    </div>` : ''}
    <p class="tiny muted">Estos datos se guardan solo en tu teléfono. No los recomendamos para embarazo, lactancia, menores de edad o condiciones médicas: ahí consulta a un profesional.</p>
  </div>`;
  const foot = result
    ? `<button class="btn btn-block" data-act="kcal-calc-use" data-kcal="${result.goal}">Usar ${result.goal} kcal como mi meta</button>`
    : `<button class="btn btn-block" data-act="kcal-calc-run">Calcular</button>`;
  openSheet('<h2>Calcular mi meta</h2>', body, foot, { replace: !!document.querySelector('.sheet') });
}

function readKcalForm() {
  const prev = S().profile.body || {};
  return {
    sex: ui.kcSex || prev.sex || 'm',
    age: Number(document.getElementById('kc-age')?.value) || '',
    weight: Number(document.getElementById('kc-w')?.value) || '',
    height: Number(document.getElementById('kc-h')?.value) || '',
    activity: Number(document.getElementById('kc-act')?.value) || 1.375,
    goal: document.getElementById('kc-goal')?.value || 'mantener',
  };
}

function runKcalCalc() {
  const b = readKcalForm();
  update((s) => { s.profile.body = b; });
  if (!(b.age >= 18 && b.age <= 90)) return openKcalCalc(null, 'Escribe una edad entre 18 y 90 años.');
  if (!(b.weight >= 35 && b.weight <= 250)) return openKcalCalc(null, 'Escribe tu peso en kilos (entre 35 y 250).');
  if (!(b.height >= 130 && b.height <= 220)) return openKcalCalc(null, 'Escribe tu estatura en centímetros (entre 130 y 220).');
  const bmr = Math.round(10 * b.weight + 6.25 * b.height - 5 * b.age + (b.sex === 'm' ? 5 : -161));
  const tdee = Math.round(bmr * b.activity);
  const delta = GOALS.find((g) => g.v === b.goal)?.delta || 0;
  const min = b.sex === 'm' ? 1500 : 1200;
  let goal = Math.round((tdee + delta) / 50) * 50;
  const floored = goal < min;
  if (floored) goal = min;
  openKcalCalc({ bmr, tdee, goal, floored });
}

// Reparto sugerido de calorías por tiempo de comida
const MEAL_SPLIT = {
  3: { desayuno: 0.3, comida: 0.4, cena: 0.3 },
  4: { desayuno: 0.25, snack1: 0.1, comida: 0.4, cena: 0.25 },
  5: { desayuno: 0.25, snack1: 0.1, comida: 0.35, snack2: 0.1, cena: 0.2 },
};

// ── Términos y privacidad ──
function openTerms() {
  const contact = CONTACT_EMAIL
    ? `<a href="mailto:${esc(CONTACT_EMAIL)}">${esc(CONTACT_EMAIL)}</a>`
    : 'el apartado <b>Sugerir una dieta</b> en tu Perfil (pronto tendremos un correo de contacto)';
  const body = `<div class="stack terms">
    <p class="tiny muted">Última actualización: octubre de 2026 · Versión de prueba (beta)</p>

    <section><h3>1. Aviso de salud</h3>
      <p>${esc(APP_NAME)} te da información general sobre alimentación y recetas. <b>No es un servicio médico</b> y no sustituye la consulta con un médico, nutriólogo u otro profesional de la salud.</p>
      <p>Si tienes una enfermedad (por ejemplo diabetes, enfermedad renal o hepática), estás embarazada o en lactancia, tomas medicamentos o eres menor de edad, consulta a un profesional antes de cambiar tu alimentación o seguir una dieta restrictiva.</p>
      <p>Las calorías y nutrientes de las recetas son <b>aproximados</b>. Las recetas creadas con IA pueden contener errores; revisa siempre los ingredientes, sobre todo si tienes alergias.</p></section>

    <section><h3>2. Qué datos usamos y dónde se guardan</h3>
      <p><b>En tu teléfono:</b> tu nombre, dieta, despensa, comidas registradas, agua, racha, metas y, si los escribes, edad, peso y estatura. Todo se guarda en el almacenamiento de tu navegador. No tenemos una base de datos con tu información personal.</p>
      <p><b>Lo que sale de tu teléfono solo cuando usas ciertas funciones:</b></p>
      <ul>
        <li><b>Recetas con IA:</b> se envía tu dieta, la lista de tu despensa y tu antojo (si lo escribes). No se envía tu nombre.</li>
        <li><b>Escanear con foto:</b> se envía la foto, reducida, solo para reconocer ingredientes. No la guardamos.</li>
        <li><b>Sugerir una dieta:</b> se guarda lo que escribes en el formulario y el nombre de tu dieta actual, para revisarla.</li>
      </ul>
      <p>Estas funciones usan servicios de terceros: <b>Cloudflare</b> (servidor intermedio) y <b>Google Gemini</b> (inteligencia artificial). Durante la beta usamos la versión gratuita de Gemini, cuyos términos permiten a Google usar el contenido enviado para mejorar sus productos. Por eso te pedimos <b>no escribir ni fotografiar datos personales</b> (nombres, documentos, etc.).</p></section>

    <section><h3>3. Tus derechos</h3>
      <p>Puedes ver y corregir tus datos dentro de la app, y borrarlos cuando quieras con <b>Perfil → Borrar mis datos</b>. Si enviaste una sugerencia y quieres que la eliminemos, escríbenos.</p>
      <p>Conforme a la legislación mexicana de protección de datos personales, puedes ejercer tus derechos de acceso, rectificación, cancelación y oposición (ARCO) escribiendo a ${contact}.</p></section>

    <section><h3>4. Uso de la app</h3>
      <p>La app es gratuita durante la beta. Algunos módulos marcados como <b>PRO</b> podrán tener costo en el futuro; te avisaremos antes de cualquier cobro y nunca se cobrará sin tu aceptación.</p>
      <p>Te pedimos usarla de forma personal y no intentar dañar el servicio ni abusar de las funciones de IA.</p></section>

    <section><h3>5. Cambios</h3>
      <p>Podemos actualizar estos términos. Si el cambio es importante, te lo mostraremos dentro de la app.</p></section>

    <section><h3>6. Contacto</h3><p>Dudas o comentarios: ${contact}.</p></section>
  </div>`;
  openSheet('<h2>Términos y privacidad</h2>', body);
}


function weekStrip() {
  const week = lastWeek();
  const streak = currentStreak();
  return `<div class="card week-strip">
    <div class="row between"><b class="row" style="gap:6px"><span style="color:var(--flame)">${icon('flame', 'icon-sm')}</span>${streak ? `${streak} ${streak === 1 ? 'día' : 'días'} de racha` : 'Empieza tu racha hoy'}</b>
      <span class="small muted">${streakDoneToday() ? 'Hoy ya cuenta' : 'Registra 1 comida'}</span></div>
    <div class="week-dots" style="margin-top:10px">${week.map((d) => `<div><i class="${d.done ? 'on' : d.frozen ? 'frz' : ''}" aria-hidden="true">${d.done ? icon('flame', 'icon-sm') : d.frozen ? icon('shield', 'icon-sm') : ''}</i>${d.date === today() ? 'Hoy' : DAY_SHORT[parseDate(d.date).getDay()][0]}<span class="sr-only">${d.done ? 'cumplido' : d.frozen ? 'protegido' : 'sin registro'}</span></div>`).join('')}</div>
  </div>`;
}

function challengeCard() {
  const ch = todayChallenge();
  return `<div class="card challenge ${ch.done ? 'done' : ''} row" style="gap:14px">
    <span class="challenge-ic">${icon(ch.done ? 'check' : 'trophy')}</span>
    <span style="flex:1"><span class="slot-label">Reto del día</span><br><b>${esc(ch.text)}</b><br>
      <span class="small ${ch.done ? '' : 'muted'}">${ch.done ? '¡Completado! +10 XP' : 'Recompensa: +10 XP'}</span></span>
  </div>`;
}

function waterCard() {
  const n = waterToday();
  return `<div class="card">
    <div class="row between"><b>Agua de hoy</b><span class="small muted num">${n} de ${WATER_GOAL} vasos · +${XP.water} XP c/u</span></div>
    <div class="glasses" role="group" aria-label="Vasos de agua">
      ${Array.from({ length: WATER_GOAL }, (_, i) => `<button class="glass ${i < n ? 'full' : ''}" data-act="water" data-n="${i + 1}" aria-label="Vaso ${i + 1}${i < n ? ', tomado' : ''}" aria-pressed="${i < n}">
        <svg viewBox="0 0 24 32" aria-hidden="true"><path class="glass-water" d="M5.6 ${i < n ? 8 : 30} L18.4 ${i < n ? 8 : 30} L17 30 H7 Z"/><path class="glass-shape" d="M3 3h18l-2.6 26a2 2 0 0 1-2 1.8H7.6a2 2 0 0 1-2-1.8z"/></svg>
      </button>`).join('')}
    </div>
  </div>`;
}

// ── Calorías y macros ──
function nutritionCard() {
  if (!canUse('nutrition')) {
    return `<button class="card pressable pro-card row" data-act="paywall" data-feature="nutrition" style="gap:14px">
      <span class="pro-icon">${icon('chart')}</span><span style="flex:1"><b>Calorías y macros de hoy</b><br><span class="small">Sigue tu meta diaria con Pro.</span></span>${icon('lock')}</button>`;
  }
  const tg = macroTargets();
  const tot = dayTotals(today());
  const pct = Math.min(1, tot.kcal / tg.kcal);
  const over = tot.kcal > tg.kcal;
  const macro = (key, label, color) => {
    const v = Math.round(tot[key]);
    const w = Math.min(100, (v / (tg[key] || 1)) * 100);
    return `<div class="macro-row"><span class="macro-label">${label}</span>
      <span class="progress thin" role="progressbar" aria-label="${label}: ${v} de ${tg[key]} gramos" aria-valuemin="0" aria-valuemax="${tg[key]}" aria-valuenow="${v}"><span style="width:${w}%;background:${color}"></span></span>
      <span class="macro-val num">${v}/${tg[key]} g</span></div>`;
  };
  return `<div class="card stack-sm">
    <div class="row between"><b>Calorías de hoy</b>${proBadge('nutrition')}</div>
    <div class="row" style="align-items:baseline;gap:6px"><span class="kcal-big num">${Math.round(tot.kcal)}</span><span class="muted bold num">/ ${tg.kcal} kcal</span>
      <span class="small bold" style="margin-left:auto;color:${over ? 'var(--warn)' : 'var(--ok-ink)'}">${over ? `${Math.round(tot.kcal - tg.kcal)} de más` : `Te quedan ${Math.round(tg.kcal - tot.kcal)}`}</span></div>
    <div class="progress" role="progressbar" aria-label="Calorías de hoy" aria-valuemin="0" aria-valuemax="${tg.kcal}" aria-valuenow="${Math.round(tot.kcal)}"><span style="width:${pct * 100}%;${over ? 'background:var(--warn)' : ''}"></span></div>
    ${macro('p', 'Proteína', '#2B7FB8')}${macro('c', 'Carbohidratos', '#D9790F')}${macro('f', 'Grasa', '#7A4FD0')}
    ${!over && tg.kcal - tot.kcal >= 80 ? `<button class="btn btn-ghost btn-block accent" data-act="snack-boost" style="margin-top:6px">${icon('apple', 'icon-sm')} Snacks para llegar a tu meta</button>
      <p class="tiny muted center">Te faltan ${Math.round(tg.kcal - tot.kcal)} kcal. Te sugiero snacks de tu dieta.</p>` : ''}
  </div>`;
}

function weekChart() {
  const tg = macroTargets();
  const data = weekTotals();
  const max = Math.max(tg.kcal * 1.2, ...data.map((d) => d.kcal));
  const goalPos = (tg.kcal / max) * 100;
  const t = today();
  return `<div class="card">
    <div class="row between"><b>Tu semana</b><span class="small muted">Meta ${tg.kcal} kcal</span></div>
    <div class="wchart" role="img" aria-label="Calorías de los últimos 7 días">
      <div class="wchart-goal" style="bottom:${goalPos}%"><span>Meta</span></div>
      ${data.map((d) => {
        const h = d.kcal ? Math.max(3, (d.kcal / max) * 100) : 0;
        const dt = parseDate(d.date);
        return `<div class="wchart-col" tabindex="0" aria-label="${DAY_LONG[dt.getDay()]}: ${Math.round(d.kcal)} kcal">
          <span class="wchart-tip num">${Math.round(d.kcal)}</span>
          <div class="wchart-bar ${d.date === t ? 'today' : ''}" style="height:${h}%"></div>
          <small>${d.date === t ? 'Hoy' : DAY_SHORT[dt.getDay()]}</small></div>`;
      }).join('')}
    </div>
    <table class="sr-only"><caption>Calorías por día</caption><tr><th>Día</th><th>kcal</th></tr>${data.map((d) => `<tr><td>${d.date}</td><td>${Math.round(d.kcal)}</td></tr>`).join('')}</table>
  </div>`;
}

function fastingCard() {
  const st = fastingStatus(S().profile);
  const h = Math.floor(st.minsLeft / 60);
  const m = st.minsLeft % 60;
  return `<div class="card fast-card">
    <span class="fast-ring ${st.inWindow ? 'in' : 'out'}">${icon(st.inWindow ? 'utensils' : 'moon')}</span>
    <span style="flex:1"><b>${st.inWindow ? 'Estás en tu ventana para comer' : 'Estás en ayuno'}</b><br>
    <span class="small muted">Ventana ${st.from}–${st.to} · ${st.inWindow ? 'cierra' : 'abre'} en ${h} h ${m} min</span></span>
  </div>`;
}

function openSlotSheet(slotId) {
  const s = S();
  const slot = getSlots(s.profile.mealsPerDay).find((x) => x.id === slotId);
  if (!slot) return;
  const entry = todayLog().find((l) => l.slot === slotId);
  const planDay = s.plan?.days.find((d) => d.date === today());
  const planned = planDay ? findRecipe(planDay.slots[slotId]) : null;

  let body;
  if (entry) {
    const r = findRecipe(entry.recipeId);
    body = `<div class="empty">${mascot('cheer', 'sm')}<p><b>Ya registraste tu ${slot.name.toLowerCase()}.</b><br><span class="muted">${esc(r?.name || '')} · +${entry.xp} XP</span></p>
      <button class="btn btn-ghost btn-sm" data-act="undo-meal" data-slot="${slotId}">Deshacer registro</button></div>`;
  } else {
    const ranked = rankRecipes({ mealType: slot.type, seed: today() + slotId }).filter((x) => x.recipe.id !== planned?.id).slice(0, 4);
    body = `
      ${planned ? `<p class="slot-label" style="margin:4px 0 8px">De tu plan</p>${recipeCard(planned, slotId)}` : ''}
      <p class="slot-label" style="margin:16px 0 8px">Ideas con lo que tienes</p>
      <div class="stack-sm">${ranked.map((x) => recipeCard(x.recipe, slotId, x.match)).join('') || emptyRecipes()}</div>
      <button class="btn btn-ai btn-block" style="margin-top:16px" data-act="ai-open" data-meal="${slot.type}">${icon(canUse('ai') ? 'sparkles' : 'lock')} Crear con IA</button>
      <p class="center" style="margin-top:8px">${proBadge('ai')}</p>`;
  }
  openSheet(`<h2>${slot.name}</h2>`, body);
}

// ═════════════════════════ DESPENSA ═════════════════════════
function pantryScreen() {
  const s = S();
  const loc = ui.pantry.loc;
  const items = s.pantry.map((id) => ING[id]).filter(Boolean).filter((i) => loc === 'all' || i.loc === loc);
  const groups = {};
  for (const it of items) (groups[it.cat] = groups[it.cat] || []).push(it);
  const custom = loc === 'all' || loc === 'otros' ? s.customPantry : [];
  const total = s.pantry.length + s.customPantry.length;
  const quick = QUICK_PICKS.filter((id) => !s.pantry.includes(id)).slice(0, 12);
  const pendingBuy = s.shopping.filter((x) => !x.done).length;
  const seg = `<div class="segmented" role="group" aria-label="Vista de despensa">
      <button data-act="pantry-view" data-v="tengo" aria-pressed="${ui.pantry.view === 'tengo'}">Lo que tengo (${total})</button>
      <button data-act="pantry-view" data-v="comprar" aria-pressed="${ui.pantry.view === 'comprar'}">Por comprar (${pendingBuy})</button>
    </div>`;
  if (ui.pantry.view === 'comprar') {
    return `<div class="stack">
      <div class="row between"><h1>Mi despensa</h1><span class="badge num">${total} ingredientes</span></div>
      ${seg}
      ${shoppingView('despensa')}
    </div>`;
  }

  return `<div class="stack">
    <div class="row between"><h1>Mi despensa</h1><span class="badge num">${total} ingredientes</span></div>
    ${seg}

    <button class="card pressable pro-card row" data-act="scan-open" style="gap:14px">
      <span class="pro-icon">${icon(canUse('scan') ? 'camera' : 'lock')}</span>
      <span style="flex:1"><span class="row" style="gap:8px;flex-wrap:wrap"><b>Escanear con foto</b>${proBadge('scan')}</span><span class="small">Toma una foto de tu refri o alacena y agrego lo que vea.</span></span>
      ${icon('chevron')}
    </button>
    <input type="file" id="scan-input" accept="image/*" capture="environment" hidden>

    <div class="field">
      <label for="pantry-search">Agregar ingrediente</label>
      <div class="search-wrap">${icon('search')}<input id="pantry-search" class="input" placeholder="Ej. huevo, espinaca, atún…" autocomplete="off" value="${esc(ui.pantry.query)}" aria-controls="pantry-suggest"></div>
      <div id="pantry-suggest">${pantrySuggest()}</div>
    </div>

    <div class="chips scroll" role="group" aria-label="Filtrar por lugar">
      ${[['all', 'Todo'], ['refri', 'Refrigerador'], ['alacena', 'Alacena'], ['congelador', 'Congelador']]
        .map(([id, l]) => `<button class="chip" data-act="pantry-loc" data-loc="${id}" aria-pressed="${loc === id}">${l}</button>`).join('')}
    </div>

    ${total === 0 ? `<div class="empty">${mascot('sleepy')}<p><b>Tu despensa está vacía</b><br><span class="muted">Agrega lo que tienes y te digo qué cocinar.</span></p></div>` : ''}

    ${Object.keys(CATEGORIES).filter((c) => groups[c]).map((c) => `<section>
      <h3 style="margin:8px 0 10px">${CATEGORIES[c]}</h3>
      <div class="chips">${groups[c].map((i) => `<button class="chip chip-remove" data-act="pantry-remove" data-id="${i.id}" aria-label="Quitar ${esc(i.name)}">${esc(i.name)}<span class="x">${icon('x', 'icon-sm')}</span></button>`).join('')}</div>
    </section>`).join('')}

    ${custom.length ? `<section><h3 style="margin:8px 0 10px">Agregados por ti</h3>
      <div class="chips">${custom.map((c) => `<button class="chip chip-remove" data-act="pantry-remove-custom" data-id="${c.id}" aria-label="Quitar ${esc(c.name)}">${esc(c.name)}<span class="x">${icon('x', 'icon-sm')}</span></button>`).join('')}</div></section>` : ''}

    ${quick.length ? `<section class="card soft">
      <h3 style="margin-bottom:10px">Agregar rápido</h3>
      <div class="chips">${quick.map((id) => `<button class="chip" data-act="pantry-add" data-id="${id}">${icon('plus', 'icon-sm')}${esc(ING[id].name)}</button>`).join('')}</div>
    </section>` : ''}
  </div>`;
}

function pantrySuggest() {
  const q = norm(ui.pantry.query);
  if (!q) return '';
  const s = S();
  const res = INGREDIENTS.filter((i) => !i.flags.has('staple') && norm(i.name).includes(q)).slice(0, 6);
  const exact = res.some((i) => norm(i.name) === q);
  return `<div class="suggest" role="listbox" aria-label="Sugerencias">
    ${res.map((i) => {
      const has = s.pantry.includes(i.id);
      return `<button role="option" data-act="pantry-add" data-id="${i.id}" ${has ? 'disabled aria-disabled="true"' : ''}>
        <span>${esc(i.name)}</span><span class="tag">${has ? 'Ya lo tienes' : LOCATIONS[i.loc]}</span></button>`;
    }).join('')}
    ${!exact ? `<button role="option" data-act="pantry-add-custom"><span>${icon('plus', 'icon-sm')} Agregar “${esc(ui.pantry.query.trim())}”</span><span class="tag">Ingrediente propio</span></button>` : ''}
  </div>`;
}

function addToPantry(id) {
  update((s) => {
    if (!s.pantry.includes(id)) s.pantry.push(id);
    s.shopping = s.shopping.filter((x) => x.ingId !== id);
  });
  announceAchievements(refreshAchievements());
}

// ═════════════════════════ RECETAS ═════════════════════════
function recipesScreen() {
  const r = ui.recipes;
  const meals = [[null, 'Todas'], ['desayuno', 'Desayuno'], ['comida', 'Comida'], ['cena', 'Cena'], ['snack', 'Snack']];
  return `<div class="stack">
    <h1>Recetas</h1>
    <div class="search-wrap"><label for="recipe-search" class="sr-only">Buscar receta o ingrediente</label>${icon('search')}<input id="recipe-search" class="input" placeholder="Buscar receta o ingrediente" value="${esc(r.query)}" autocomplete="off"></div>
    <div class="chips scroll" role="group" aria-label="Tiempo de comida">
      ${meals.map(([id, l]) => `<button class="chip" data-act="rec-meal" data-meal="${id ?? ''}" aria-pressed="${r.meal === id}">${l}</button>`).join('')}
    </div>
    <div class="card toggle-row" style="padding:8px 14px">
      <label for="only-ready"><b>Solo lo que puedo cocinar ya</b><br><span class="small muted">Sin ingredientes faltantes</span></label>
      <span class="switch"><input type="checkbox" id="only-ready" ${r.onlyReady ? 'checked' : ''}><span></span></span>
    </div>
    <button class="card pressable ai row" data-act="ai-open" data-meal="${r.meal ?? ''}" style="gap:14px">
      <span style="color:var(--ai)">${icon('sparkles', 'icon-lg')}</span>
      <span style="flex:1"><span class="row" style="gap:8px;flex-wrap:wrap"><b>Crear recetas nuevas con IA</b>${proBadge('ai')}</span><span class="small muted">Recetas ilimitadas con tu despensa y tu dieta.</span></span>
      ${icon('chevron')}
    </button>
    <div id="recipe-list">${recipeList()}</div>
  </div>`;
}

function recipeList() {
  const r = ui.recipes;
  const ranked = rankRecipes({ mealType: r.meal, onlyReady: r.onlyReady, query: r.query, seed: today() });
  const saved = Object.values(S().aiRecipes);
  if (!ranked.length) return emptyRecipes();
  return `<p class="small muted" style="margin-bottom:10px">${ranked.length} recetas compatibles con tu dieta${saved.length ? ` (incluye ${saved.length} tuyas de IA)` : ''}</p>
    <div class="stack-sm">${ranked.map((x) => recipeCard(x.recipe, null, x.match)).join('')}</div>`;
}

function emptyRecipes() {
  return `<div class="empty">${mascot('think')}<p><b>No encontré recetas así</b><br><span class="muted">Prueba quitar filtros, agregar ingredientes a tu despensa o crear una con IA.</span></p></div>`;
}

function recipeCard(recipe, slotId = null, match = null) {
  const m = match || matchInfo(recipe);
  const type = recipe.meals[0];
  const missNames = m.missing.slice(0, 3).map(ingredientName).join(', ');
  return `<button class="card pressable recipe-card" data-act="recipe" data-id="${recipe.id}" ${slotId ? `data-slot="${slotId}"` : ''}>
    <span class="recipe-thumb ${recipe.ai ? 'thumb-ai' : 'thumb-' + type}" aria-hidden="true">${icon(recipe.ai ? 'sparkles' : MEAL_ICON[type])}</span>
    <span class="recipe-body">
      <span class="recipe-name">${esc(recipe.name)}</span>
      <span class="meta"><span>${icon('clock')}${recipe.time} min</span><span class="num">${recipe.kcal} kcal</span>${recipe.ai ? '<span class="badge ai">IA</span>' : ''}${recipe.warnings?.length ? '<span class="badge media">Revisar</span>' : ''}</span>
      ${m.missing.length === 0
        ? `<span class="ready">${icon('check', 'icon-sm')} Tienes todo</span>`
        : `<span class="match-line"><span class="progress thin"><span style="width:${m.ratio * 100}%"></span></span><span class="num">${m.have}/${m.total}</span></span>
           <span class="missing">Falta: ${esc(missNames)}${m.missing.length > 3 ? '…' : ''}</span>`}
    </span>
  </button>`;
}

// Detalle de receta
function openRecipe(id, slotId = null) {
  const s = S();
  const r = findRecipe(id);
  if (!r) return toast('No encontré esa receta.');
  const m = matchInfo(r);
  const type = r.meals[0];
  const slots = getSlots(s.profile.mealsPerDay);
  const doneIds = new Set(todayLog().map((l) => l.slot));
  const isExtra = String(slotId || '').startsWith('extra');
  const targetSlot = isExtra
    ? { id: slotId === 'extra' ? 'extra_' + Date.now().toString(36) : slotId, name: 'Snack extra', extra: true }
    : slotId
      ? slots.find((x) => x.id === slotId)
      : slots.find((x) => r.meals.includes(x.type) && !doneIds.has(x.id)) || slots.find((x) => !doneIds.has(x.id));
  const slotDone = targetSlot && doneIds.has(targetSlot.id);
  const heroColor = r.ai ? 'var(--ai)' : { desayuno: '#B5600A', snack: '#26774A', comida: '#C2410C', cena: '#3D4CC0' }[type];
  const saved = r.ai && s.aiRecipes[r.id];
  const inShop = new Set(s.shopping.map((x) => x.key));

  const body = `<div class="stack">
    <div class="recipe-hero" style="background:${heroColor}">
      <div class="row" style="gap:6px;flex-wrap:wrap">${r.meals.map((t) => `<span class="badge">${t[0].toUpperCase() + t.slice(1)}</span>`).join('')}${r.ai ? '<span class="badge">Creada con IA</span>' : ''}</div>
      <h2>${esc(r.name)}</h2>
      <p style="margin-top:6px;opacity:.95;font-weight:700" class="row">${icon('clock', 'icon-sm')} ${r.time} min · ${r.servings || 1} porción</p>
    </div>
    <div class="macros">
      <div class="macro"><b class="num">${r.kcal}</b><small>kcal</small></div>
      <div class="macro"><b class="num">${r.p}g</b><small>proteína</small></div>
      <div class="macro"><b class="num">${r.c}g</b><small>carbs</small></div>
      <div class="macro"><b class="num">${r.f}g</b><small>grasa</small></div>
    </div>
    <p class="tiny muted">Valores aproximados por porción.</p>
    ${r.warnings?.length ? `<div class="notice warn" role="note">${icon('alert')}<span>Revisa esta receta: la IA incluyó <b>${esc(r.warnings.join(', '))}</b>, que tu dieta evita. Cámbialo o sáltalo.</span></div>` : ''}
    ${familyActive() ? `<div class="notice info">${icon('users')}<span>Cocinas para ${planningProfiles().length}: multiplica las cantidades ×${planningProfiles().length}.</span></div>` : ''}

    <section>
      <div class="row between"><h3>Ingredientes</h3><span class="small muted num">Tienes ${m.have} de ${m.total}</span></div>
      ${m.missing.length ? `<p class="tiny muted" style="margin-top:4px">¿Te falta algo? <b>Lo tengo</b> lo agrega a tu despensa; el carrito lo manda a <b>Por comprar</b>.</p>` : ''}
      <ul class="ing-list">
        ${r.ingredients.map((i) => {
          const have = hasIngredient(i);
          const key = ING[i.id] ? i.id : 'c:' + norm(i.name);
          return `<li>
            <span class="ing-check ${have ? 'have' : 'miss'}">${icon(have ? 'check' : 'cart', 'icon-sm')}</span>
            <span class="ing-name">${esc(ingredientName(i))}<br><span class="ing-qty">${esc(i.qty)}</span></span>
            ${!have ? `<span class="ing-actions">
              <button class="btn btn-ghost btn-sm" data-act="have-it" data-key="${esc(key)}" data-name="${esc(ingredientName(i))}" data-ing="${ING[i.id] ? i.id : ''}" data-recipe="${r.id}" data-slot="${slotId || ''}" aria-label="Ya tengo ${esc(ingredientName(i))}: agregar a mi despensa">${icon('check', 'icon-sm')} Lo tengo</button>
              ${inShop.has(key)
                ? `<span class="in-list" title="Está en Despensa → Por comprar">${icon('cart', 'icon-sm')}<span class="sr-only">Ya está en tu lista por comprar</span></span>`
                : `<button class="btn btn-ghost btn-icon" data-act="shop-add" data-key="${esc(key)}" data-name="${esc(ingredientName(i))}" data-ing="${ING[i.id] ? i.id : ''}" data-recipe="${r.id}" data-slot="${slotId || ''}" aria-label="Agregar ${esc(ingredientName(i))} a mi lista por comprar">${icon('cart', 'icon-sm')}</button>`}
            </span>` : ''}
          </li>`;
        }).join('')}
      </ul>
    </section>

    <section>
      <h3 style="margin-bottom:4px">Preparación</h3>
      <ol class="steps">${r.steps.map((st) => `<li><span>${esc(st)}</span></li>`).join('')}</ol>
    </section>
    ${r.ai && !saved ? `<button class="btn btn-ghost btn-block accent" data-act="ai-save" data-id="${r.id}">${icon('book')} Guardar en mi recetario</button>` : ''}
    ${r.ai && saved ? `<button class="btn btn-ghost btn-block" data-act="ai-unsave" data-id="${r.id}">${icon('trash')} Quitar de mi recetario</button>` : ''}
  </div>`;

  let foot;
  if (!targetSlot || slotDone) {
    foot = `<button class="btn btn-block" disabled>${targetSlot ? `Ya registraste tu ${targetSlot.name.toLowerCase()}` : 'Ya completaste todas tus comidas de hoy'}</button>`;
  } else {
    const bonus = m.missing.length === 0 ? XP.perfectMatch : 0;
    const gain = targetSlot.extra ? XP.extra : XP.meal + bonus;
    foot = `<button class="btn btn-ok btn-block" data-act="cook" data-id="${r.id}" data-slot="${targetSlot.id}">${icon('check')} ${targetSlot.extra ? '¡Me lo comí!' : '¡La cociné!'} +${gain} XP</button>
      <p class="tiny muted center" style="margin-top:8px">${targetSlot.extra ? 'Se suma como snack extra a tus calorías de hoy.' : `Se registra como tu ${targetSlot.name.toLowerCase()} de hoy.`}</p>`;
  }
  openSheet('', body, foot);
}

// Confirmación cuando faltan ingredientes
function confirmCook(recipe, slotId, missing) {
  const names = missing.slice(0, 5).map(ingredientName);
  const body = `<div class="confirm-box" role="alertdialog" aria-labelledby="cc-title" aria-describedby="cc-desc">
    ${mascot('think')}
    <h2 id="cc-title">¿Estás seguro de que ya lo cocinaste?</h2>
    <p id="cc-desc" class="muted">Aún te ${missing.length === 1 ? 'falta' : 'faltan'} <b>${esc(names.join(', '))}${missing.length > 5 ? ` y ${missing.length - 5} más` : ''}</b>.</p>
  </div>`;
  const foot = `<div class="stack-sm confirm-actions">
    <button class="btn btn-ok btn-block" data-act="cook" data-confirmed="1" data-id="${recipe.id}" data-slot="${slotId}">Sí, sin problema</button>
    <button class="btn btn-ghost btn-block" data-act="cook-back" data-id="${recipe.id}" data-slot="${slotId}">No, aún me faltan cosas por agregar</button>
  </div>`;
  openSheet('', body, foot, { replace: true });
  document.querySelector('.sheet-foot .btn-ghost')?.focus();
}

// ═════════════════════════ IA ═════════════════════════
function openAISheet(mealType) {
  ui.ai.meal = mealType || null;
  ui.ai.error = '';
  ui.ai.results = [];
  renderAISheet();
}

function renderAISheet() {
  const a = ui.ai;
  const meals = [[null, 'Cualquiera'], ['desayuno', 'Desayuno'], ['comida', 'Comida'], ['cena', 'Cena'], ['snack', 'Snack']];
  let body;
  if (!aiConfigured()) {
    body = `<div class="empty">
      ${mascot('sleepy')}
      <p><b>La IA está por llegar</b><br><span class="muted">Estamos terminando de conectarla. Mientras tanto, el recetario integrado funciona sin internet.</span></p>
    </div>`;
  } else {
    body = `<div class="stack">
      <div>
        <p class="label" id="ai-meal-l">Tiempo de comida</p>
        <div class="chips" role="group" aria-labelledby="ai-meal-l">${meals.map(([id, l]) => `<button class="chip" data-act="ai-meal" data-meal="${id ?? ''}" aria-pressed="${a.meal === id}">${l}</button>`).join('')}</div>
      </div>
      <div class="field">
        <label for="ai-extra">¿Algún antojo? (opcional)</label>
        <input id="ai-extra" class="input" maxlength="120" placeholder="Ej. algo rápido, sin horno, picante…" value="${esc(a.extra)}">
      </div>
      ${familyActive() ? `<div class="notice info">${icon('users')}<span>Modo familiar: las recetas deben servirles a las ${planningProfiles().length} personas.</span></div>` : ''}
      <button class="btn btn-ai btn-block" data-act="ai-generate" ${a.loading || !aiUsesLeft() ? 'disabled' : ''}>${icon('sparkles')} ${a.loading ? 'Creando…' : 'Crear 3 recetas'}</button>
      <p class="tiny muted center">Te quedan ${aiUsesLeft()} usos de IA hoy.</p>
      ${a.loading ? `<div class="loader" role="status">${mascot('think', 'sm')}<div class="dots"><i></i><i></i><i></i></div><p class="small muted">Valita está pensando recetas con tu despensa…</p><button class="linkbtn" data-act="ai-cancel">Cancelar</button></div>` : ''}
      ${a.error ? `<div class="notice err" role="alert">${icon('alert')}<span>${esc(a.error)}</span></div>` : ''}
      ${a.results.length ? `<div class="stack-sm"><p class="slot-label">Recetas nuevas</p>${a.results.map((r) => recipeCard(r)).join('')}</div>` : ''}
      <p class="tiny muted center">La IA puede equivocarse en cantidades o calorías. Revisa que los ingredientes sean compatibles con tu dieta.</p>
    </div>`;
  }
  openSheet(`<h2 class="row" style="gap:8px;color:var(--ai)">${icon('sparkles')}<span style="color:var(--ink)">Recetas con IA</span></h2>`, body, '', { replace: true });
}

async function runAI() {
  const a = ui.ai;
  a.extra = document.getElementById('ai-extra')?.value || '';
  a.loading = true;
  a.error = '';
  a.results = [];
  a.controller = new AbortController();
  renderAISheet();
  try {
    const recipes = await generateRecipes({ mealType: a.meal, extra: a.extra, signal: a.controller.signal });
    recipes.forEach(registerDraft);
    a.results = recipes;
    if (!recipes.length) a.error = 'La IA no regresó recetas. Intenta de nuevo.';
  } catch (err) {
    a.error = aiErrorMessage(err);
  } finally {
    a.loading = false;
    if (document.querySelector('.sheet')) renderAISheet();
  }
}

// ═════════════════════════ PLAN SEMANAL ═════════════════════════
function planScreen() {
  const s = S();
  const t = today();
  const plan = s.plan;
  const expired = !plan || plan.days[plan.days.length - 1].date < t;
  if (expired) {
    return `<div class="stack">
      <h1>Plan semanal</h1>
      <div class="empty card">${mascot('happy')}
        <p><b>${canUse('weekPlan') ? 'Armo tu semana en un segundo' : 'Armo tu menú de hoy'}</b><br><span class="muted">${canUse('weekPlan') ? '7 días de recetas de tu dieta, priorizando lo que ya tienes, y tu lista del súper con lo que falta.' : 'Recetas de tu dieta para hoy con lo que ya tienes. Con Pro planeas los 7 días.'}</span></p>
        <button class="btn btn-block" data-act="plan-generate">${icon('calendar')} ${canUse('weekPlan') ? 'Generar mi semana' : 'Generar mi día'}</button>
        <p>${proBadge('weekPlan')}</p>
      </div>
    </div>`;
  }
  const slots = getSlots(s.profile.mealsPerDay);
  const weekOk = canUse('weekPlan');
  if (!ui.planDay || !plan.days.some((d) => d.date === ui.planDay)) ui.planDay = plan.days.find((d) => d.date >= t)?.date || plan.days[0].date;
  if (!weekOk) ui.planDay = t;
  const day = plan.days.find((d) => d.date === ui.planDay);
  const shopCount = s.shopping.filter((x) => !x.done).length;

  return `<div class="stack">
    <div class="row between"><div><h1>Plan semanal</h1><div style="margin-top:4px">${proBadge('weekPlan')}</div></div>
      <button class="btn btn-ghost btn-sm" data-act="plan-generate" aria-label="Generar un plan nuevo">${icon('refresh', 'icon-sm')} Nuevo</button></div>
    <div class="segmented" role="group" aria-label="Vista">
      <button data-act="plan-view" data-v="dias" aria-pressed="${ui.planView === 'dias'}">Días</button>
      <button data-act="plan-view" data-v="lista" aria-pressed="${ui.planView === 'lista'}">Lista del súper${shopCount ? ` (${shopCount})` : ''}</button>
    </div>
    ${ui.planView === 'lista' ? shoppingView() : `
    <div class="days" role="group" aria-label="Días del plan">
      ${plan.days.map((d) => {
        const dt = parseDate(d.date);
        const logged = (s.log[d.date] || []).length > 0;
        const locked = !weekOk && d.date !== t;
        return `<button class="day-btn ${locked ? 'locked' : ''}" data-act="${locked ? 'paywall' : 'plan-day'}" data-feature="weekPlan" data-date="${d.date}" aria-pressed="${d.date === ui.planDay}" aria-label="${DAY_LONG[dt.getDay()]} ${dt.getDate()}${locked ? ', disponible con Pro' : ''}">
          <small>${d.date === t ? 'Hoy' : DAY_SHORT[dt.getDay()]}</small>${locked ? icon('lock', 'icon-sm') : `<b class="num">${dt.getDate()}</b>`}<span class="dot ${logged ? 'on' : ''}"></span></button>`;
      }).join('')}
    </div>
    <div class="stack-sm">
      ${slots.map((slot) => {
        const r = findRecipe(day.slots[slot.id]);
        const logged = (s.log[day.date] || []).find((l) => l.slot === slot.id);
        if (!r) return `<div class="card slot-card"><span class="small muted">Sin receta compatible para ${slot.name.toLowerCase()}.</span></div>`;
        const m = matchInfo(r);
        return `<div class="card slot-card">
          <button class="row" style="flex:1;min-width:0;gap:12px;background:none;border:0;padding:0;text-align:left" data-act="recipe" data-id="${r.id}" ${day.date === t ? `data-slot="${slot.id}"` : ''}>
            <span class="recipe-thumb ${r.ai ? 'thumb-ai' : 'thumb-' + slot.type}" aria-hidden="true">${icon(logged ? 'check' : MEAL_ICON[slot.type])}</span>
            <span class="recipe-body"><span class="slot-label">${slot.name}</span><span class="recipe-name" style="font-size:16px">${esc(r.name)}</span>
            <span class="meta"><span>${r.time} min</span><span class="num">${r.kcal} kcal</span>${m.missing.length ? `<span style="color:var(--warn)">Faltan ${m.missing.length}</span>` : '<span style="color:var(--ok-ink)">Tienes todo</span>'}</span></span>
          </button>
          ${!logged ? `<button class="btn btn-ghost btn-icon" data-act="plan-swap" data-date="${day.date}" data-slot="${slot.id}" aria-label="Cambiar ${slot.name.toLowerCase()} por otra receta">${icon('refresh')}</button>` : ''}
        </div>`;
      }).join('')}
    </div>
    <p class="small muted center">${dayKcal(day)} kcal aprox. este día</p>
    ${!weekOk ? upsellCard('weekPlan') : ''}`}
  </div>`;
}

function dayKcal(day) {
  return Object.values(day.slots).reduce((a, id) => a + (findRecipe(id)?.kcal || 0), 0);
}

function shoppingView(context = 'plan') {
  const s = S();
  const list = s.shopping;
  const weekOk = canUse('weekShopping');
  const hasPlan = !!s.plan;
  const head = `<div class="notice info">${icon('info')}<span>Aquí llega lo que mandas con el <b>carrito</b> desde una receta${hasPlan ? ' y lo que le falta a tu plan' : ''}. Cuando lo compres, márcalo y pásalo a <b>Lo que tengo</b>.</span></div>`;
  if (!list.length) {
    return `${head}<div class="empty card">${mascot('cheer', 'sm')}<p><b>Tu lista está vacía</b><br><span class="muted">${hasPlan ? `Con tu despensa puedes cocinar ${weekOk ? 'todo el plan' : 'el menú de hoy'}.` : 'Abre una receta y toca el carrito en lo que te falte.'}</span></p></div>${hasPlan && !weekOk ? upsellCard('weekShopping') : ''}`;
  }
  const done = list.filter((x) => x.done).length;
  return `${head}<div class="card">
      ${list.map((x, i) => `<div class="shop-item ${x.done ? 'done' : ''}">
        <span class="checkbox"><input type="checkbox" id="shop-${i}" data-act-change="shop-toggle" data-key="${esc(x.key)}" ${x.done ? 'checked' : ''}><span></span></span>
        <label for="shop-${i}" class="ing-name">${esc(x.name)}${x.manual ? '' : ' <span class="small muted">· del plan</span>'}</label>
        ${x.count > 1 ? `<span class="small muted num">${x.count} recetas</span>` : ''}
        <button class="btn btn-ghost btn-icon" data-act="shop-remove" data-key="${esc(x.key)}" aria-label="Quitar ${esc(x.name)} de la lista">${icon('x', 'icon-sm')}</button>
      </div>`).join('')}
    </div>
    <button class="btn btn-ok btn-block" data-act="shop-to-pantry" ${done ? '' : 'disabled'}>${icon('check')} Ya lo compré${done ? ` (${done})` : ''}</button>
    ${hasPlan ? `<button class="btn btn-ghost btn-block" data-act="shop-refresh">${icon('refresh', 'icon-sm')} Recalcular con mi plan</button>` : ''}
    ${list.some((x) => x.done) ? '' : '<p class="tiny muted center">Marca lo que compraste y toca “Ya lo compré”: pasa a Lo que tengo.</p>'}
    ${hasPlan && !weekOk ? upsellCard('weekShopping') : ''}`;
}

// Tarjeta para invitar a Pro (solo aparece si el módulo está bloqueado)
function upsellCard(feature) {
  const f = PRO_FEATURES[feature];
  return `<button class="card pressable pro-card row" data-act="paywall" data-feature="${feature}" style="gap:14px">
    <span class="pro-icon">${icon(f.icon)}</span>
    <span style="flex:1"><b>${f.name}</b><br><span class="small">${f.desc}</span></span>
    ${icon('chevron')}
  </button>`;
}

function openPaywall(feature) {
  const focus = PRO_FEATURES[feature];
  const body = `<div class="stack">
    <div class="pro-hero">
      ${mascot('cheer')}
      <div><span class="badge pro">PRO</span><h2 style="margin-top:6px">Cocina sin límites</h2>
      <p class="small" style="margin-top:4px">${focus ? `${esc(focus.name)} es parte de Pro.` : 'Desbloquea todo lo que Valita puede hacer por ti.'}</p></div>
    </div>
    <ul class="pro-list">
      ${Object.entries(PRO_FEATURES).map(([id, f]) => `<li class="${id === feature ? 'hl' : ''}"><span class="pro-icon">${icon(f.icon)}</span><span><b>${f.name}</b><br><span class="small muted">${f.desc}</span></span></li>`).join('')}
    </ul>
    <p class="small muted center">Siempre gratis: tu dieta, despensa, recetario, recetas del día, racha, XP y logros.</p>
  </div>`;
  const foot = `<p class="center bold" style="margin-bottom:10px">${esc(PREMIUM.price)}</p>
    <button class="btn btn-block" disabled>Próximamente</button>
    <p class="tiny muted center" style="margin-top:8px">Los pagos todavía no están activos en esta versión de prueba.</p>`;
  openSheet('', body, foot);
}

function rebuildShopping() {
  const s = S();
  if (!s.plan) return;
  const fresh = shoppingFromPlan(s.plan, today(), canUse('weekShopping') ? null : today());
  const prevDone = new Set(s.shopping.filter((x) => x.done).map((x) => x.key));
  const manual = s.shopping.filter((x) => x.manual && !fresh.some((f) => f.key === x.key));
  update((st) => {
    st.shopping = [...fresh.map((f) => ({ ...f, done: prevDone.has(f.key) })), ...manual];
  });
}

// ═════════════════════════ PERFIL ═════════════════════════
function profileScreen() {
  const s = S();
  const lv = levelFromXp(s.xp);
  const diet = getDiet(s.profile.diet);
  const week = lastWeek();
  const unlocked = Object.keys(s.achievements).length;

  return `<div class="stack">
    <div class="row" style="gap:16px">${mascot('happy')}
      <div style="flex:1;min-width:0"><h1 style="overflow-wrap:anywhere">${esc(s.profile.name)}</h1><p class="muted bold">Nivel ${lv.level} · ${levelTitle(lv.level)}</p></div>
    </div>
    <div class="card">
      <div class="row between" style="margin-bottom:8px"><b>Nivel ${lv.level}</b><span class="small muted num">${s.xp - lv.cur} / ${lv.next - lv.cur} XP</span></div>
      <div class="progress gold" role="progressbar" aria-label="Progreso al nivel ${lv.level + 1}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(lv.progress * 100)}"><span style="width:${lv.progress * 100}%"></span></div>
      <p class="small muted" style="margin-top:8px">Te faltan ${lv.next - s.xp} XP para ${levelTitle(lv.level + 1).toLowerCase()}.</p>
    </div>

    <div class="stats-grid">
      <div class="card stat-tile"><span style="color:var(--flame)">${icon('flame')}</span><span><b class="num">${currentStreak()}</b><small>días de racha</small></span></div>
      <div class="card stat-tile"><span style="color:var(--brand)">${icon('crown')}</span><span><b class="num">${s.streak.best}</b><small>mejor racha</small></span></div>
      <div class="card stat-tile"><span style="color:var(--ok)">${icon('utensils')}</span><span><b class="num">${cookedCount()}</b><small>comidas registradas</small></span></div>
      <div class="card stat-tile"><span style="color:var(--gold-lip)">${icon('bolt')}</span><span><b class="num">${s.xp}</b><small>XP total</small></span></div>
    </div>

    <div class="card">
      <b>Últimos 7 días</b>
      <div class="week-dots" style="margin-top:12px">${week.map((d) => `<div><i class="${d.done ? 'on' : d.frozen ? 'frz' : ''}" aria-hidden="true">${d.done ? icon('flame', 'icon-sm') : d.frozen ? icon('shield', 'icon-sm') : ''}</i>${DAY_SHORT[parseDate(d.date).getDay()][0]}<span class="sr-only">${d.done ? 'cumplido' : d.frozen ? 'protegido' : 'sin registro'}</span></div>`).join('')}</div>
    </div>

    ${streakFreezeCard()}
    ${canUse('nutrition') ? weekChart() + kcalGoalCard() : ''}

    <div class="section-title"><h2>Logros</h2><span class="badge num">${unlocked}/${ACHIEVEMENTS.length}</span></div>
    <div class="ach-grid">${ACHIEVEMENTS.map((a) => {
      const on = !!s.achievements[a.id];
      return `<div class="ach ${on ? 'on' : 'off'}"><span class="ach-badge">${icon(a.icon)}</span><b>${a.name}</b><small>${a.desc}</small><span class="sr-only">${on ? 'Desbloqueado' : 'Bloqueado'}</span></div>`;
    }).join('')}</div>

    <div class="section-title"><h2>Mi dieta</h2></div>
    <div class="card stack-sm">
      <div class="row" style="gap:12px"><span class="diet-icon" style="background:${diet.color}" aria-hidden="true">${dietIconText(diet)}</span>
        <div style="flex:1"><b style="font-size:18px">${esc(diet.name)}</b><br><span class="badge ${diet.evidence}">${EVIDENCE_LABEL[diet.evidence]}</span></div></div>
      <p class="small">${esc(diet.short)}</p>
      <p class="small muted"><b>Respaldo:</b> ${esc(diet.proof)}</p>
      ${diet.warning ? `<div class="notice warn">${icon('alert')}<span>${esc(diet.warning)}</span></div>` : ''}
      ${diet.custom ? `<button class="btn btn-ghost btn-block" data-act="diet-edit" data-id="${diet.id}">${icon('sliders', 'icon-sm')} Editar mi dieta</button>` : ''}
      <button class="btn btn-ghost btn-block" data-act="change-diet">Cambiar de dieta</button>
    </div>

    ${customDietsSection()}
    ${suggestSection()}

    <div class="section-title"><h2>Ajustes</h2></div>
    <div class="card stack">
      <div>
        <p class="label" id="set-mpd">Comidas al día</p>
        <div class="segmented" role="group" aria-labelledby="set-mpd">${[3, 4, 5].map((n) => `<button data-act="set-mpd" data-n="${n}" aria-pressed="${s.profile.mealsPerDay === n}">${n}</button>`).join('')}</div>
      </div>
      ${diet.id === 'vegetariana' ? `<div class="toggle-row"><label for="set-vegan"><b>Modo vegano</b></label><span class="switch"><input type="checkbox" id="set-vegan" ${s.profile.vegan ? 'checked' : ''}><span></span></span></div>` : ''}
      ${diet.fasting ? fastingFields(s.profile.fastStart, s.profile.fastHours, 'set') : ''}
    </div>

    ${familySection()}

    <div class="section-title"><h2>Mi plan</h2>${s.pro?.active ? '<span class="badge pro">PRO</span>' : ''}</div>
    <div class="card pro-card stack">
      <div class="row" style="gap:12px"><span class="pro-icon">${icon('crown')}</span>
        <div style="flex:1"><b>${s.pro?.active ? 'Tienes Pro' : isOpenBeta() ? 'Beta abierta: todo desbloqueado' : 'Plan gratuito'}</b><br>
        <span class="small">${isOpenBeta() ? 'Durante la beta puedes usar los módulos Pro sin costo.' : s.pro?.active ? 'Gracias por apoyar la app.' : 'Desbloquea la IA, el plan de 7 días y la lista semanal.'}</span></div></div>
      <ul class="pro-list compact">${Object.values(PRO_FEATURES).map((f) => `<li><span class="pro-icon sm">${icon(f.icon, 'icon-sm')}</span><span class="small"><b>${f.name}</b></span></li>`).join('')}</ul>
      <button class="btn btn-ghost btn-block" data-act="paywall" data-feature="">Ver qué incluye Pro</button>
    </div>

    <div class="section-title"><h2>Herramientas de prueba</h2></div>
    <div class="card stack-sm">
      <div class="toggle-row"><label for="dev-free"><b>Simular cuenta gratuita</b><br><span class="small muted">Para ver cómo se ven los módulos bloqueados</span></label>
        <span class="switch"><input type="checkbox" id="dev-free" ${s.devSimulateFree ? 'checked' : ''}><span></span></span></div>
      <div class="toggle-row"><span><b>Inteligencia artificial</b><br><span class="small muted">${aiConfigured() ? 'Servidor configurado' : 'Falta configurar AI_ENDPOINT en js/config.js'}</span></span>
        <button class="btn btn-ghost btn-sm" data-act="ai-ping" ${aiConfigured() ? '' : 'disabled'}>Probar</button></div>
      <div id="ai-test-msg" role="status"></div>
    </div>

    ${ui.installEvt ? `<button class="btn btn-ghost btn-block" data-act="install">${icon('download')} Instalar en mi teléfono</button>` : ''}

    <button class="btn btn-ghost btn-block" data-act="reset" style="--t:var(--err)">${icon('trash')} Borrar mis datos</button>
    <button class="btn btn-ghost btn-block" data-act="terms">${icon('info', 'icon-sm')} Términos y privacidad</button>
  </div>`;
}

function streakFreezeCard() {
  const s = S();
  if (!canUse('streakFreeze')) {
    return `<button class="card pressable pro-card row" data-act="paywall" data-feature="streakFreeze" style="gap:14px">
      <span class="pro-icon">${icon('shield')}</span><span style="flex:1"><b>Protector de racha</b><br><span class="small">Que un día sin registrar no te quite tu racha.</span></span>${icon('lock')}</button>`;
  }
  const n = s.streak.freezes ?? 0;
  return `<div class="card row" style="gap:14px">
    <span class="fast-ring out" style="background:#E6F4FF;color:#1F6FA8">${icon('shield')}</span>
    <span style="flex:1"><span class="row" style="gap:8px;flex-wrap:wrap"><b>Protector de racha</b>${proBadge('streakFreeze')}</span>
    <span class="small muted">Te quedan <b class="num">${n}</b> de ${FREEZES_PER_MONTH} este mes. Se usan solos si un día no registras.</span></span>
  </div>`;
}

function kcalGoalCard() {
  const s = S();
  const tg = macroTargets();
  const tot = dayTotals(today());
  const slots = getSlots(s.profile.mealsPerDay);
  const split = MEAL_SPLIT[slots.length] || MEAL_SPLIT[3];
  const mk = { p: tg.p * 4, c: tg.c * 4, f: tg.f * 9 };
  const sum = mk.p + mk.c + mk.f;
  const pct = { p: Math.round((mk.p / sum) * 100), c: Math.round((mk.c / sum) * 100), f: 0 };
  pct.f = 100 - pct.p - pct.c;
  const rows = [
    ['p', 'Proteína', '#2B7FB8'],
    ['c', 'Carbohidratos', '#D9790F'],
    ['f', 'Grasa', '#7A4FD0'],
  ];
  const body = s.profile.body;
  return `<div class="section-title"><h2>Meta diaria de calorías</h2>${proBadge('nutrition')}</div>
  <div class="card stack">
    <div class="row between" style="align-items:flex-end">
      <div><span class="kcal-big num">${tg.kcal}</span> <span class="muted bold">kcal al día</span></div>
      <span class="small muted num">Hoy: ${Math.round(tot.kcal)} (${Math.round((tot.kcal / tg.kcal) * 100)}%)</span>
    </div>
    <div class="row" style="gap:8px">
      <div class="field" style="flex:1"><label for="kcal-goal" class="small">Cambiar meta</label>
        <input id="kcal-goal" class="input num" type="number" inputmode="numeric" min="1000" max="5000" step="50" value="${tg.kcal}"></div>
      <button class="btn btn-ghost" style="align-self:flex-end" data-act="kcal-calc">${icon('sliders', 'icon-sm')} Calcular</button>
    </div>
    ${body?.weight ? `<p class="tiny muted">Calculada con: ${body.sex === 'm' ? 'hombre' : 'mujer'}, ${body.age} años, ${body.weight} kg, ${body.height} cm.</p>` : ''}

    <div>
      <p class="label">Tus macros (según tu dieta ${esc(getDiet(s.profile.diet).name)})</p>
      <div class="macro-stack" role="img" aria-label="Proteína ${pct.p}%, carbohidratos ${pct.c}%, grasa ${pct.f}%">
        ${rows.map(([k, , c]) => `<span style="width:${pct[k]}%;background:${c}"></span>`).join('')}
      </div>
      <table class="macro-table">
        <thead><tr><th scope="col">Macro</th><th scope="col">Gramos</th><th scope="col">kcal</th><th scope="col">%</th><th scope="col">Hoy</th></tr></thead>
        <tbody>${rows.map(([k, l, c]) => `<tr><th scope="row"><span class="dot-sw" style="background:${c}"></span>${l}</th><td class="num">${tg[k]} g</td><td class="num">${mk[k]}</td><td class="num">${pct[k]}%</td><td class="num">${Math.round(tot[k])} g</td></tr>`).join('')}</tbody>
      </table>
    </div>

    <div>
      <p class="label">Reparto sugerido por comida</p>
      <ul class="meal-split">${slots.map((sl) => {
        const share = split[sl.id] || 0;
        const k = Math.round((tg.kcal * share) / 10) * 10;
        const eaten = (s.log[today()] || []).filter((l) => l.slot === sl.id).reduce((a, l) => a + (l.kcal || 0), 0);
        return `<li><span class="meal-ic">${icon(MEAL_ICON[sl.type], 'icon-sm')}</span><span style="flex:1">${sl.name}<br><span class="tiny muted">${Math.round(share * 100)}% de tu día</span></span>
          <span class="num bold">${k} kcal</span>${eaten ? `<span class="badge alta num">${eaten} hoy</span>` : ''}</li>`;
      }).join('')}</ul>
    </div>
    <p class="tiny muted">1 g de proteína o carbohidrato = 4 kcal · 1 g de grasa = 9 kcal. Si tienes una condición de salud, define tu meta con un profesional.</p>
  </div>`;
}

function familySection() {
  const s = S();
  const fam = s.family;
  const f = ui.famForm;
  if (!canUse('family')) {
    return `<div class="section-title"><h2>Mi familia</h2>${proBadge('family')}</div>${upsellCard('family')}`;
  }
  return `<div class="section-title"><h2>Mi familia</h2>${proBadge('family')}</div>
    <div class="card stack">
      <div class="toggle-row"><label for="fam-on"><b>Planear para toda la familia</b><br><span class="small muted">Recetas que cumplan la dieta de todos</span></label>
        <span class="switch"><input type="checkbox" id="fam-on" ${fam.enabled ? 'checked' : ''} ${fam.members.length ? '' : 'disabled'}><span></span></span></div>
      <ul class="fam-list">
        <li><span class="diet-dot" style="background:${getDiet(s.profile.diet).color}"></span><span style="flex:1"><b>${esc(s.profile.name)}</b> (tú)<br><span class="small muted">${esc(getDiet(s.profile.diet).name)}</span></span></li>
        ${fam.members.map((m) => `<li><span class="diet-dot" style="background:${getDiet(m.diet).color}"></span><span style="flex:1"><b>${esc(m.name)}</b><br><span class="small muted">${esc(getDiet(m.diet).name)}${m.vegan ? ' · vegano' : ''}</span></span>
          <button class="btn btn-ghost btn-icon" data-act="fam-remove" data-id="${m.id}" aria-label="Quitar a ${esc(m.name)}">${icon('trash', 'icon-sm')}</button></li>`).join('')}
      </ul>
      ${fam.members.length < 7 ? `<div class="stack-sm fam-form">
        <p class="label">Agregar a alguien</p>
        <div class="field"><label for="fam-name" class="small">Nombre</label><input id="fam-name" class="input" maxlength="24" value="${esc(f.name)}" ${f.error ? 'aria-invalid="true" aria-describedby="fam-err"' : ''}>
          ${f.error ? `<p class="field-error" id="fam-err">${f.error}</p>` : ''}</div>
        <div class="field"><label for="fam-diet" class="small">Su dieta</label>
          <select id="fam-diet" class="input">${[...DIETS, ...customDiets()].map((d) => `<option value="${d.id}" ${f.diet === d.id ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}</select></div>
        <label class="row small bold" style="min-height:44px"><span class="checkbox"><input type="checkbox" id="fam-vegan" ${f.vegan ? 'checked' : ''}><span></span></span> Es vegano (solo aplica a Vegetariana)</label>
        <button class="btn btn-ghost btn-block" data-act="fam-add">${icon('plus', 'icon-sm')} Agregar</button>
      </div>` : ''}
      ${fam.enabled && famRecipeCount() < 8 ? `<div class="notice warn">${icon('alert')}<span>Con estas dietas juntas hay pocas recetas compatibles (${famRecipeCount()}). Usa la IA para crear más.</span></div>` : ''}
    </div>`;
}

function famRecipeCount() {
  return rankRecipes({}).length;
}

// ── Escanear despensa ──
function openScanSheet() {
  ui.scan = { loading: false, error: '', items: [], picked: new Set(), preview: '', controller: null };
  renderScanSheet();
}

function renderScanSheet() {
  const sc = ui.scan;
  let body;
  if (!aiConfigured()) {
    body = `<div class="empty">${mascot('sleepy')}<p><b>El escaneo está por llegar</b><br><span class="muted">Estamos terminando de conectar la IA.</span></p></div>`;
  } else if (sc.loading) {
    body = `<div class="stack">${sc.preview ? `<img class="scan-preview" src="${sc.preview}" alt="Tu foto">` : ''}
      <div class="loader" role="status">${mascot('think', 'sm')}<div class="dots"><i></i><i></i><i></i></div><p class="small muted">Valita está viendo tu foto…</p><button class="linkbtn" data-act="scan-cancel">Cancelar</button></div></div>`;
  } else if (sc.items.length) {
    const s = S();
    body = `<div class="stack">
      ${sc.preview ? `<img class="scan-preview" src="${sc.preview}" alt="Tu foto">` : ''}
      <p class="bold">Encontré ${sc.items.length} ingredientes. Desmarca lo que no sea correcto:</p>
      <div class="card">${sc.items.map((it, i) => {
        const already = it.id ? s.pantry.includes(it.id) : s.customPantry.some((c) => norm(c.name) === norm(it.name));
        return `<div class="shop-item"><span class="checkbox"><input type="checkbox" id="scan-${i}" data-act-change="scan-pick" data-key="${esc(it.key)}" ${sc.picked.has(it.key) ? 'checked' : ''} ${already ? 'disabled' : ''}><span></span></span>
          <label for="scan-${i}" class="ing-name">${esc(it.name)}${already ? ' <span class="small muted">· ya lo tienes</span>' : ''}${!it.id ? ' <span class="small muted">· nuevo</span>' : ''}</label></div>`;
      }).join('')}</div>
      <button class="btn btn-ghost btn-block" data-act="scan-pick-photo">${icon('camera', 'icon-sm')} Escanear otra foto</button>
    </div>`;
  } else {
    body = `<div class="stack">
      <div class="speech">${mascot('happy', 'sm')}<div class="bubble">Abre tu refri o alacena y toma una foto donde se vea bien la comida.</div></div>
      ${sc.error ? `<div class="notice err" role="alert">${icon('alert')}<span>${esc(sc.error)}</span></div>` : ''}
      <button class="btn btn-ai btn-block" data-act="scan-pick-photo" ${aiUsesLeft() ? '' : 'disabled'}>${icon('camera')} Tomar o elegir foto</button>
      <p class="tiny muted center">Te quedan ${aiUsesLeft()} usos de IA hoy. La foto se envía solo para reconocer ingredientes.</p>
    </div>`;
  }
  const foot = sc.items.length && !sc.loading
    ? `<button class="btn btn-ok btn-block" data-act="scan-add" ${sc.picked.size ? '' : 'disabled'}>${icon('check')} Agregar ${sc.picked.size} a mi despensa</button>`
    : '';
  openSheet(`<h2 class="row" style="gap:8px;color:var(--ai)">${icon('camera')}<span style="color:var(--ink)">Escanear despensa</span></h2>`, body, foot, { replace: true });
}

async function runScan(file) {
  const sc = ui.scan;
  sc.error = '';
  sc.items = [];
  sc.loading = true;
  sc.controller = new AbortController();
  try {
    const img = await compressImage(file);
    sc.preview = img.preview;
    renderScanSheet();
    const items = await scanPantry(img, { signal: sc.controller.signal });
    const s = S();
    sc.items = items;
    sc.picked = new Set(items.filter((it) => !(it.id ? s.pantry.includes(it.id) : s.customPantry.some((c) => norm(c.name) === norm(it.name)))).map((it) => it.key));
  } catch (err) {
    sc.error = err?.message === 'NOT_IMAGE' ? 'Ese archivo no es una imagen.' : aiErrorMessage(err);
    sc.preview = '';
  } finally {
    sc.loading = false;
    if (document.querySelector('.sheet')) renderScanSheet();
  }
}

// ═════════════════════════ DIETAS PROPIAS ═════════════════════════
function dietLimits() {
  return canUse('customDiet') ? CUSTOM_LIMITS.pro : CUSTOM_LIMITS.free;
}

function customDietsSection() {
  const s = S();
  const lim = dietLimits();
  const list = s.customDiets;
  return `<div class="section-title"><h2>Mis dietas propias</h2>${proBadge('customDiet')}</div>
    <div class="card stack-sm">
      ${list.length ? `<ul class="fam-list">${list.map((c) => {
        const d = getDiet(c.id);
        const active = s.profile.diet === c.id;
        return `<li><span class="diet-dot" style="background:${d.color}"></span>
          <span style="flex:1;min-width:0"><b>${esc(c.name)}</b>${active ? ' <span class="badge alta">En uso</span>' : ''}<br><span class="small muted">${esc(d.short)}</span></span>
          ${active ? '' : `<button class="btn btn-ghost btn-sm" data-act="diet-use" data-id="${c.id}">Usar</button>`}
          <button class="btn btn-ghost btn-icon" data-act="diet-edit" data-id="${c.id}" aria-label="Editar ${esc(c.name)}">${icon('sliders', 'icon-sm')}</button></li>`;
      }).join('')}</ul>` : '<p class="small muted">Crea una dieta con tus propias reglas: lo que no comes, ingredientes que no te gustan y tu límite de calorías.</p>'}
      ${list.length < lim.diets
        ? `<button class="btn btn-ghost btn-block" data-act="diet-new">${icon('plus', 'icon-sm')} Crear dieta propia</button>`
        : `<button class="card pressable pro-card row" data-act="paywall" data-feature="customDiet" style="gap:12px"><span class="pro-icon sm">${icon('lock', 'icon-sm')}</span><span class="small" style="flex:1">Con Pro puedes tener hasta ${CUSTOM_LIMITS.pro.diets} dietas propias.</span>${icon('chevron')}</button>`}
      <p class="tiny muted">${canUse('customDiet') ? `Pro: hasta ${CUSTOM_LIMITS.pro.diets} dietas, todas las restricciones, ingredientes a evitar y calorías por comida.` : `Gratis: ${CUSTOM_LIMITS.free.diets} dieta propia con hasta ${CUSTOM_LIMITS.free.rules} restricciones.`}</p>
    </div>`;
}

function openDietEditor(id = null) {
  const c = id ? S().customDiets.find((x) => x.id === id) : null;
  ui.dietForm = c
    ? { id: c.id, name: c.name, exclude: [...c.exclude], avoidIngs: [...(c.avoidIngs || [])], kcalMax: c.kcalMax ? { ...c.kcalMax } : { desayuno: '', comida: '', cena: '', snack: '' }, q: '', error: '' }
    : { id: null, name: '', exclude: [], avoidIngs: [], kcalMax: { desayuno: '', comida: '', cena: '', snack: '' }, q: '', error: '' };
  renderDietEditor();
}

function renderDietEditor() {
  const f = ui.dietForm;
  const lim = dietLimits();
  const pro = canUse('customDiet');
  const atRuleLimit = f.exclude.length >= lim.rules;
  const q = norm(f.q || '');
  const sugg = q ? INGREDIENTS.filter((i) => !i.flags.has('staple') && norm(i.name).includes(q) && !f.avoidIngs.includes(i.id)).slice(0, 5) : [];
  const body = `<div class="stack">
    <div class="field">
      <label for="cd-name">Nombre de tu dieta</label>
      <input id="cd-name" class="input" maxlength="30" placeholder="Ej. Mi dieta sin gluten" value="${esc(f.name)}" ${f.error ? 'aria-invalid="true" aria-describedby="cd-err"' : ''}>
      ${f.error ? `<p class="field-error" id="cd-err">${esc(f.error)}</p>` : ''}
    </div>
    <div>
      <p class="label">¿Qué no comes? <span class="small muted num">(${f.exclude.length}${pro ? '' : ` de ${lim.rules}`})</span></p>
      <div class="chips">${CUSTOM_RULES.map((r) => {
        const on = f.exclude.includes(r.flag);
        return `<button class="chip ok-on" data-act="cd-rule" data-flag="${r.flag}" aria-pressed="${on}" ${!on && atRuleLimit ? 'disabled aria-disabled="true"' : ''}>${on ? icon('check', 'icon-sm') : ''}${r.label}</button>`;
      }).join('')}</div>
      ${!pro && atRuleLimit ? `<p class="field-help">Llegaste al límite gratuito. <button class="linkbtn" data-act="paywall" data-feature="customDiet">Más con Pro</button></p>` : ''}
    </div>

    <div class="${pro ? '' : 'locked-block'}">
      <p class="label row" style="gap:8px">Ingredientes que no te gustan ${proBadge('customDiet')}</p>
      ${pro ? `<div class="search-wrap">${icon('search')}<label for="cd-q" class="sr-only">Buscar ingrediente para evitar</label><input id="cd-q" class="input" placeholder="Ej. cilantro, champiñones…" autocomplete="off" value="${esc(f.q)}"></div>
        <div id="cd-sugg">${sugg.length ? `<div class="suggest">${sugg.map((i) => `<button data-act="cd-avoid-add" data-id="${i.id}"><span>${esc(i.name)}</span><span class="tag">Evitar</span></button>`).join('')}</div>` : ''}</div>
        <div class="chips" style="margin-top:8px">${f.avoidIngs.map((id) => `<button class="chip chip-remove" data-act="cd-avoid-remove" data-id="${id}" aria-label="Quitar ${esc(ING[id]?.name)}">${esc(ING[id]?.name)}<span class="x">${icon('x', 'icon-sm')}</span></button>`).join('') || '<span class="small muted">Ninguno todavía.</span>'}</div>`
        : `<button class="card pressable pro-card row" data-act="paywall" data-feature="customDiet" style="gap:12px"><span class="pro-icon sm">${icon('lock', 'icon-sm')}</span><span class="small" style="flex:1">Evita ingredientes específicos y pon límite de calorías con Pro.</span></button>`}
    </div>

    ${pro ? `<div>
      <p class="label">Límite de calorías por comida (opcional)</p>
      <div class="kcal-grid">${[['desayuno', 'Desayuno'], ['comida', 'Comida'], ['cena', 'Cena'], ['snack', 'Snack']].map(([k, l]) => `<div class="field"><label for="cd-k-${k}" class="small">${l}</label><input id="cd-k-${k}" class="input num" type="number" inputmode="numeric" min="50" max="2000" step="10" placeholder="Sin límite" value="${esc(f.kcalMax[k] ?? '')}"></div>`).join('')}</div>
    </div>` : ''}

    <div class="notice warn">${icon('alert')}<span>Las dietas propias no están validadas por estudios. Si tienes una condición de salud, revísala con un profesional.</span></div>
    ${f.id ? `<button class="btn btn-ghost btn-block" data-act="cd-delete" style="--t:var(--err)">${icon('trash', 'icon-sm')} Eliminar esta dieta</button>` : ''}
  </div>`;
  const foot = `<button class="btn btn-block" data-act="cd-save">${f.id ? 'Guardar cambios' : 'Crear y usar esta dieta'}</button>`;
  openSheet(`<h2>${f.id ? 'Editar dieta' : 'Crear mi dieta'}</h2>`, body, foot, { replace: !!document.querySelector('.sheet') });
}

function readDietForm() {
  const f = ui.dietForm;
  const n = document.getElementById('cd-name');
  if (n) f.name = n.value.trim();
  for (const k of ['desayuno', 'comida', 'cena', 'snack']) {
    const el = document.getElementById('cd-k-' + k);
    if (el) f.kcalMax[k] = el.value;
  }
}

// ═════════════════════════ SUGERENCIAS ═════════════════════════
function suggestSection() {
  const list = S().suggestions;
  return `<div class="section-title"><h2>Sugerir una dieta</h2></div>
    <div class="card stack-sm">
      <p class="small">¿Te gustaría que agreguemos otra dieta? Cuéntanos cuál. La revisamos con estudios científicos antes de agregarla.</p>
      <button class="btn btn-ghost btn-block" data-act="suggest-open">${icon('sparkles', 'icon-sm')} Sugerir una dieta</button>
      ${list.length ? `<p class="slot-label" style="margin-top:6px">Tus sugerencias</p>
        <ul class="fam-list">${list.slice().reverse().map((x) => `<li><span style="flex:1;min-width:0"><b>${esc(x.name)}</b><br><span class="small muted">${esc(x.date)}</span></span>
          <span class="badge ${x.status === 'enviada' ? 'alta' : 'media'}">${x.status === 'enviada' ? 'Enviada' : 'Por enviar'}</span></li>`).join('')}</ul>` : ''}
    </div>`;
}

function openSuggest() {
  ui.sugForm = { name: '', why: '', source: '', error: '', sending: false };
  renderSuggest();
}

function renderSuggest() {
  const f = ui.sugForm;
  const body = `<div class="stack">
    <div class="speech">${mascot('happy', 'sm')}<div class="bubble">¿Qué dieta te gustaría ver? La investigamos y, si tiene respaldo, la agregamos.</div></div>
    <div class="field"><label for="sg-name">Nombre de la dieta</label>
      <input id="sg-name" class="input" maxlength="60" placeholder="Ej. Paleo, Okinawa, Atkins…" value="${esc(f.name)}" ${f.error ? 'aria-invalid="true" aria-describedby="sg-err"' : ''}>
      ${f.error ? `<p class="field-error" id="sg-err">${esc(f.error)}</p>` : ''}</div>
    <div class="field"><label for="sg-why">¿Por qué te interesa? (opcional)</label>
      <textarea id="sg-why" class="input" rows="3" maxlength="400" placeholder="Ej. Me la recomendó mi nutriólogo…">${esc(f.why)}</textarea></div>
    <div class="field"><label for="sg-src">¿Dónde la conociste? (opcional)</label>
      <input id="sg-src" class="input" maxlength="200" placeholder="Ej. un link, un libro, tu médico…" value="${esc(f.source)}"></div>
  </div>`;
  const foot = `<button class="btn btn-block" data-act="suggest-send" ${f.sending ? 'disabled' : ''}>${f.sending ? 'Enviando…' : 'Enviar sugerencia'}</button>`;
  openSheet('<h2>Sugerir una dieta</h2>', body, foot, { replace: !!document.querySelector('.sheet') });
}

async function flushSuggestions() {
  if (!aiConfigured()) return 0;
  let sent = 0;
  for (const sg of S().suggestions.filter((x) => x.status !== 'enviada')) {
    try {
      await sendSuggestion(sg);
      update((s) => { const it = s.suggestions.find((x) => x.id === sg.id); if (it) it.status = 'enviada'; });
      sent++;
    } catch {
      break; // sin conexión o sin almacenamiento: se reintenta después
    }
  }
  return sent;
}

// ═════════════════════════ HOJA (MODAL) ═════════════════════════
let lastFocus = null;
function openSheet(title, body, foot = '', { replace = false } = {}) {
  const existing = document.querySelector('.sheet-backdrop');
  if (existing && replace) {
    existing.querySelector('.sheet-title').innerHTML = title;
    existing.querySelector('.sheet-body').innerHTML = body;
    const f = existing.querySelector('.sheet-foot');
    f.innerHTML = foot;
    f.hidden = !foot;
    return;
  }
  existing?.remove();
  if (!existing) lastFocus = document.activeElement;
  const el = document.createElement('div');
  el.className = 'sheet-backdrop';
  el.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="Detalle">
    <div class="sheet-grab" aria-hidden="true"></div>
    <div class="sheet-head"><div class="sheet-title">${title}</div>
      <button class="btn btn-ghost btn-icon" data-act="sheet-close" aria-label="Cerrar">${icon('x')}</button></div>
    <div class="sheet-body">${body}</div>
    <div class="sheet-foot" ${foot ? '' : 'hidden'}>${foot}</div>
  </div>`;
  el.addEventListener('click', (e) => { if (e.target === el) closeSheet(); });
  document.body.appendChild(el);
  document.body.style.overflow = 'hidden';
  document.body.classList.add('sheet-open');
  el.querySelector('[data-act="sheet-close"]').focus();
}

function closeSheet() {
  ui.ai.controller?.abort();
  ui.scan.controller?.abort();
  document.querySelector('.sheet-backdrop')?.remove();
  document.body.style.overflow = '';
  document.body.classList.remove('sheet-open');
  lastFocus?.focus?.();
}

// ═════════════════════════ CELEBRACIÓN ═════════════════════════
function celebrate(result, recipe) {
  const lv = levelFromXp(S().xp);
  const colors = ['#FF9F45', '#FFC83D', '#4DB867', '#6A4FD8', '#C2410C', '#2B7FB8'];
  const confetti = Array.from({ length: 40 }, () => {
    const c = colors[Math.floor(Math.random() * colors.length)];
    return `<i style="left:${Math.random() * 100}%;background:${c};animation-duration:${1.6 + Math.random() * 1.6}s;animation-delay:${Math.random() * 0.4}s;transform:rotate(${Math.random() * 360}deg)"></i>`;
  }).join('');
  const title = result.perfectDay ? '¡Día perfecto!' : result.levelUp ? '¡Subiste de nivel!' : '¡Bien hecho!';
  const sub = result.perfectDay
    ? 'Completaste todas tus comidas de hoy.'
    : result.streakUp && result.streak > 1
      ? `Tu racha sigue creciendo: ${result.streak} días.`
      : result.streakUp ? '¡Empezaste tu racha! Vuelve mañana para mantenerla.' : `Registraste: ${esc(recipe?.name || '')}`;

  const el = document.createElement('div');
  el.className = 'celebrate';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', title);
  el.innerHTML = `<div class="confetti" aria-hidden="true">${confetti}</div>
    ${mascot('cheer', 'lg')}
    <h1>${title}</h1>
    <p class="muted" style="max-width:320px">${sub}</p>
    <div class="reward-row">
      <div class="reward xp"><div class="reward-h">XP ganada</div><div class="reward-b">${icon('bolt')}<span class="num">${result.xp}</span></div></div>
      <div class="reward fl"><div class="reward-h">Racha</div><div class="reward-b">${icon('flame')}<span class="num">${result.streak}</span></div></div>
      ${result.levelUp ? `<div class="reward lv"><div class="reward-h">Nivel</div><div class="reward-b num">${lv.level}</div></div>` : ''}
    </div>
    ${result.challenge ? `<div class="card unlock"><span class="ach-badge" style="background:var(--ok);color:#fff;width:48px;height:48px;border-radius:14px;display:grid;place-items:center">${icon('trophy')}</span><span><b>¡Reto del día completado!</b><br><span class="small muted">${esc(result.challenge)} · +10 XP</span></span></div>` : ''}
    ${result.unlocked.map((a) => `<div class="card unlock"><span class="ach-badge" style="background:var(--gold);color:#6B4E00;width:48px;height:48px;border-radius:14px;display:grid;place-items:center">${icon(a.icon)}</span><span><b>Logro: ${a.name}</b><br><span class="small muted">${a.desc}</span></span></div>`).join('')}
    <button class="btn btn-ok btn-block" style="max-width:360px" data-act="celebrate-close">Continuar</button>`;
  document.body.appendChild(el);
  el.querySelector('[data-act="celebrate-close"]').focus();
}

function celebrateSmall(text) {
  toast(text);
  const m = document.querySelector('.alita-btn .mascot');
  if (m) { m.classList.add('cheer'); setTimeout(() => m.classList.remove('cheer'), 1200); }
}

function announceAchievements(list) {
  if (list?.length) toast(`¡Logro desbloqueado: ${list[0].name}!`);
}

// ═════════════════════════ EVENTOS ═════════════════════════
const actions = {
  go: (el) => { ui.tab = el.dataset.tab; ui.tip = null; render(); window.scrollTo(0, 0); },

  // Onboarding
  'ob-next': () => {
    const o = ui.ob;
    if (o.step === 1) {
      o.name = (document.getElementById('ob-name')?.value || '').trim();
      if (!o.name) { o.nameError = 'Escribe tu nombre para continuar.'; return renderOnboarding(); }
      o.nameError = '';
    }
    if (o.step === 3) readObOptions();
    o.step = Math.min(o.step + 1, OB_STEPS - 1);
    renderOnboarding();
    window.scrollTo(0, 0);
  },
  'ob-back': () => { if (ui.ob.step === 3) readObOptions(); ui.ob.step = Math.max(0, ui.ob.step - 1); renderOnboarding(); },
  'ob-diet': (el) => { ui.ob.diet = el.dataset.id; ui.ob.dietOpen = el.dataset.id; const y = window.scrollY; renderOnboarding(); window.scrollTo(0, y); },
  'ob-mpd': (el) => { readObOptions(); ui.ob.mealsPerDay = Number(el.dataset.n); renderOnboarding(); },
  'ob-pick': (el) => { const p = ui.ob.pantry; const id = el.dataset.id; p.has(id) ? p.delete(id) : p.add(id); const y = window.scrollY; renderOnboarding(); window.scrollTo(0, y); },
  'ob-finish': () => {
    const o = ui.ob;
    const changing = !!o.changing;
    update((s) => {
      s.profile.name = o.name;
      s.profile.diet = o.diet;
      s.profile.vegan = o.vegan;
      s.profile.mealsPerDay = o.mealsPerDay;
      s.profile.fastStart = o.fastStart;
      s.profile.fastHours = o.fastHours;
      s.pantry = [...new Set([...s.pantry, ...o.pantry])];
      s.onboarded = true;
      if (changing) { s.plan = null; s.shopping = []; }
    });
    o.changing = false;
    refreshAchievements();
    ui.tab = 'hoy';
    render();
  },

  // Hoy
  slot: (el) => openSlotSheet(el.dataset.slot),
  'undo-meal': (el) => { undoMeal(el.dataset.slot); closeSheet(); rerenderMain(); toast('Registro deshecho.'); },

  // Despensa
  'pantry-view': (el) => { ui.pantry.view = el.dataset.v; rerenderMain(); },
  'have-it': (el) => {
    const { key, name, ing, recipe, slot } = el.dataset;
    update((s) => {
      if (ing) { if (!s.pantry.includes(ing)) s.pantry.push(ing); }
      else if (!s.customPantry.some((c) => norm(c.name) === norm(name))) s.customPantry.push({ id: 'c' + Date.now().toString(36), name });
      s.shopping = s.shopping.filter((x) => x.key !== key);
    });
    announceAchievements(refreshAchievements());
    toast(`${name} agregado a tu despensa`);
    openRecipe(recipe, slot || null);
    const main = document.getElementById('main');
    if (main) { main.innerHTML = screen(); }
    const nav = document.querySelector('.bottomnav'); if (nav) nav.outerHTML = bottomnav();
  },
  'shop-remove': (el) => { update((s) => { s.shopping = s.shopping.filter((x) => x.key !== el.dataset.key); }); rerenderMain(); },
  'pantry-loc': (el) => { ui.pantry.loc = el.dataset.loc; rerenderMain(); },
  'pantry-add': (el) => {
    const fromSearch = !!el.closest('#pantry-suggest');
    const y = window.scrollY;
    addToPantry(el.dataset.id);
    toast(`${ING[el.dataset.id].name} agregado`);
    if (fromSearch) {
      // vino del buscador: limpia y deja el cursor listo para el siguiente
      ui.pantry.query = '';
      rerenderMain();
      document.getElementById('pantry-search')?.focus();
    } else {
      // agregar rápido: no abrir el teclado ni mover la pantalla
      rerenderMain();
      document.activeElement?.blur?.();
      window.scrollTo(0, y);
    }
  },
  'pantry-add-custom': () => {
    const name = ui.pantry.query.trim().slice(0, 40);
    if (!name) return;
    update((s) => { if (!s.customPantry.some((c) => norm(c.name) === norm(name))) s.customPantry.push({ id: 'c' + Date.now().toString(36), name }); });
    refreshAchievements();
    toast(`${name} agregado`);
    ui.pantry.query = '';
    rerenderMain();
  },
  'pantry-remove': (el) => { update((s) => { s.pantry = s.pantry.filter((x) => x !== el.dataset.id); }); rerenderMain(); },
  'pantry-remove-custom': (el) => { update((s) => { s.customPantry = s.customPantry.filter((x) => x.id !== el.dataset.id); }); rerenderMain(); },

  // Recetas
  'rec-meal': (el) => { ui.recipes.meal = el.dataset.meal || null; rerenderMain(); },
  recipe: (el) => openRecipe(el.dataset.id, el.dataset.slot || null),
  cook: (el) => {
    const recipe = findRecipe(el.dataset.id);
    const missing = recipe ? matchInfo(recipe).missing : [];
    if (missing.length && el.dataset.confirmed !== '1') return confirmCook(recipe, el.dataset.slot, missing);
    const res = logMeal(el.dataset.slot, el.dataset.id);
    closeSheet();
    rerenderMain();
    if (res.xp) celebrate(res, recipe);
  },
  'cook-back': (el) => openRecipe(el.dataset.id, el.dataset.slot || null),
  'celebrate-close': () => { document.querySelector('.celebrate')?.remove(); rerenderMain(); },
  'shop-add': (el) => {
    const { key, name, ing, recipe, slot } = el.dataset;
    update((s) => { if (!s.shopping.some((x) => x.key === key)) s.shopping.push({ key, name, ingId: ing || null, count: 1, done: false, manual: true }); });
    toast(`${name} → Despensa › Por comprar`);
    openRecipe(recipe, slot || null);
    const nav = document.querySelector('.bottomnav'); if (nav) nav.outerHTML = bottomnav();
  },

  // IA
  'ai-open': (el) => (canUse('ai') ? openAISheet(el.dataset.meal || null) : openPaywall('ai')),
  'ai-meal': (el) => { ui.ai.meal = el.dataset.meal || null; ui.ai.extra = document.getElementById('ai-extra')?.value || ''; renderAISheet(); },
  'ai-generate': () => runAI(),
  'ai-cancel': () => ui.ai.controller?.abort(),
  'ai-save': (el) => {
    const r = findRecipe(el.dataset.id);
    if (!r) return;
    update((s) => { s.aiRecipes[r.id] = r; });
    toast('Guardada en tu recetario');
    openRecipe(r.id);
  },
  'ai-unsave': (el) => {
    update((s) => { delete s.aiRecipes[el.dataset.id]; });
    toast('Quitada de tu recetario');
    closeSheet();
    rerenderMain();
  },
  'ai-ping': async (el) => {
    el.disabled = true;
    el.textContent = 'Probando…';
    try {
      await pingAI();
      showAIMsg('ok', '¡Conexión exitosa con el servidor de IA!');
    } catch (err) {
      showAIMsg('err', aiErrorMessage(err));
    } finally {
      el.disabled = false;
      el.textContent = 'Probar';
    }
  },
  paywall: (el) => openPaywall(el.dataset.feature || null),

  // Inicio interactivo
  alita: () => {
    ui.tip = alitaTip();
    const b = document.getElementById('alita-bubble');
    if (b) b.innerHTML = `${tipHtml(ui.tip)}<span class="bubble-hint">Tócame otra vez</span>`;
    const m = document.querySelector('.alita-btn .mascot');
    if (m) { m.classList.remove('happy'); m.classList.add('cheer'); setTimeout(() => { m.classList.remove('cheer'); m.classList.add('happy'); }, 900); }
  },
  water: (el) => {
    const n = Number(el.dataset.n);
    const res = setWater(n);
    rerenderMain();
    if (res.xp) floatXp(document.querySelector(`[data-act="water"][data-n="${Math.min(n, WATER_GOAL)}"]`), res.xp);
    if (res.challenge) celebrateSmall('¡Reto del día completado! +10 XP');
    else if (waterToday() === WATER_GOAL && res.xp) toast(`¡Meta de agua cumplida! +${res.xp} XP`);
  },
  'snack-boost': () => openSnackBoost(),
  'kc-sex': (el) => {
    ui.kcSex = el.dataset.v;
    const b = readKcalForm();
    update((s) => { s.profile.body = b; });
    openKcalCalc();
  },
  'kcal-calc': () => openKcalCalc(),
  'kcal-calc-run': () => runKcalCalc(),
  'kcal-calc-use': (el) => {
    const v = Number(el.dataset.kcal);
    update((s) => { s.profile.kcalGoal = v; });
    closeSheet();
    rerenderMain();
    toast(`Meta actualizada: ${v} kcal`);
  },
  terms: () => openTerms(),

  // Dietas propias
  'diet-new': () => {
    if (S().customDiets.length >= dietLimits().diets) return openPaywall('customDiet');
    openDietEditor();
  },
  'diet-edit': (el) => openDietEditor(el.dataset.id),
  'diet-use': (el) => {
    update((s) => { s.profile.diet = el.dataset.id; s.plan = null; s.shopping = s.shopping.filter((x) => x.manual); });
    rerenderMain();
    toast('Dieta cambiada. Genera un plan nuevo.');
  },
  'cd-rule': (el) => {
    readDietForm();
    const f = ui.dietForm;
    const fl = el.dataset.flag;
    if (f.exclude.includes(fl)) f.exclude = f.exclude.filter((x) => x !== fl);
    else if (f.exclude.length < dietLimits().rules) f.exclude.push(fl);
    renderDietEditor();
  },
  'cd-avoid-add': (el) => {
    readDietForm();
    const f = ui.dietForm;
    if (f.avoidIngs.length < dietLimits().avoid && !f.avoidIngs.includes(el.dataset.id)) f.avoidIngs.push(el.dataset.id);
    f.q = '';
    renderDietEditor();
    document.getElementById('cd-q')?.focus();
  },
  'cd-avoid-remove': (el) => { readDietForm(); ui.dietForm.avoidIngs = ui.dietForm.avoidIngs.filter((x) => x !== el.dataset.id); renderDietEditor(); },
  'cd-save': () => {
    readDietForm();
    const f = ui.dietForm;
    if (!f.name) { f.error = 'Ponle un nombre a tu dieta.'; return renderDietEditor(); }
    const pro = canUse('customDiet');
    const kcal = {};
    if (pro) for (const [k, v] of Object.entries(f.kcalMax)) { const n = Number(v); if (n >= 50) kcal[k] = Math.min(2000, n); }
    const data = {
      id: f.id || 'custom_' + Date.now().toString(36),
      name: f.name.slice(0, 30),
      exclude: f.exclude.slice(0, dietLimits().rules),
      avoidIngs: pro ? f.avoidIngs : [],
      kcalMax: pro && Object.keys(kcal).length ? kcal : null,
    };
    const isNew = !f.id;
    const onboarding = !S().onboarded;
    update((s) => {
      const i = s.customDiets.findIndex((x) => x.id === data.id);
      if (i >= 0) s.customDiets[i] = data; else s.customDiets.push(data);
      if (isNew && !onboarding) { s.profile.diet = data.id; s.plan = null; }
      if (!isNew && s.profile.diet === data.id) s.plan = null;
    });
    closeSheet();
    if (onboarding) { ui.ob.diet = data.id; ui.ob.dietOpen = data.id; renderOnboarding(); }
    else rerenderMain();
    toast(isNew ? `Dieta “${data.name}” creada` : 'Dieta actualizada');
  },
  'cd-delete': () => {
    const id = ui.dietForm.id;
    update((s) => {
      s.customDiets = s.customDiets.filter((x) => x.id !== id);
      if (s.profile.diet === id) { s.profile.diet = 'biencomer'; s.plan = null; }
      s.family.members.forEach((m) => { if (m.diet === id) m.diet = 'biencomer'; });
    });
    closeSheet();
    if (!S().onboarded) { if (ui.ob.diet === id) ui.ob.diet = null; renderOnboarding(); } else rerenderMain();
    toast('Dieta eliminada');
  },

  // Sugerencias
  'suggest-open': () => openSuggest(),
  'suggest-send': async () => {
    const f = ui.sugForm;
    f.name = (document.getElementById('sg-name')?.value || '').trim();
    f.why = (document.getElementById('sg-why')?.value || '').trim();
    f.source = (document.getElementById('sg-src')?.value || '').trim();
    if (!f.name) { f.error = 'Escribe el nombre de la dieta.'; return renderSuggest(); }
    const t = today();
    if (S().suggestions.filter((x) => x.date === t).length >= 5) { f.error = 'Ya enviaste 5 sugerencias hoy. ¡Gracias! Intenta mañana.'; return renderSuggest(); }
    const sg = { id: 's' + Date.now().toString(36), name: f.name.slice(0, 60), why: f.why.slice(0, 400), source: f.source.slice(0, 200), currentDiet: getDiet(S().profile.diet).name, date: t, status: 'pendiente' };
    update((s) => { s.suggestions.push(sg); });
    f.sending = true;
    renderSuggest();
    const sent = await flushSuggestions();
    closeSheet();
    if (S().onboarded) rerenderMain();
    toast(sent ? '¡Gracias! Recibimos tu sugerencia.' : '¡Gracias! La guardamos y se enviará cuando haya conexión.');
  },

  // Escaneo
  'scan-open': () => (canUse('scan') ? openScanSheet() : openPaywall('scan')),
  'scan-pick-photo': () => { const i = document.getElementById('scan-input'); if (i) { i.value = ''; i.click(); } },
  'scan-cancel': () => ui.scan.controller?.abort(),
  'scan-add': () => {
    const picked = ui.scan.items.filter((it) => ui.scan.picked.has(it.key));
    update((s) => {
      for (const it of picked) {
        if (it.id) { if (!s.pantry.includes(it.id)) s.pantry.push(it.id); }
        else if (!s.customPantry.some((c) => norm(c.name) === norm(it.name))) s.customPantry.push({ id: 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name: it.name });
      }
    });
    closeSheet();
    announceAchievements(refreshAchievements());
    rerenderMain();
    toast(`${picked.length} ingredientes agregados`);
  },

  // Familia
  'fam-add': () => {
    const f = ui.famForm;
    f.name = (document.getElementById('fam-name')?.value || '').trim();
    f.diet = document.getElementById('fam-diet')?.value || f.diet;
    f.vegan = !!document.getElementById('fam-vegan')?.checked;
    if (!f.name) { f.error = 'Escribe el nombre de la persona.'; return rerenderMain(); }
    update((s) => { s.family.members.push({ id: 'm' + Date.now().toString(36), name: f.name, diet: f.diet, vegan: f.diet === 'vegetariana' && f.vegan }); });
    ui.famForm = { name: '', diet: 'mediterranea', vegan: false, error: '' };
    rerenderMain();
    toast('Persona agregada');
  },
  'fam-remove': (el) => {
    update((s) => {
      s.family.members = s.family.members.filter((m) => m.id !== el.dataset.id);
      if (!s.family.members.length) s.family.enabled = false;
      s.plan = null; s.shopping = [];
    });
    rerenderMain();
  },

  // Plan
  'plan-generate': () => {
    const lastPlanXp = S().lastPlanXp;
    const plan = generatePlan(today());
    // XP por planear, máximo una vez cada 7 días
    const earns = !lastPlanXp || addDays(lastPlanXp, 7) <= today();
    update((s) => {
      s.plan = plan;
      if (earns) { s.xp += XP.plan; s.lastPlanXp = today(); }
    });
    rebuildShopping();
    ui.planDay = today();
    ui.planView = 'dias';
    announceAchievements(refreshAchievements());
    rerenderMain();
    toast(earns ? `¡Plan listo! +${XP.plan} XP` : 'Plan nuevo listo');
  },
  'plan-day': (el) => { ui.planDay = el.dataset.date; rerenderMain(); },
  'plan-view': (el) => { ui.planView = el.dataset.v; rerenderMain(); },
  'plan-swap': (el) => {
    const { date, slot } = el.dataset;
    const s = S();
    const sl = getSlots(s.profile.mealsPerDay).find((x) => x.id === slot);
    const day = s.plan.days.find((d) => d.date === date);
    const alt = alternativeFor(sl.type, day.slots[slot], date, Object.values(day.slots));
    if (!alt) return toast('No hay otra receta compatible para ese tiempo.');
    update((st) => { st.plan.days.find((d) => d.date === date).slots[slot] = alt.id; });
    rebuildShopping();
    rerenderMain();
  },
  'shop-to-pantry': () => {
    const bought = S().shopping.filter((x) => x.done);
    update((s) => {
      for (const b of bought) {
        if (b.ingId) { if (!s.pantry.includes(b.ingId)) s.pantry.push(b.ingId); }
        else if (!s.customPantry.some((c) => norm(c.name) === norm(b.name))) s.customPantry.push({ id: 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name: b.name });
      }
      s.shopping = s.shopping.filter((x) => !x.done);
    });
    announceAchievements(refreshAchievements());
    toast(`${bought.length} ingredientes a tu despensa`);
    rerenderMain();
  },
  'shop-refresh': () => { rebuildShopping(); rerenderMain(); toast('Lista actualizada'); },

  // Perfil
  'change-diet': () => {
    const p = S().profile;
    Object.assign(ui.ob, { step: 2, name: p.name, diet: p.diet, vegan: p.vegan, mealsPerDay: p.mealsPerDay, fastStart: p.fastStart, fastHours: p.fastHours, pantry: new Set(), dietOpen: p.diet, changing: true });
    update((s) => { s.onboarded = false; });
    render();
    window.scrollTo(0, 0);
  },
  'set-mpd': (el) => {
    update((s) => { s.profile.mealsPerDay = Number(el.dataset.n); s.plan = null; s.shopping = []; });
    rerenderMain();
    toast('Listo. Genera un plan nuevo para tus comidas.');
  },
  install: async () => {
    if (!ui.installEvt) return;
    ui.installEvt.prompt();
    await ui.installEvt.userChoice;
    ui.installEvt = null;
    rerenderMain();
  },
  reset: () => {
    if (!confirmReset()) return;
    resetState();
    ui.ob = { step: 0, name: '', diet: null, vegan: false, mealsPerDay: 3, fastStart: '12:00', fastHours: 8, pantry: new Set(), dietOpen: null, nameError: '' };
    render();
  },

  'sheet-close': () => closeSheet(),
};

// Confirmación en dos toques (evita diálogos nativos que bloquean)
let resetArmed = 0;
function confirmReset() {
  if (Date.now() - resetArmed < 4000) return true;
  resetArmed = Date.now();
  toast('Toca otra vez para borrar todo. No se puede deshacer.');
  return false;
}

function readObOptions() {
  const o = ui.ob;
  const v = document.getElementById('ob-vegan');
  if (v) o.vegan = v.checked;
  const fs = document.getElementById('ob-fstart');
  if (fs?.value) o.fastStart = fs.value;
  const fh = document.getElementById('ob-fhours');
  if (fh) o.fastHours = Number(fh.value);
}

function showAIMsg(type, msg) {
  const box = document.getElementById('ai-test-msg');
  if (box) box.innerHTML = `<div class="notice ${type === 'ok' ? 'info' : 'err'}">${icon(type === 'ok' ? 'check' : 'alert')}<span>${esc(msg)}</span></div>`;
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = actions[el.dataset.act];
  if (fn) { e.preventDefault(); fn(el, e); }
});

document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.actChange === 'scan-pick') {
    t.checked ? ui.scan.picked.add(t.dataset.key) : ui.scan.picked.delete(t.dataset.key);
    renderScanSheet();
    return;
  }
  if (t.dataset.actChange === 'shop-toggle') {
    update((s) => { const it = s.shopping.find((x) => x.key === t.dataset.key); if (it) it.done = t.checked; });
    rerenderMain();
    return;
  }
  switch (t.id) {
    case 'only-ready': ui.recipes.onlyReady = t.checked; document.getElementById('recipe-list').innerHTML = recipeList(); break;
    case 'scan-input': if (t.files?.[0]) { if (!t.files[0].type.startsWith('image/')) { ui.scan.error = 'Ese archivo no es una imagen.'; renderScanSheet(); } else runScan(t.files[0]); } break;
    case 'kcal-goal': { const v = Math.min(5000, Math.max(1000, Number(t.value) || 2000)); update((s) => { s.profile.kcalGoal = v; }); rerenderMain(); toast('Meta actualizada'); break; }
    case 'fam-on': update((s) => { s.family.enabled = t.checked; s.plan = null; s.shopping = []; }); rerenderMain(); toast(t.checked ? 'Modo familiar activado. Genera un plan nuevo.' : 'Modo familiar desactivado'); break;
    case 'dev-free': update((s) => { s.devSimulateFree = t.checked; }); rebuildShopping(); rerenderMain(); toast(t.checked ? 'Viendo la app como cuenta gratuita' : 'Viendo la app con todo desbloqueado'); break;
    case 'set-vegan': update((s) => { s.profile.vegan = t.checked; s.plan = null; s.shopping = []; }); toast(t.checked ? 'Modo vegano activado' : 'Modo vegano desactivado'); break;
    case 'set-fstart': update((s) => { s.profile.fastStart = t.value || '12:00'; }); break;
    case 'set-fhours': update((s) => { s.profile.fastHours = Number(t.value); }); break;
    default:
  }
});

document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.id === 'pantry-search') {
    ui.pantry.query = t.value;
    document.getElementById('pantry-suggest').innerHTML = pantrySuggest();
  } else if (t.id === 'cd-q' && ui.dietForm) {
    ui.dietForm.q = t.value;
    const q = norm(t.value);
    const sugg = q ? INGREDIENTS.filter((i) => !i.flags.has('staple') && norm(i.name).includes(q) && !ui.dietForm.avoidIngs.includes(i.id)).slice(0, 5) : [];
    document.getElementById('cd-sugg').innerHTML = sugg.length ? `<div class="suggest">${sugg.map((i) => `<button data-act="cd-avoid-add" data-id="${i.id}"><span>${esc(i.name)}</span><span class="tag">Evitar</span></button>`).join('')}</div>` : '';
  } else if (t.id === 'recipe-search') {
    ui.recipes.query = t.value;
    document.getElementById('recipe-list').innerHTML = recipeList();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (document.querySelector('.celebrate')) actions['celebrate-close']();
    else if (document.querySelector('.sheet-backdrop')) closeSheet();
  }
  if (e.key === 'Enter') {
    if (e.target.id === 'ob-name') actions['ob-next']();
    if (e.target.id === 'pantry-search') {
      const first = document.querySelector('#pantry-suggest [data-act]:not([disabled])');
      if (first) actions[first.dataset.act](first);
    }
    if (e.target.id === 'ai-extra') runAI();
  }
});

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  ui.installEvt = e;
  if (ui.tab === 'perfil' && S().onboarded) rerenderMain();
});

// Refresca el estado del ayuno cada minuto en Hoy
setInterval(() => {
  if (S().onboarded && ui.tab === 'hoy' && getDiet(S().profile.diet).fasting && !document.querySelector('.sheet-backdrop, .celebrate')) rerenderMain();
}, 60000);

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

subscribe(() => {});
const frozen = applyStreakFreezes();
setTimeout(() => { flushSuggestions().catch(() => {}); }, 2000);
render();
if (frozen.used) setTimeout(() => toast(`Tu protector de racha cubrió ${frozen.used} ${frozen.used === 1 ? 'día' : 'días'}. ¡Tu racha sigue viva!`), 600);
