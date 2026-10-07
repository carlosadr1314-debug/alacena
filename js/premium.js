// Control de módulos Pro.
// Hoy (beta) todo está desbloqueado. Cuando actives el cobro, cambia PREMIUM.enforce
// a true en config.js y conecta setPro() con tu sistema de pagos.

import { PREMIUM } from './config.js';
import { getState, update } from './store.js';

export const PRO_FEATURES = {
  ai: { name: 'Recetas con IA', desc: 'Recetas nuevas e ilimitadas con lo que tienes en tu despensa.', icon: 'sparkles' },
  weekPlan: { name: 'Plan de 7 días', desc: 'Planea toda tu semana, no solo el día de hoy.', icon: 'calendar' },
  weekShopping: { name: 'Lista del súper semanal', desc: 'Todo lo que te falta para la semana en una sola lista.', icon: 'cart' },
  scan: { name: 'Escanear despensa con foto', desc: 'Toma una foto de tu refri o alacena y Valita agrega los ingredientes.', icon: 'camera' },
  streakFreeze: { name: 'Protector de racha', desc: '2 protectores al mes: si un día no registras, tu racha no se pierde.', icon: 'shield' },
  nutrition: { name: 'Calorías y macros', desc: 'Tu meta diaria, proteína, carbohidratos y grasa, y tu semana en gráfica.', icon: 'chart' },
  customDiet: { name: 'Dietas propias sin límites', desc: 'Hasta 5 dietas tuyas, todas las restricciones, ingredientes que no comes y límite de calorías por comida.', icon: 'sliders' },
  family: { name: 'Plan familiar', desc: 'Agrega a tu familia con su propia dieta y planea recetas que les sirvan a todos.', icon: 'users' },
};

export function isProFeature(feature) {
  return PREMIUM.features.includes(feature);
}

// ¿El usuario puede usar este módulo?
export function canUse(feature) {
  if (!isProFeature(feature)) return true;
  const s = getState();
  if (s.devSimulateFree) return false; // vista previa de cuenta gratuita
  if (!PREMIUM.enforce) return true;    // beta: todo abierto
  return !!s.pro?.active;
}

// ¿Está corriendo la beta abierta? (se muestra "Gratis en beta" junto a PRO)
export function isOpenBeta() {
  return !PREMIUM.enforce && !getState().devSimulateFree;
}

export function setPro(active) {
  update((s) => {
    s.pro = { active, since: active ? new Date().toISOString() : null };
  });
}
