// Íconos SVG (trazo, estilo redondeado) y la mascota "Brote".

const P = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  pantry: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 10h16M8 6v1M8 13v3"/>',
  chef: '<path d="M6 13.9A4 4 0 0 1 7.4 6a5 5 0 0 1 9.2 0A4 4 0 0 1 18 13.9V21H6z"/><path d="M6 17h12"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  flame: '<path class="icon-fill" d="M12 2c1 3.5 5.5 6 5.5 11.5a5.5 5.5 0 0 1-11 0c0-2.6 1.3-4.4 2.7-6C9.8 9.6 11 11 12 11.2 12.4 8.2 11.6 5 12 2z"/>',
  bolt: '<path class="icon-fill" d="M13.5 2 4 14h7l-1.5 8L19 10h-7z"/>',
  sunrise: '<path d="M12 2v4M4.9 8.9l1.4 1.4M2 16h2M20 16h2M17.7 10.3l1.4-1.4M22 20H2M16 16a4 4 0 0 0-8 0"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>',
  apple: '<path d="M12 6.5c-1.5-1-3.5-1.3-5-.5-2.5 1.3-3 4.5-2 7.5 1 3.5 3.5 7.5 5.5 7.5.8 0 1-.5 1.5-.5s.7.5 1.5.5c2 0 4.5-4 5.5-7.5 1-3 .5-6.2-2-7.5-1.5-.8-3.5-.5-5 .5zM12 6.5C12 4.5 13 3 15 2.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  sparkles: '<path d="M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7-4.7-1.8 4.7-1.8zM19 15l.8 2.2 2.2.8-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  refresh: '<path d="M21 12a9 9 0 0 1-15.5 6.2L3 16M3 12a9 9 0 0 1 15.5-6.2L21 8M21 3v5h-5M3 21v-5h5"/>',
  cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.7 12.2a1 1 0 0 0 1 .8h9.6a1 1 0 0 0 1-.8L21 7H6"/>',
  back: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/>',
  crown: '<path d="m3 8 4 4 5-7 5 7 4-4-2 11H5z"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5zM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
  leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10zM2 21c0-3 1.9-5.4 5.1-6.1C9.5 14.4 12 13 13 12"/>',
  utensils: '<path d="M3 2v7a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V2M6 2v20M21 15V2a5 5 0 0 0-5 5v6a2 2 0 0 0 2 2h3zm0 0v7"/>',
  sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
  alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
  key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.7 12.3 21 2M16 7l3 3M19 4l2 2"/>',
  star: '<path class="icon-fill" d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9z"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
  camera: '<path d="M14.5 4h-5L7.5 7H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1h-3.5z"/><circle cx="12" cy="13" r="3.5"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  chart: '<path d="M3 3v18h18"/><path d="M8 17V11M13 17V7M18 17v-4"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6"/>',
  snow: '<path d="M12 2v20M4.9 7l14.2 10M4.9 17 19.1 7M9 4l3 2 3-2M9 20l3-2 3 2"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2.5"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
};

export function icon(name, cls = '') {
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[name] || ''}</svg>`;
}

export const MEAL_ICON = { desayuno: 'sunrise', snack: 'apple', comida: 'sun', cena: 'moon' };

// Mascota original: "Brote", un brotecito verde.
// mood: happy | cheer | sleepy | think
export function mascot(mood = 'happy', size = '') {
  const mouths = {
    happy: '<path d="M42 73 Q50 81 58 73" fill="none" stroke="#22302A" stroke-width="3.2" stroke-linecap="round"/>',
    cheer: '<path d="M40 70 Q50 86 60 70 Z" fill="#7A2E2E"/><path d="M45 77 Q50 81 55 77 Q50 74 45 77Z" fill="#FF8A8A"/>',
    sleepy: '<path d="M45 75 Q50 78 55 75" fill="none" stroke="#22302A" stroke-width="3" stroke-linecap="round"/>',
    think: '<path d="M44 75 L56 73" fill="none" stroke="#22302A" stroke-width="3.2" stroke-linecap="round"/>',
  };
  const eyes =
    mood === 'sleepy'
      ? '<path d="M31 60 Q38 64 45 60M55 60 Q62 64 69 60" fill="none" stroke="#22302A" stroke-width="3.2" stroke-linecap="round"/>'
      : `<g class="m-eyes">
          <ellipse cx="38" cy="58" rx="9" ry="10.5" fill="#fff"/><ellipse cx="62" cy="58" rx="9" ry="10.5" fill="#fff"/>
          <circle cx="${mood === 'think' ? 41 : 39.5}" cy="${mood === 'think' ? 55 : 60}" r="5.4" fill="#22302A"/>
          <circle cx="${mood === 'think' ? 65 : 63.5}" cy="${mood === 'think' ? 55 : 60}" r="5.4" fill="#22302A"/>
          <circle cx="41.5" cy="57" r="1.9" fill="#fff"/><circle cx="65.5" cy="57" r="1.9" fill="#fff"/>
        </g>`;
  return `<svg class="mascot ${mood} ${size}" viewBox="0 0 100 110" role="img" aria-label="Brote, tu compañero de cocina">
    <ellipse cx="50" cy="104" rx="26" ry="4.5" fill="#22302A" opacity=".08"/>
    <g class="m-body">
      <path d="M50 34V24" stroke="#2F8F4A" stroke-width="4.5" stroke-linecap="round"/>
      <path class="m-leaf-l" d="M48 26C34 26 25 15 28 4c12 1 21 10 20 22z" fill="#3FA35A"/>
      <path class="m-leaf-r" d="M52 26c8-8 20-9 28-17-9-6-25-3-28 17z" fill="#62CB7A"/>
      <path d="M50 31c26 0 36 21 34 41-2 20-18 28-34 28S18 92 16 72c-2-20 8-41 34-41z" fill="#4DB867"/>
      <path d="M50 100c-16 0-32-8-34-28 6 14 18 20 34 20s28-6 34-20c-2 20-18 28-34 28z" fill="#3FA35A"/>
      <ellipse cx="50" cy="79" rx="21" ry="14" fill="#93DCA4"/>
      <ellipse cx="28" cy="70" rx="5.5" ry="3.4" fill="#FF8F8F" opacity=".75"/>
      <ellipse cx="72" cy="70" rx="5.5" ry="3.4" fill="#FF8F8F" opacity=".75"/>
      ${eyes}
      ${mouths[mood] || mouths.happy}
    </g>
  </svg>`;
}
