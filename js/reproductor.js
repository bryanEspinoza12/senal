// SEÑAL v2 · reproductor: fuentes de sonido (demo, MP3, audio del PC, micrófono), canción actual y controles.
import { S, A, $, aviso, fmt, store } from './estado.js';
import { CANCIONES, letraDemo, espectro } from './fuentes/demo.js';
import { dibujarPortada } from './portada.js';

// ---------- análisis de audio ----------
let AC = null, analizador = null, frec = null, onda = null, nodo = null, mediaEl = null, flujo = null;
export let archivoMP3 = null;
export function asegurarAC(){
  if(!AC){ AC = new (window.AudioContext || window.webkitAudioContext)(); analizador = AC.createAnalyser(); analizador.fftSize = 2048; analizador.smoothingTimeConstant = .75; frec = new Uint8Array(analizador.frequencyBinCount); onda = new Uint8Array(analizador.fftSize); }
  if(AC.state === 'suspended') AC.resume();
  return AC;
}
export const contextoAudio = () => AC;
export const flujoActual = () => flujo;
export function datos(ms){
  if(!S.vivo){ const bpm = S.fuente === 'demo' ? demoActual().bpm : 112; return espectro(ms, bpm, S.sonando); }
  analizador.getByteFrequencyData(frec); return frec;
}
export function soltar(){
  if(nodo){ try { nodo.disconnect(); } catch(e){} nodo = null; }
  if(mediaEl){ mediaEl.pause(); mediaEl = null; }
  if(flujo){ flujo.getTracks().forEach(t => t.stop()); flujo = null; }
  S.vivo = false;
}
export function marcarFuente(id, texto){
  ['#sDemo','#sPc','#sMic','#sMp3','#sSpot'].forEach(s => $(s).classList.toggle('on', s === id));
  $('#fuenteTxt').textContent = texto; A.cerrarPaneles && A.cerrarPaneles();
}

// ---------- canción actual en pantalla ----------
export function ponerCancion(titulo, artista, kicker){
  $('#tTitulo').textContent = titulo; $('#tTitulo').title = titulo || '';
  $('#tArtista').textContent = artista; $('#tArtista').title = artista || '';
  const t = (titulo + ' — ' + (artista || '') + ' — ').toUpperCase();
  $('#mq1').textContent = t.repeat(3); $('#mq2').textContent = t.repeat(3);
  document.title = titulo + ' · SEÑAL';
  A.piel && A.piel.cancion({titulo, artista, kicker});
}
export function paleta(p){
  const r = document.documentElement.style; r.setProperty('--acc', p.acc); r.setProperty('--acc2', p.acc2 || '#ffffff');
}
// portada desde una imagen (Spotify) o generada (demo/MP3)
export const portadaCanvas = document.createElement('canvas'); portadaCanvas.width = portadaCanvas.height = 400;
export function portadaGenerada(c){
  dibujarPortada(portadaCanvas, c); copiarPortada();
}
export function portadaDesdeURL(url){
  const im = new Image(); im.crossOrigin = 'anonymous';
  im.onload = () => {
    const g = portadaCanvas.getContext('2d'); g.drawImage(im, 0, 0, 400, 400);
    try { paleta(paletaDe(g)); } catch(e){}
    copiarPortada();
  };
  im.src = url;
}
function copiarPortada(){
  const m = $('#mini'); m.getContext('2d').drawImage(portadaCanvas, 0, 0, m.width, m.height);
  A.piel && A.piel.portada(portadaCanvas);
}
function tono(r, g, b){ r/=255; g/=255; b/=255; const mx = Math.max(r,g,b), mn = Math.min(r,g,b), d = mx - mn; if(!d) return 0; let h = mx === r ? ((g-b)/d) % 6 : mx === g ? (b-r)/d + 2 : (r-g)/d + 4; h *= 60; return h < 0 ? h + 360 : h; }
function paletaDe(g){
  const d = g.getImageData(0, 0, 400, 400).data, B = {};
  for(let i = 0; i < d.length; i += 4*29){
    const r = d[i], gg = d[i+1], b = d[i+2], mx = Math.max(r,gg,b), mn = Math.min(r,gg,b), s = mx ? (mx-mn)/mx : 0, v = mx/255;
    if(v < .22) continue;
    const k = Math.round(tono(r,gg,b)/30) % 12, e = B[k] || (B[k] = {n:0,r:0,g:0,b:0,sc:0});
    e.n++; e.r += r; e.g += gg; e.b += b; e.sc += s*v*s;
  }
  const arr = Object.entries(B).map(([k,e]) => ({k:+k, sc:e.sc, col:[e.r/e.n, e.g/e.n, e.b/e.n]})).sort((a,b) => b.sc - a.sc);
  const vivo = (c, f) => 'rgb(' + c.map(x => Math.min(255, Math.round(x * f))).join(',') + ')';
  if(!arr.length || arr[0].sc < 1) return {acc:'#5b6bff', acc2:'#e8ecff'};
  const f = 230/Math.max(...arr[0].col, 1);
  return {acc: vivo(arr[0].col, f*.85), acc2: vivo(arr[0].col.map(x => x + (255 - x)*.55), 1)};
}

// ---------- DEMO ----------
let demoIdx = 0, demoPos = 0;
export const demoActual = () => CANCIONES[demoIdx];
export function ponerDemo(){ soltar(); A.salirSpotify && A.salirSpotify(); S.fuente = 'demo'; S.sonando = true; marcarFuente('#sDemo', 'DEMO · sin sonido'); cargarDemo(demoIdx); botonPlay(); }
export function cargarDemo(i){
  demoIdx = (i + CANCIONES.length) % CANCIONES.length; demoPos = 0; const c = demoActual();
  paleta(c); portadaGenerada(c);
  ponerCancion(c.titulo, c.artista, 'DEMO · CANCIÓN INVENTADA');
  A.marcarTarjetas && A.marcarTarjetas();
  A.letraPara({key:c.id, titulo:c.titulo, artista:c.artista, album:'', dur:c.dur, genero:c.genero}, () => { S.origenLetra = 'demo'; A.ponerLetra(letraDemo(c).map(l => ({t:l.t, text:l.texto})), 'synced'); });
}
export function avanzarDemo(dt){ if(S.fuente === 'demo' && S.sonando){ demoPos += dt; if(demoPos > demoActual().dur) cargarDemo(demoIdx + 1); } }

// ---------- MP3 ----------
export function abrirMP3(f){
  asegurarAC(); soltar(); A.salirSpotify && A.salirSpotify(); archivoMP3 = f;
  mediaEl = new Audio(URL.createObjectURL(f)); mediaEl.volume = S.volumen/100;
  nodo = AC.createMediaElementSource(mediaEl); nodo.connect(analizador); nodo.connect(AC.destination);
  mediaEl.play(); S.fuente = 'mp3'; S.sonando = true; S.vivo = true; marcarFuente('#sMp3', 'MP3'); botonPlay();
  const nombre = f.name.replace(/\.[^.]+$/, '').replace(/_+/g, ' ').trim();
  let h = 0; for(const c of nombre) h = (h*31 + c.charCodeAt(0)) >>> 0;
  const p = CANCIONES[h % CANCIONES.length]; paleta(p); portadaGenerada({...p, semilla: h % 997});
  const partes = nombre.split(/\s+-\s+/);
  const artista = partes.length > 1 ? partes[0] : '', titulo = partes.length > 1 ? partes.slice(1).join(' - ') : nombre;
  ponerCancion(titulo, artista || 'Archivo local', 'ARCHIVO LOCAL');
  const meta = {key:'mp3:' + nombre.toLowerCase(), titulo, artista, album:'', dur:0}; S.meta = meta;
  mediaEl.onloadedmetadata = () => { meta.dur = mediaEl.duration; A.letraPara(meta, () => A.buscarLetra(meta)); };
  mediaEl.onended = () => { S.sonando = false; botonPlay(); };
}

// ---------- AUDIO DEL PC / MICRÓFONO ----------
export async function capturar(tipo){
  A.cerrarPaneles();
  const mic = tipo === 'mic', boton = mic ? '#sMic' : '#sPc', NOMBRE = mic ? 'MICRÓFONO' : 'AUDIO DEL PC';
  try {
    asegurarAC();
    const st = mic ? await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false, noiseSuppression:false, autoGainControl:false}})
                   : await navigator.mediaDevices.getDisplayMedia({video:true, audio:{echoCancellation:false, noiseSuppression:false, autoGainControl:false}});
    if(!st.getAudioTracks().length){ st.getTracks().forEach(t => t.stop()); aviso('No se compartió audio. Elige <b>Toda la pantalla</b> y activa <b>Compartir también el audio del sistema</b>.', 8000); return; }
    if(S.fuente === 'spotify'){
      if(flujo) flujo.getTracks().forEach(t => t.stop());
      if(nodo){ try { nodo.disconnect(); } catch(e){} }
      flujo = st; nodo = AC.createMediaStreamSource(st); nodo.connect(analizador); S.vivo = true;
      $('#fuenteTxt').textContent = 'SPOTIFY + ' + NOMBRE; $('#sPc').classList.remove('on'); $('#sMic').classList.remove('on'); $(boton).classList.add('on');
      st.getAudioTracks()[0].onended = () => { S.vivo = false; flujo = null; $('#fuenteTxt').textContent = 'SPOTIFY'; $(boton).classList.remove('on'); };
      aviso(mic ? 'Listo: las ondas siguen lo que escucha el micrófono. Sube el volumen de la música.' : 'Listo: ahora todo reacciona al sonido real de tu PC.', 4000); return;
    }
    soltar(); flujo = st; nodo = AC.createMediaStreamSource(st); nodo.connect(analizador); S.vivo = true;
    S.fuente = 'pc'; S.sonando = true; marcarFuente(boton, NOMBRE); botonPlay();
    paleta({acc:'#3d5cff', acc2:'#9fd8ff'}); portadaGenerada({acc:'#3d5cff', acc2:'#9fd8ff', semilla:3});
    ponerCancion(mic ? 'Micrófono' : 'Audio del PC', mic ? 'Lo que suena a tu alrededor' : 'Lo que esté sonando en tu computadora', 'EN VIVO');
    S.meta = null; S.origenLetra = 'none'; A.ponerLetra(null, 'none');
    st.getAudioTracks()[0].onended = () => ponerDemo();
  } catch(e){ aviso(mic ? 'No se pudo usar el micrófono. Revisa que le diste permiso al navegador.' : 'Captura cancelada o no permitida por el navegador.', 5000); }
}

// ---------- tiempo ----------
export function segundo(){
  if(S.fuente === 'demo') return demoPos;
  if(S.fuente === 'mp3' && mediaEl) return mediaEl.currentTime;
  if(S.fuente === 'spotify' && A.spSegundo) return A.spSegundo();
  return 0;
}
export function duracion(){
  if(S.fuente === 'demo') return demoActual().dur;
  if(S.fuente === 'mp3' && mediaEl) return mediaEl.duration || 0;
  if(S.fuente === 'spotify' && A.spDuracion) return A.spDuracion();
  return 0;
}

// ---------- controles ----------
export function botonPlay(){
  $('#bPlay').setAttribute('aria-label', S.sonando ? 'Pausar' : 'Reproducir');
  $('#icoPlay').innerHTML = S.sonando ? '<rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/>' : '<path d="M7 4.5v15l13-7.5z"/>';
}
export function alternar(){
  if(S.fuente === 'mp3' && mediaEl){ if(mediaEl.paused){ asegurarAC(); mediaEl.play(); S.sonando = true; } else { mediaEl.pause(); S.sonando = false; } }
  else if(S.fuente === 'demo') S.sonando = !S.sonando;
  else if(S.fuente === 'spotify'){ A.spAlternar(); return; }
  else aviso('En modo Audio del PC o Micrófono, pausa la música desde la app que suena.', 3000);
  botonPlay();
}
export function siguiente(){
  if(S.fuente === 'demo') cargarDemo(demoIdx + 1);
  else if(S.fuente === 'spotify') A.spSiguiente();
  else if(S.fuente === 'mp3' && mediaEl) mediaEl.currentTime = Math.min(mediaEl.duration || 0, mediaEl.currentTime + 10);
}
export function anterior(){
  if(S.fuente === 'demo'){ demoPos > 3 ? (demoPos = 0) : cargarDemo(demoIdx - 1); }
  else if(S.fuente === 'spotify') A.spAnterior();
  else if(S.fuente === 'mp3' && mediaEl) mediaEl.currentTime = Math.max(0, mediaEl.currentTime - 10);
}
export function irA(seg){
  if(S.fuente === 'demo') demoPos = Math.max(0, Math.min(demoActual().dur - .1, seg));
  else if(S.fuente === 'spotify') A.spIrA(seg);
  else if(S.fuente === 'mp3' && mediaEl) mediaEl.currentTime = Math.max(0, seg);
}
export const moverSeg = d => irA(segundo() + d);
export function volumen(v){
  S.volumen = v; store.set('senal_vol', v);
  if(mediaEl) mediaEl.volume = v/100;
  A.spVolumen && A.spVolumen(v);
}
export const fmtTiempo = () => fmt(segundo()) + ' / ' + (duracion() ? fmt(duracion()) : 'EN VIVO');
