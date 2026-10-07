// Recomienda las dietas que mejor se acomodan a la meta del usuario.
// Se basa en el objetivo (bajar / mantener / subir), la edad, el IMC y la actividad,
// y en la evidencia de cada dieta (ver el reporte de dietas).
// Es una sugerencia general, no un diagnóstico.

import { DIETS } from './data/diets.js';

// Puntaje base por objetivo y la razón que se muestra al usuario
const BASE = {
  bajar: {
    bajacal: [10, 'Reducir calorías de forma controlada es lo que más evidencia tiene para bajar de peso (ensayo DiRECT).'],
    mediterranea: [9, 'Ayuda a bajar de peso sin pasar hambre y protege tu corazón (PREDIMED).'],
    ayuno: [7, 'Funciona igual que reducir calorías; te puede acomodar si prefieres comer en un horario.'],
    dash: [7, 'Baja la presión arterial y se presta para porciones controladas.'],
    flexitariana: [7, 'Más verduras y legumbres: más llenadora con menos calorías.'],
    nordica: [6, 'Rica en fibra y pescado; en estudios ayudó a bajar ~2 kg.'],
    keto: [5, 'Puede bajar peso rápido al inicio, pero es difícil de sostener y puede subir el LDL.'],
    biencomer: [5, 'Equilibrada y fácil de seguir con comida mexicana.'],
    portfolio: [4, 'Su fuerte es bajar el colesterol más que el peso.'],
    vegetariana: [5, 'Suele tener menos calorías y más fibra.'],
    mind: [4, 'Sana, aunque su enfoque es la salud del cerebro.'],
    fodmap: [0, ''],
  },
  mantener: {
    mediterranea: [10, 'La de mejor evidencia para salud general a largo plazo.'],
    dash: [9, 'Excelente para el corazón y la presión arterial.'],
    biencomer: [8, 'La guía oficial de México: variada y fácil de seguir.'],
    nordica: [8, 'Menor riesgo cardiovascular en grandes estudios.'],
    flexitariana: [8, 'Saludable y flexible, con menor mortalidad en estudios de seguimiento.'],
    vegetariana: [6, 'Adecuada en todas las etapas de la vida si está bien planeada.'],
    mind: [6, 'Combina mediterránea y DASH con foco en hojas verdes.'],
    portfolio: [5, 'Ideal si además quieres bajar el colesterol.'],
    ayuno: [4, 'Te puede acomodar por horario, aunque no da beneficios extra.'],
    bajacal: [1, ''],
    keto: [2, 'No es necesaria para mantener tu peso.'],
    fodmap: [0, ''],
  },
  subir: {
    biencomer: [10, 'Equilibrada y suficiente en energía; fácil de aumentar porciones.'],
    mediterranea: [9, 'Grasas saludables (aceite de oliva, nueces) que suman calorías de calidad.'],
    flexitariana: [7, 'Flexible para agregar proteína animal y vegetal.'],
    nordica: [7, 'Pescado, avena y tubérculos: buena energía y proteína.'],
    dash: [6, 'Saludable; solo aumenta las porciones.'],
    vegetariana: [5, 'Posible, pero cuida la proteína (legumbres, huevo, lácteos).'],
    mind: [5, 'Sana; aumenta porciones y frutos secos.'],
    portfolio: [4, 'Muy enfocada en colesterol; puede costar llegar a tus calorías.'],
    keto: [1, ''],
    ayuno: [1, ''],
    bajacal: [0, ''],
    fodmap: [0, ''],
  },
};

// Dietas que no recomendamos para cierto objetivo (y por qué)
const AVOID = {
  subir: {
    bajacal: 'Está pensada para comer menos calorías, lo contrario a tu objetivo.',
    ayuno: 'Reduce las horas para comer; dificulta subir de peso.',
    keto: 'Muy restrictiva; complica llegar a tus calorías.',
  },
  mantener: {
    bajacal: 'Está pensada para bajar de peso.',
  },
};

export function bmiOf(body) {
  if (!body?.weight || !body?.height) return null;
  const m = body.height / 100;
  return body.weight / (m * m);
}

// Devuelve [{ diet, score, reasons[] }] ordenado de mejor a peor (sin dietas propias ni FODMAP)
export function recommendDiets(body) {
  if (!body || !body.goal) return [];
  const goal = BASE[body.goal] ? body.goal : 'mantener';
  const bmi = bmiOf(body);
  const age = Number(body.age) || 0;
  const active = Number(body.activity) >= 1.55;

  return DIETS.filter((d) => d.id !== 'fodmap' && !AVOID[goal]?.[d.id])
    .map((d) => {
      const [base, why] = BASE[goal][d.id] || [3, ''];
      let score = base;
      const reasons = why ? [why] : [];
      if (goal === 'bajar' && bmi >= 30 && d.id === 'bajacal') {
        score += 2;
        reasons.push('Con tu peso actual es la que más resultados ha mostrado.');
      }
      if (age >= 45 && d.id === 'dash') {
        score += 2;
        reasons.push('Después de los 45 años cuidar la presión arterial cobra más importancia.');
      }
      if (age >= 55 && d.id === 'mind') {
        score += 2;
        reasons.push('Pensada para adultos mayores y la salud del cerebro.');
      }
      if (active && d.id === 'keto') {
        score -= 2;
        reasons.push('Con mucha actividad física, pocos carbohidratos pueden bajar tu rendimiento.');
      }
      if (active && (d.id === 'mediterranea' || d.id === 'biencomer')) {
        score += 1;
        reasons.push('Te da la energía que necesitas para tu actividad.');
      }
      return { diet: d, score, reasons };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
}

// ¿Por qué no conviene la dieta actual? (o null si está bien)
export function currentDietNote(dietId, body) {
  if (!body?.goal) return null;
  const avoid = AVOID[body.goal]?.[dietId];
  if (avoid) return avoid;
  return null;
}
