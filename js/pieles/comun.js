// SEÑAL v2 · utilidades que comparten las pieles.
import { esc } from '../estado.js';

// '#3d5cff' o 'rgb(1,2,3)' → [r,g,b]
export function rgb(c){
  c = (c || '').trim();
  if(c[0] === '#'){ const h = c.length === 4 ? c.slice(1).split('').map(x => x + x).join('') : c.slice(1); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16) || 0); }
  const m = c.match(/\d+/g); return m ? m.slice(0, 3).map(Number) : [61, 92, 255];
}
// colores de la canción (portada) tal como los ve el cuerpo de la página (las variantes pueden cambiarlos)
export function colorCancion(){
  const cs = getComputedStyle(document.body);
  return {acc: rgb(cs.getPropertyValue('--acc') || '#3d5cff'), acc2: rgb(cs.getPropertyValue('--acc2') || '#9fd8ff')};
}
export const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

// un botón de canción (para listas de "a continuación", guías de canal, colas…)
export function botonCancion(c, clase, interior){
  const b = document.createElement('button'); b.className = clase;
  b.dataset.clave = c.clave || c.uri || '';
  b.setAttribute('aria-label', 'Reproducir ' + c.titulo + ' de ' + c.artista);
  b.innerHTML = interior;
  const img = b.querySelector('[data-img]');
  if(img){
    if(c.img){ img.outerHTML = '<img alt="" src="' + esc(c.img) + '">'; }
    else { const cv = document.createElement('canvas'); cv.width = 160; cv.height = 160; cv.setAttribute('aria-hidden', 'true'); img.replaceWith(cv); c.dibujar && c.dibujar(cv); }
  }
  b.querySelectorAll('[data-t]').forEach(e => e.textContent = c.titulo);
  b.querySelectorAll('[data-a]').forEach(e => e.textContent = c.artista);
  b.onclick = c.tocar;
  return b;
}
export const copiar = (de, a) => { if(a && de){ const x = a.getContext('2d'); x.clearRect(0, 0, a.width, a.height); x.drawImage(de, 0, 0, a.width, a.height); } };
