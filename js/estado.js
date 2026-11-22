// SEÑAL v2 · estado compartido y utilidades.
// S = estado de la app · A = funciones que los módulos publican para usarse entre sí (evita ciclos de import).
export const S = {
  fuente: 'demo',          // demo | mp3 | pc | spotify
  sonando: true, vivo: false,          // vivo = hay audio real llegando al analizador (MP3, PC, micrófono)
  meta: null,              // canción actual {key, titulo, artista, album, dur, genero?}
  L: null, tipoLetra: 'none', origenLetra: 'none', estiloLetra: 'lirico', desfase: 0,
  modoVisual: 0, traducir: false,
  volumen: 80,
  spRemoto: false,         // celular: SEÑAL acompaña a la app de Spotify
  editor: null             // estado del editor de letras (null = cerrado)
};
export const A = {};

export const $ = s => document.querySelector(s);
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const fmt = s => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s/60) + ':' + String(s % 60).padStart(2, '0'); };
export const store = {
  get: k => { try { return localStorage.getItem(k); } catch(e){ return null; } },
  set: (k, v) => { if(store.congelado) return; try { localStorage.setItem(k, v); } catch(e){} store.alGuardar && store.alGuardar(k); },
  del: k => { try { localStorage.removeItem(k); } catch(e){} }
};
export const POCO = matchMedia('(prefers-reduced-motion: reduce)');
export const ES_MOVIL = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));

let tAviso = 0;
export function aviso(html, ms = 6000){
  const h = $('#aviso'); h.innerHTML = html; h.style.display = 'block';
  clearTimeout(tAviso); tAviso = setTimeout(() => h.style.display = 'none', ms);
}
