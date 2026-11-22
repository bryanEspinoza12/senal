// SEÑAL v2 · garabatos: dibujitos en línea blanca que cambian según lo que dice la letra.
const DIBUJOS = {
  planeta: '<circle cx="12" cy="12" r="5.2"/><path d="M2.5 14.6c3.4 2.2 15.4-1.4 19-6.1.9-1.3-1.4-1.6-3.6-1.1"/><path d="M5.6 13.9c-2 .4-3.5.4-3.1.7"/>',
  luna: '<path d="M15.5 3.5a8.6 8.6 0 1 0 5 13.4 7 7 0 0 1-5-13.4z"/>',
  estrella: '<path d="M12 2.5c.6 4.6 2.6 7.6 9.3 9.5-6.5 1.5-8.6 4.4-9.3 9.5-.8-5-3-7.9-9.3-9.5 6.4-1.8 8.7-4.9 9.3-9.5z"/>',
  chispa: '<path d="M12 4v16M4 12h16M7 7l10 10M17 7 7 17"/>',
  corazon: '<path d="M12 20.5C4.8 15.6 2.6 12 3.1 8.6 3.6 5.3 7.6 3.6 12 7.7c4.4-4.1 8.5-2.4 8.9.9.5 3.4-1.8 7-8.9 11.9z"/>',
  llama: '<path d="M12 21c-4.2 0-6.6-2.8-6.3-6.4.3-3.5 3.3-5.1 3.6-9.6 2.6 1.6 3.6 3.9 3.3 6.2 1.2-.8 2-2.1 2.1-3.6 2.4 2.2 3.8 4.6 3.6 7.4-.3 3.6-2.4 6-6.3 6z"/>',
  gota: '<path d="M12 3.2c-3.2 5-6 8.3-6 11.6a6 6 0 0 0 12 0c0-3.3-2.8-6.6-6-11.6z"/>',
  senal: '<circle cx="12" cy="18" r="1.4"/><path d="M8.4 14.4a5 5 0 0 1 7.2 0M5.3 11.3a9.4 9.4 0 0 1 13.4 0M2.3 8.2a13.6 13.6 0 0 1 19.4 0"/>',
  sol: '<circle cx="12" cy="12" r="4.4"/><path d="M12 2.6v2.6M12 18.8v2.6M2.6 12h2.6M18.8 12h2.6M5.3 5.3l1.9 1.9M16.8 16.8l1.9 1.9M5.3 18.7l1.9-1.9M16.8 7.2l1.9-1.9"/>',
  nota: '<path d="M9 18.5a2.6 2.6 0 1 1-2.6-2.6c1.4 0 2.6 1.2 2.6 2.6V5.5l10-2v12.7"/><circle cx="16.4" cy="16.2" r="2.6"/>',
  punto: '<circle cx="12" cy="12" r="1.6" fill="currentColor"/>'
};
// palabras de la letra → qué dibujos aparecen
const TEMAS = [
  [/planeta|luna|cielo|noche|espacio|mapa|infinit/i, ['planeta','luna','estrella','punto']],
  [/estrella|brill|luces|parpade/i, ['estrella','chispa','punto']],
  [/coraz|amor|beso|nombre|querer|te quiero/i, ['corazon','chispa']],
  [/fuego|arde|enciend|calor|quema/i, ['llama','chispa']],
  [/lluvi|llor|lágrim|lagrim|mar|agua|llueven/i, ['gota','punto']],
  [/señal|senal|red|ping|wifi|cable|conexi|router|switch|bit|cifrad|clave/i, ['senal','punto','chispa']],
  [/sol|luz|día|dia|amanec/i, ['sol','chispa']],
  [/música|musica|canci|volumen|bajo|ritmo/i, ['nota','chispa']]
];
const BASE = ['planeta','estrella','punto','chispa','luna'];

export function temasDe(texto){
  const set = [];
  for(const [re, dib] of TEMAS) if(re.test(texto || '')) set.push(...dib);
  return set.length ? set : BASE;
}

let caja = null, vivos = [], temaActual = '';
const azar = (a, b) => a + Math.random()*(b - a);

function crear(tipo){
  const d = document.createElement('div'); d.className = 'garabato';
  const t = tipo === 'punto' ? azar(6, 12) : azar(26, 64);
  const ancho = innerWidth, alto = innerHeight, movil = ancho < 760;
  // evitar el centro de la letra: preferir bordes y la zona media-derecha
  const x = movil ? azar(4, 92) : azar(30, 70), y = movil ? azar(8, 60) : azar(12, 80);
  d.style.cssText = `left:${x}%;top:${y}%;--t:${t}px;--op:${tipo==='punto' ? 1 : azar(.55, .95).toFixed(2)};--dur:${azar(6, 12).toFixed(1)}s;--ret:-${azar(0, 6).toFixed(1)}s;--dx:${azar(-24, 24).toFixed(0)}px;--dy:${azar(-18, 18).toFixed(0)}px;--rot:${azar(-25, 25).toFixed(0)}deg`;
  d.innerHTML = `<svg viewBox="0 0 24 24">${DIBUJOS[tipo]}</svg>`;
  return d;
}

export function montarGarabatos(el){ caja = el; temaActual = ''; poner(BASE, 14); }
export function limpiarGarabatos(){ if(caja) caja.innerHTML = ''; vivos = []; caja = null; }

function poner(tipos, n){
  for(let i=0;i<n;i++){ const d = crear(tipos[i % tipos.length]); caja.appendChild(d); vivos.push(d); }
}

// cuando cambia la línea: si el tema cambia, renovar la mitad de los dibujos
export function garabatosPara(texto){
  if(!caja) return;
  const tipos = temasDe(texto), clave = tipos.join();
  if(clave === temaActual) return; temaActual = clave;
  const salen = vivos.splice(0, Math.ceil(vivos.length/2));
  salen.forEach(d => { d.classList.add('sale'); setTimeout(() => d.remove(), 650); });
  poner(tipos, salen.length);
}
