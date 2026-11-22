// SEÑAL v2 · letras: LRCLIB, letras propias, los 8 estilos, ajuste de tiempo y traducción.
import { letraGuardada } from './nube.js';
import { S, A, $, esc, store, aviso } from './estado.js';
import { garabatosPara } from './garabatos.js';
import { portadaCanvas, segundo, duracion } from './reproductor.js';

export const ESTILOS = [
  {id:'lirico',  n:'DE LA PIEL',     d:'El estilo propio de cada piel (en Video lírico: foto, línea a mano y línea gigante)'},
  {id:'karaoke', n:'KARAOKE',        d:'La letra sube línea por línea'},
  {id:'foco',    n:'FOCO',           d:'Solo la línea actual, gigante, y la que sigue'},
  {id:'palabra', n:'PALABRA',        d:'Una palabra a la vez, al ritmo de la voz'},
  {id:'maquina', n:'MÁQUINA',        d:'Se escribe letra por letra, como una terminal'},
  {id:'cine',    n:'SUBTÍTULO',      d:'Abajo y discreta, como en el cine'},
  {id:'d3',      n:'PROFUNDIDAD 3D', d:'Las líneas llegan volando desde el fondo'},
  {id:'off',     n:'SIN LETRA',      d:'Solo el visualizador'}
];
S.estiloLetra = store.get('senal_lyr2') || 'lirico'; if(!ESTILOS.some(e => e.id === S.estiloLetra)) S.estiloLetra = 'lirico';

let idx = -2, ultPalabra = -1, ultLetras = -1, pedido = 0;
const cache = new Map();
const caja = () => $('#letras');
const htmlLinea = t => t ? t.split(/\s+/).filter(Boolean).map(w => '<span class="w">' + esc(w) + '</span>').join(' ') : '♪';
export const textoDe = k => (S.L && S.L[k] && S.L[k].text) || '';
const trDe = k => (S.L && S.L[k] && S.L[k].tr) ? '<div class="tr">' + esc(S.L[k].tr) + '</div>' : '';

export function leerLRC(txt){
  const out = [];
  for(const fila of String(txt).split(/\r?\n/)){
    const m = [...fila.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)]; if(!m.length) continue;
    const text = fila.replace(/\[[^\]]*\]/g, '').trim();
    for(const x of m) out.push({t: +x[1]*60 + +x[2], text});
  }
  return out.sort((a, b) => a.t - b.t);
}

// ---------- de dónde sale la letra ----------
export async function buscarLetra({titulo, artista, album, dur}){
  const req = ++pedido, clave = (artista + '|' + titulo).toLowerCase();
  ponerLetra(null, 'loading');
  try {
    let r = cache.get(clave);
    if(!r){
      if(artista){
        const q = new URLSearchParams({track_name:titulo, artist_name:artista}); if(album) q.set('album_name', album); if(dur) q.set('duration', Math.round(dur));
        const x = await fetch('https://lrclib.net/api/get?' + q); if(x.ok) r = await x.json();
      }
      if(!r || (!r.syncedLyrics && !r.plainLyrics)){
        const q = new URLSearchParams({track_name:titulo}); if(artista) q.set('artist_name', artista);
        const x = await fetch('https://lrclib.net/api/search?' + q);
        if(x.ok){ const arr = await x.json(); arr.sort((a, b) => (!!b.syncedLyrics - !!a.syncedLyrics) || (Math.abs((a.duration||0) - (dur||0)) - Math.abs((b.duration||0) - (dur||0)))); r = arr[0] || r; }
      }
      if(r) cache.set(clave, r);
    }
    if(req !== pedido) return;
    S.origenLetra = 'lrclib';
    if(r && r.syncedLyrics) ponerLetra(leerLRC(r.syncedLyrics), 'synced');
    else if(r && r.plainLyrics) ponerLetra(r.plainLyrics.split(/\r?\n/).map(t => ({t:0, text:t.trim()})), 'plain');
    else { S.origenLetra = 'none'; ponerLetra(null, r && r.instrumental ? 'instrumental' : 'none'); }
  } catch(e){ if(req === pedido){ S.origenLetra = 'none'; ponerLetra(null, 'error'); } }
}
A.buscarLetra = buscarLetra;
export const letraPropia = k => letraGuardada(k);
// al entrar o salir de la cuenta: si cambió la letra propia de la canción que suena, se actualiza
export function revisarLetraPropia(){
  if(!S.meta) return;
  const c = letraPropia(S.meta.key);
  if(c){ ++pedido; S.origenLetra = 'tuya'; ponerLetra(leerLRC(c), 'synced'); }
  else if(S.origenLetra === 'tuya') recargarLetra();
}
export function letraPara(meta, siNo){
  S.meta = meta;
  const c = letraPropia(meta.key);
  if(c){ ++pedido; S.origenLetra = 'tuya'; ponerLetra(leerLRC(c), 'synced'); } else siNo();
}
A.letraPara = letraPara;
export function recargarLetra(){ if(!S.meta) return; if(S.meta.key.startsWith('demo:')) A.cargarDemoActual(); else buscarLetra(S.meta); }

export function ponerLetra(L, tipo){
  S.L = L; S.tipoLetra = tipo; ponerTraduccion(); construir(); etiqueta();
  if(S.traducir && L && !L.some(l => l.tr)) traducir(false);
}
A.ponerLetra = ponerLetra;
function etiqueta(){
  const t = $('#ltag'), hay = S.tipoLetra === 'synced' || S.tipoLetra === 'plain';
  t.textContent = S.tipoLetra === 'loading' ? 'BUSCANDO' : !hay ? 'SIN LETRA' : S.origenLetra === 'tuya' ? 'TUYA' : S.origenLetra === 'demo' ? 'DEMO' : S.tipoLetra === 'plain' ? 'SIN TIEMPOS' : 'LRCLIB';
  t.classList.toggle('off', !hay);
}

// ---------- dibujar según el estilo ----------
export function construir(){
  idx = -2; ultPalabra = -1; ultLetras = -1;
  const b = caja(), escena = $('#escena');
  b.innerHTML = ''; b.className = ''; b.style.transform = ''; b.style.transition = '';
  const hay = S.tipoLetra === 'synced' || S.tipoLetra === 'plain', off = S.estiloLetra === 'off';
  document.body.classList.toggle('sinLetra', off || !hay || S.estiloLetra === 'cine');
  document.body.classList.toggle('estilo-lirico', S.estiloLetra === 'lirico' && hay);
  escena.style.display = off ? 'none' : '';
  escena.classList.toggle('mask', hay && (S.estiloLetra === 'karaoke' || S.tipoLetra === 'plain'));
  if(off) return;
  if(!hay){
    document.body.classList.add('estilo-lirico');
    const msg = {loading:'BUSCANDO LA LETRA…', none:'SIN LETRA PARA ESTA CANCIÓN', instrumental:'INSTRUMENTAL', error:'NO SE PUDO CARGAR LA LETRA'}[S.tipoLetra] || '';
    const acts = (S.meta && S.tipoLetra !== 'loading') ? '<div class="acts"><button class="cap" data-act="editar">✎ CREAR LETRA Y SINCRONIZARLA</button><button class="cap" data-act="importar">⇪ CARGAR .LRC</button></div>' : '';
    b.innerHTML = '<div class="grande"><div class="t">' + esc($('#tTitulo').textContent) + '</div><div class="s">' + esc($('#tArtista').textContent) + '</div><div class="n">' + msg + '</div>' + acts + '</div>';
    return;
  }
  if(S.estiloLetra === 'lirico' && S.tipoLetra === 'synced'){
    b.innerHTML = '<div class="lirico"><p class="kick"></p><div class="artista"><canvas class="foto" width="300" height="300" aria-hidden="true"></canvas><div><p class="nombre"></p><p class="antes"></p></div></div><p class="actual" aria-live="polite"></p><p class="sigue"></p></div>';
    b.querySelector('.nombre').textContent = (S.meta && S.meta.artista) || $('#tArtista').textContent;
    pintarFoto(portadaCanvas);
    return;
  }
  if(S.tipoLetra === 'plain' || S.estiloLetra === 'karaoke' || S.estiloLetra === 'lirico'){
    b.className = 'karaoke';
    S.L.forEach((l, k) => { const d = document.createElement('div'); d.className = 'line' + (l.text ? '' : ' gap'); d.innerHTML = l.text ? htmlLinea(l.text) + trDe(k) : '· · ·'; b.appendChild(d); });
    if(S.tipoLetra === 'plain'){ [...b.children].forEach(c => { c.classList.add('cur'); c.style.fontSize = 'clamp(22px,3vw,44px)'; c.querySelectorAll('.w').forEach(w => w.classList.add('on')); }); b.style.transition = 'transform 1s linear'; }
    return;
  }
  if(S.estiloLetra === 'd3'){
    b.className = 'd3';
    S.L.forEach((l, k) => { const d = document.createElement('div'); d.className = 'd3l'; d.innerHTML = htmlLinea(l.text) + trDe(k); d.style.opacity = 0; b.appendChild(d); });
  }
}
$('#letras').addEventListener('click', e => { const b = e.target.closest('[data-act]'); if(!b) return; b.dataset.act === 'editar' ? A.abrirEditor() : A.importarLRC(); });
export function pintarFoto(c){ const f = document.querySelector('#letras .foto'); if(f) f.getContext('2d').drawImage(c, 0, 0, f.width, f.height); }
A.pintarFoto = pintarFoto;

export function reubicar(){
  if(S.estiloLetra !== 'karaoke' && S.estiloLetra !== 'lirico' || S.tipoLetra !== 'synced' || !S.L) return;
  const b = caja(); if(b.className !== 'karaoke') return;
  const el = b.children[Math.max(0, idx)]; if(!el) return;
  b.style.transform = 'translateY(' + ($('#escena').clientHeight*.45 - el.offsetTop - el.offsetHeight/2) + 'px)';
}
A.reubicarLetra = reubicar;

function alCambiar(i){
  const b = caja();
  garabatosPara(textoDe(i));
  if(b.querySelector('.lirico')){
    const actual = textoDe(i), el = b.querySelector('.actual');
    b.querySelector('.antes').textContent = i <= 0 ? (S.meta ? S.meta.titulo.toLowerCase() : '') : textoDe(i - 1).toLowerCase();
    b.querySelector('.sigue').textContent = textoDe(i + 1).toLowerCase();
    const n = S.L.filter(l => l.text).length, k = S.L.slice(0, i + 1).filter(l => l.text).length;
    b.querySelector('.kick').textContent = '[ LÍNEA ' + String(Math.max(1, k)).padStart(2, '0') + ' / ' + String(n).padStart(2, '0') + ' ] — ' + ((S.meta && S.meta.artista) || '').toUpperCase();
    el.classList.remove('entra', 'pausa'); void el.offsetWidth;
    if(actual){ el.innerHTML = htmlLinea(actual) + trDe(i); el.classList.add('cur'); }
    else { el.classList.add('pausa'); el.textContent = i < 0 ? '· · ·' : '♪'; }
    el.classList.add('entra');
  } else if(b.className === 'karaoke'){
    const h = b.children;
    for(let k = 0; k < h.length; k++){ h[k].classList.toggle('cur', k === i); h[k].classList.toggle('past', k < i); if(k !== i) h[k].querySelectorAll('.w.on,.w.nw').forEach(w => w.classList.remove('on', 'nw')); }
    reubicar();
  } else if(S.estiloLetra === 'd3'){
    [...b.children].forEach((el, k) => {
      const d = k - i, vis = d >= -1 && d <= 6;
      el.classList.toggle('cur', d === 0); el.style.visibility = vis ? 'visible' : 'hidden';
      el.style.opacity = d < 0 ? 0 : (d === 0 ? 1 : Math.max(0, .42 - d*.08));
      el.style.filter = d > 0 ? 'blur(' + (d*1.4) + 'px)' : 'none';
      el.style.transform = 'translate(-50%,-50%) translate3d(0,' + (-d*95) + 'px,' + (d < 0 ? 700 : -d*520) + 'px)';
      if(d !== 0) el.querySelectorAll('.w.on,.w.nw').forEach(w => w.classList.remove('on', 'nw'));
    });
  } else if(S.estiloLetra === 'foco'){
    b.innerHTML = '<div class="fo">' + (textoDe(i-1) ? '<div class="pv">' + esc(textoDe(i-1)) + '</div>' : '') + '<div class="cl cur">' + (i >= 0 ? htmlLinea(textoDe(i)) : '♪') + '</div>' + (i >= 0 ? trDe(i) : '') + (textoDe(i+1) ? '<div class="nx">' + esc(textoDe(i+1)) + '</div>' : '') + '</div>';
  } else if(S.estiloLetra === 'palabra'){
    ultPalabra = -1;
    b.innerHTML = '<div class="pw"><div class="big" id="pwGrande">' + (textoDe(i) ? '' : '♪') + '</div><div class="ctx cur">' + (textoDe(i) ? htmlLinea(textoDe(i)) : '') + '</div>' + trDe(i) + '</div>';
  } else if(S.estiloLetra === 'maquina'){
    ultLetras = -1;
    const reg = [i-3, i-2, i-1].filter(k => k >= 0 && textoDe(k)).map(k => '<div>' + esc(textoDe(k)) + '</div>').join('');
    b.innerHTML = '<div class="tw"><div class="log">' + reg + '</div><div class="ln"><span id="twT"></span><span class="cursor"></span></div>' + trDe(i) + '</div>';
  } else if(S.estiloLetra === 'cine'){
    b.innerHTML = textoDe(i) ? '<div class="sb"><div class="s1 cur">' + htmlLinea(textoDe(i)) + '</div>' + trDe(i) + '</div>' : '';
  }
}
function alAvanzar(i, p){
  const t = textoDe(i);
  if(S.estiloLetra === 'palabra'){
    const ws = t.split(/\s+/).filter(Boolean);
    if(ws.length){ const wi = Math.min(ws.length - 1, Math.floor(p*ws.length)); if(wi !== ultPalabra){ ultPalabra = wi; const g = $('#pwGrande'); if(g){ g.textContent = ws[wi]; g.style.animation = 'none'; void g.offsetWidth; g.style.animation = ''; } } }
  } else if(S.estiloLetra === 'maquina'){
    const n = Math.round(p*t.length); if(n !== ultLetras){ ultLetras = n; const el = $('#twT'); if(el) el.textContent = t.slice(0, n); }
  }
  const c = caja().querySelector('.cur'); if(!c) return;
  const ws = c.querySelectorAll('.w'), luz = Math.ceil(p*ws.length);
  ws.forEach((w, j) => { w.classList.toggle('on', j < luz); w.classList.toggle('nw', j === luz - 1 && p < 1); });
}
export function actualizar(s){
  if(!S.L || S.estiloLetra === 'off') return;
  if(S.tipoLetra === 'plain'){ const k = Math.min(1, s/Math.max(1, duracion())); const b = caja(); b.style.transform = 'translateY(' + (-k*(b.scrollHeight - $('#escena').clientHeight*.5)) + 'px)'; return; }
  if(S.tipoLetra !== 'synced') return;
  const t = s + S.desfase; let i = -1;
  for(let k = 0; k < S.L.length; k++){ if(S.L[k].t <= t) i = k; else break; }
  if(i !== idx){ idx = i; alCambiar(i); }
  if(i >= 0){ const ini = S.L[i].t, fin = S.L[i+1] ? S.L[i+1].t : ini + 4; alAvanzar(i, Math.min(1, (t - ini)/Math.max(.4, (fin - ini)*.85))); }
}
export function ponerEstilo(id){
  S.estiloLetra = id; store.set('senal_lyr2', id);
  document.querySelectorAll('#lyrCards .tp').forEach(c => c.classList.toggle('on', c.dataset.id === id));
  construir();
}
export function siguienteEstilo(){ const i = ESTILOS.findIndex(e => e.id === S.estiloLetra); ponerEstilo(ESTILOS[(i + 1) % ESTILOS.length].id); aviso('Letra: <b>' + ESTILOS.find(e => e.id === S.estiloLetra).n + '</b>', 1500); }
export function ponerDesfase(v){ S.desfase = Math.round(v*100)/100; idx = -2; $('#oVal').textContent = (S.desfase > 0 ? '+' : '') + S.desfase.toFixed(2) + ' s'; }

// ---------- traducción ----------
S.traducir = store.get('senal_tr_on') === '1';
document.body.classList.toggle('trOn', S.traducir); $('#tTr').classList.toggle('on', S.traducir);
const claveTr = () => S.meta ? 'senal_tr:' + S.meta.key : null;
function ponerTraduccion(){
  if(!S.L || !S.meta) return;
  try { const c = store.get(claveTr()); if(c){ const arr = JSON.parse(c); if(arr.length === S.L.length) S.L.forEach((l, i) => l.tr = arr[i]); } } catch(e){}
}
const estado = t => { $('#trStat').textContent = t || ''; };
export async function detectarIdioma(txt){
  try { if('LanguageDetector' in self){ const d = await LanguageDetector.create(); const r = await d.detect(txt); if(r && r[0]) return r[0].detectedLanguage; } } catch(e){}
  return null;
}
let traduciendo = false;
export async function traducir(porGesto){
  if(traduciendo) return;
  if(!S.L || !(S.tipoLetra === 'synced' || S.tipoLetra === 'plain')){ if(porGesto) aviso('Esta canción no tiene letra para traducir.', 3000); return; }
  const lineas = S.L.map(l => l.text || ''), junto = lineas.filter(Boolean).join('\n').slice(0, 2000), clave = claveTr(), meta = S.L;
  traduciendo = true; estado('Detectando idioma…');
  try {
    const src = await detectarIdioma(junto);
    if(src === 'es'){ estado('La letra ya está en español.'); return; }
    let out = null;
    if('Translator' in self){
      const op = {sourceLanguage: src || 'en', targetLanguage: 'es'};
      const disp = await Translator.availability(op);
      if(disp !== 'unavailable'){
        if(disp !== 'available' && !porGesto){ estado('Pulsa TRADUCIR para descargar el traductor.'); return; }
        const tr = await Translator.create({...op, monitor(m){ m.addEventListener('downloadprogress', e => estado('Descargando traductor… ' + Math.round(e.loaded*100) + '%')); }});
        estado('Traduciendo…'); out = [];
        for(const l of lineas) out.push(l ? await tr.translate(l) : '');
      }
    }
    if(!out){
      if(src && src !== 'en'){ estado('Tu navegador no puede traducir este idioma. Usa Chrome actualizado.'); return; }
      estado('Traduciendo con IA (la primera vez descarga ~80 MB)…');
      out = await A.aiLlamar({type:'mt', lines:lineas}, ev => { if(ev.type === 'load') estado('Descargando traductor IA… ' + A.aiPct(ev.p)); });
    }
    if(S.L !== meta) return;
    S.L.forEach((l, i) => l.tr = out[i] || '');
    if(clave) store.set(clave, JSON.stringify(out));
    estado('Traducción lista ✓'); setTimeout(() => estado(''), 2500);
    construir();
  } catch(e){ estado('No se pudo traducir: ' + (e.message || e)); }
  finally { traduciendo = false; }
}
export function alternarTraduccion(){
  S.traducir = !S.traducir; store.set('senal_tr_on', S.traducir ? '1' : '0');
  document.body.classList.toggle('trOn', S.traducir); $('#tTr').classList.toggle('on', S.traducir);
  if(S.traducir && S.L && !S.L.some(l => l.tr)) traducir(true);
  if(!S.traducir) estado('');
}

// ---------- vistas previas de los estilos (panel Letra) ----------
const PREV = {
  lirico:  t => { const L = ['busco tu señal','entre el ruido','un paquete','perdido en la red']; const k = t % 4; return '<div class="mp mp-l"><div class="a">' + L[(k+3) % 4] + '</div><div class="b">' + L[k] + '</div></div>'; },
  karaoke: t => { const L = ['busco tu señal','entre el ruido','un paquete perdido','en la red']; return '<div class="mp mp-k">' + L.map((x, i) => '<div class="' + (i === t % 4 ? 'hl' : '') + '">' + x + '</div>').join('') + '</div>'; },
  foco:    t => { const L = ['busco tu señal','entre el ruido','un paquete','perdido en la red']; const k = t % 4; return '<div class="mp mp-f"><div class="b">' + L[k] + '</div><div class="c">SIGUE → ' + L[(k+1) % 4].toUpperCase() + '</div></div>'; },
  palabra: t => { const W = ['busco','tu','señal','entre','el','ruido']; return '<div class="mp mp-p">' + W[t % 6] + '</div>'; },
  maquina: t => { const s = 'Cada ping que mando', n = Math.min(s.length, (t*3) % (s.length + 9)); return '<div class="mp mp-m">&gt; ' + esc(s.slice(0, n)) + '█</div>'; },
  cine:    t => { const L = ['Busco tu señal entre el ruido','Un paquete perdido en la red']; return '<div class="mp mp-s">' + L[Math.floor(t/4) % 2] + '</div>'; },
  d3:      t => { const L = ['busco tu señal','entre el ruido','un paquete','perdido']; const k = t % 4; return '<div class="mp mp-3"><div class="bk">' + L[(k+1) % 4] + '</div><div class="fr">' + L[k] + '</div></div>'; },
  off:     () => '<div class="mp mp-o">SOLO VISUALIZADOR ♪</div>'
};
export function tarjetasEstilos(){
  const cont = {}, ultimo = {}; let tic = 0;
  ESTILOS.forEach(s => {
    const c = document.createElement('button'); c.className = 'tp' + (s.id === S.estiloLetra ? ' on' : ''); c.dataset.id = s.id;
    c.setAttribute('aria-label', 'Estilo de letra ' + s.n + ': ' + s.d);
    c.innerHTML = '<div class="pv" aria-hidden="true"></div><span class="cap2">' + s.n + '</span>';
    c.onclick = () => ponerEstilo(s.id); $('#lyrCards').appendChild(c); cont[s.id] = c.querySelector('.pv'); cont[s.id].innerHTML = PREV[s.id](0);
  });
  setInterval(() => {
    if(!A.panelVisible('#pLyr')) return; tic++;
    for(const s of ESTILOS){ const h = PREV[s.id](s.id === 'palabra' || s.id === 'maquina' ? tic : Math.floor(tic/3)); if(ultimo[s.id] !== h){ cont[s.id].innerHTML = h; ultimo[s.id] = h; } }
  }, 380);
}
export const actualizarLetra = () => actualizar(segundo());
