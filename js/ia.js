// SEÑAL v2 · IA dentro del navegador: Whisper escucha la voz y pone los tiempos de la letra.
// Todo corre en tu PC. La primera vez descarga el modelo (~130 MB).
import { S, A, $, esc, aviso, fmt } from './estado.js';
import { segundo, duracion, asegurarAC, contextoAudio, flujoActual, archivoMP3, botonPlay } from './reproductor.js';
import { idActual } from './spotify.js';
import { ponerPaso, paso1, paso2, fmtL } from './editor.js';
import { detectarIdioma } from './letras.js';

const TJS = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1';
const CODIGO = `
import { pipeline, env } from '${TJS}';
env.allowLocalModels = false;
let asr = null, asrP = null, mt = null, mtP = null;
const prog = p => self.postMessage({type:'load', p});
function getAsr(){
  if(asr) return Promise.resolve(asr);
  if(!asrP) asrP = pipeline('automatic-speech-recognition', 'onnx-community/whisper-base_timestamped',
    {dtype:{encoder_model:'fp32', decoder_model_merged:'q8'}, device:'wasm', progress_callback:prog})
    .then(p => (asr = p)).catch(e => { asrP = null; throw e; });
  return asrP;
}
function getMt(){
  if(mt) return Promise.resolve(mt);
  if(!mtP) mtP = pipeline('translation', 'Xenova/opus-mt-en-es', {progress_callback:prog}).then(p => (mt = p)).catch(e => { mtP = null; throw e; });
  return mtP;
}
self.onmessage = async ({data}) => {
  const id = data.id;
  try {
    if(data.type === 'preload'){ await getAsr(); self.postMessage({id, type:'done', result:true}); }
    else if(data.type === 'win'){
      const a = await getAsr();
      const opts = {return_timestamps:'word', task:'transcribe'}; if(data.language) opts.language = data.language;
      const out = await a(data.audio, opts), words = [];
      for(const c of (out.chunks || [])){ const t0 = c.timestamp && c.timestamp[0]; if(t0 == null) continue; if(t0 >= data.lo && t0 < data.hi) words.push({w:String(c.text).trim(), t:t0 + data.offset}); }
      self.postMessage({id, type:'done', result:words});
    }
    else if(data.type === 'mt'){
      const m = await getMt(), out = [];
      for(const line of data.lines){ if(!line){ out.push(''); continue; } const r = await m(line); out.push(r[0].translation_text); }
      self.postMessage({id, type:'done', result:out});
    }
  } catch(err){ self.postMessage({id, type:'err', msg:String(err && err.message || err)}); }
};`;
let trabajador = null, seq = 0; const pendientes = new Map(), oyentes = new Set();
function obrero(){
  if(trabajador) return trabajador;
  trabajador = new Worker(URL.createObjectURL(new Blob([CODIGO], {type:'text/javascript'})), {type:'module'});
  trabajador.onmessage = ({data}) => {
    if(data.type === 'load'){ oyentes.forEach(f => f(data)); return; }
    const p = pendientes.get(data.id); if(!p) return; pendientes.delete(data.id);
    data.type === 'done' ? p.res(data.result) : p.rej(new Error(data.msg));
  };
  trabajador.onerror = e => {
    const err = new Error('No se pudo cargar la IA. Revisa tu conexión a internet (la primera vez descarga el modelo) y que uses Chrome o Edge actualizado.');
    pendientes.forEach(p => p.rej(err)); pendientes.clear(); trabajador = null; e.preventDefault && e.preventDefault();
  };
  return trabajador;
}
export function llamar(msg, alEvento, transferir){
  return new Promise((res, rej) => {
    const id = ++seq, w = obrero(), l = alEvento ? (d => alEvento(d)) : null; if(l) oyentes.add(l);
    pendientes.set(id, {res: v => { if(l) oyentes.delete(l); res(v); }, rej: e => { if(l) oyentes.delete(l); rej(e); }});
    w.postMessage({...msg, id}, transferir || []);
  });
}
A.aiLlamar = llamar;
const archivos = {};
export function pct(p){
  if(!p) return '';
  if(p.status === 'progress' && p.file) archivos[p.file] = [p.loaded || 0, p.total || 0];
  let a = 0, b = 0; for(const k in archivos){ a += archivos[k][0]; b += archivos[k][1]; }
  return b ? Math.round(a/b*100) + '% de ' + (b/1048576).toFixed(0) + ' MB' : '';
}
A.aiPct = pct;

const IA = {ocupada:false, cancelar:false, lista:false, cargando:null, palabras:[], cola:Promise.resolve(), rec:null, enviadas:0, hechas:0, idioma:null};
A.aiOcupada = () => IA.ocupada || !!IA.rec;
export function precargar(){
  if(IA.lista || IA.cargando) return IA.cargando;
  IA.cargando = llamar({type:'preload'}, d => { if(d.type === 'load'){ const t = pct(d.p); if(t) modelo('Descargando la IA (solo la primera vez): ' + t); } })
    .then(() => { IA.lista = true; modelo('IA lista ✓'); })
    .catch(e => { IA.cargando = null; modelo('✕ ' + e.message); throw e; });
  IA.cargando.catch(() => {});
  return IA.cargando;
}
A.aiPrecargar = precargar;
const modelo = t => { const el = $('#aiModelo'); if(el) el.textContent = t; };
const paso = (t, p) => { const s = $('#aiPaso'), b = $('#aiBarra'); if(s && t != null) s.textContent = t; if(b && p != null) b.style.width = Math.max(0, Math.min(100, p)) + '%'; };
function flujo(e){
  const el = $('#aiFlujo'); if(!el) return; const vivo = S.fuente === 'spotify';
  el.innerHTML = '<div class="' + (e.letra || '') + '"><b>1 · LETRA</b>' + S.editor.lineas.length + ' líneas listas</div>' +
    '<div class="' + (e.audio || '') + '"><b>2 · AUDIO</b>' + (vivo ? 'Compartir esta pestaña con su audio' : 'El archivo MP3 que está sonando') + '</div>' +
    '<div class="' + (e.escucha || '') + '"><b>3 · LA IA ESCUCHA</b>' + (vivo ? 'Mientras la canción suena' : 'Analiza el archivo solo') + '</div>';
}
function lista(){
  const el = $('#aiLista'); if(!el || !S.editor) return;
  const r = IA.palabras.length ? alinear(S.editor.lineas.map(l => l.text), IA.palabras) : null, h = r ? r.hit : [];
  el.innerHTML = S.editor.lineas.map((l, i) => '<div class="' + (h[i] != null ? 'ok' : '') + '"><span>' + (h[i] != null ? fmtL(h[i]) : '··:··.··') + '</span>' + esc(l.text) + '</div>').join('');
}
export function empezar(){
  if(!S.editor || !S.editor.lineas.length){ aviso('Primero pega la letra.', 3000); return; }
  if(S.fuente === 'demo'){ aviso('Las canciones demo no tienen voz real. Usa la IA con <b>Spotify</b> o un <b>MP3</b>.', 6000); return; }
  if(S.spRemoto){ aviso('La sincronización con IA necesita la <b>PC</b>: el celular no puede compartir el audio de Spotify. Aquí puedes sincronizar <b>a mano</b>.', 7000); return; }
  if(S.fuente !== 'mp3' && S.fuente !== 'spotify'){ aviso('La IA necesita una canción de <b>Spotify</b> o un <b>MP3</b>.', 5000); return; }
  if(S.fuente === 'spotify' && !idActual()){ aviso('Primero pon a sonar la canción en SEÑAL desde tu biblioteca.', 5000); return; }
  ponerPaso('ia'); Object.assign(IA, {cancelar:false, palabras:[], enviadas:0, hechas:0, cola:Promise.resolve()});
  const vivo = S.fuente === 'spotify';
  $('#edCuerpo').innerHTML = '<div class="ai"><h5>Sincronizar con <span>IA</span></h5><p>' + (vivo
    ? 'Pulsa <b>EMPEZAR</b>. En la ventana que aparece elige <b>esta pestaña (SEÑAL)</b> y deja marcado <b>Compartir audio de la pestaña</b>. La canción vuelve al inicio y la IA la escucha mientras suena.'
    : 'Pulsa <b>EMPEZAR</b> y la IA analiza el archivo directamente, sin escucharlo entero.') + '</p>' +
    '<div class="aiflow" id="aiFlujo"></div><div class="aiPaso" id="aiPaso">Listo para empezar</div><div class="barraIA"><div id="aiBarra"></div></div>' +
    '<div class="aiModelo" id="aiModelo">' + (IA.lista ? 'IA lista ✓' : 'Preparando la IA…') + '</div><div class="aiLista" id="aiLista"></div></div>';
  flujo({letra:'ok', audio:'act'}); lista();
  $('#edPie').innerHTML = '<span class="kb">Funciona mejor con voces claras. Al final puedes corregir cualquier línea con un toque.</span><button class="cap chico" id="aiAtras">← TEXTO</button><span class="sp"></span><button id="aiVa" class="cap big on">▶ EMPEZAR</button>';
  $('#aiAtras').onclick = () => { detener(true); paso1(); };
  $('#aiVa').onclick = () => vivo ? enVivo() : deArchivo();
  precargar();
  detectarIdioma(S.editor.lineas.map(l => l.text).join('\n').slice(0, 1500)).then(l => IA.idioma = l);
}
A.aiEmpezar = empezar;
function encolar(fuente, offset, lo, hi){
  IA.enviadas++;
  IA.cola = IA.cola.then(async () => {
    if(IA.cancelar) return;
    const pcm = typeof fuente === 'function' ? await fuente() : fuente;
    await precargar();
    const ws = await llamar({type:'win', audio:pcm, offset, lo, hi, language:IA.idioma || null}, null, [pcm.buffer]);
    if(IA.cancelar) return;
    IA.palabras.push(...ws); IA.hechas++; lista();
    if(!IA.rec) paso('Reconociendo la voz… parte ' + IA.hechas + ' de ' + IA.enviadas, 10 + IA.hechas/Math.max(1, IA.enviadas)*85);
  });
  return IA.cola;
}
async function a16k(d, tasa){
  if(tasa === 16000) return d;
  const off = new OfflineAudioContext(1, Math.ceil(d.length/tasa*16000), 16000);
  const b = off.createBuffer(1, d.length, tasa); b.getChannelData(0).set(d);
  const s = off.createBufferSource(); s.buffer = b; s.connect(off.destination); s.start();
  return (await off.startRendering()).getChannelData(0);
}
async function deArchivo(){
  if(!archivoMP3){ error('No encuentro el archivo MP3. Vuelve a abrirlo desde ♫ Música.'); return; }
  IA.ocupada = true; $('#aiVa').disabled = true; flujo({letra:'ok', audio:'ok', escucha:'act'});
  try {
    paso('Leyendo el audio…', 4); const AC = asegurarAC();
    const buf = await AC.decodeAudioData(await archivoMP3.arrayBuffer());
    const off = new OfflineAudioContext(1, Math.ceil(buf.duration*16000), 16000);
    const s = off.createBufferSource(); s.buffer = buf; s.connect(off.destination); s.start();
    const pcm = (await off.startRendering()).getChannelData(0);
    if(!IA.lista) paso('Esperando a que termine de descargar la IA…', 8);
    await precargar();
    const SR = 16000, VEN = 30*SR, PASO = 28*SR;
    for(let st = 0, k = 0; st < pcm.length; st += PASO, k++){
      const seg = pcm.slice(st, Math.min(pcm.length, st + VEN)); if(seg.length < SR) break;
      encolar(seg, st/SR, k === 0 ? 0 : 1, st + VEN >= pcm.length ? 1e9 : 29);
    }
    paso('Reconociendo la voz… parte 0 de ' + IA.enviadas, 10);
    await IA.cola; terminar();
  } catch(e){ error(e.message || e); }
}
async function enVivo(){
  IA.ocupada = true; $('#aiVa').disabled = true;
  try {
    const AC = asegurarAC();
    let st = (S.vivo && flujoActual()) ? flujoActual() : null, propio = false;
    if(!st){
      paso('Elige esta pestaña y deja activado “Compartir audio”…', 2);
      st = await navigator.mediaDevices.getDisplayMedia({video:{displaySurface:'browser'}, preferCurrentTab:true, selfBrowserSurface:'include', surfaceSwitching:'exclude', systemAudio:'include',
        audio:{echoCancellation:false, noiseSuppression:false, autoGainControl:false, suppressLocalAudioPlayback:false}});
      propio = true;
      if(!st.getAudioTracks().length){ st.getTracks().forEach(t => t.stop()); throw new Error('No se compartió el audio. Vuelve a pulsar EMPEZAR y deja marcada la casilla <b>Compartir audio de la pestaña</b>.'); }
    }
    flujo({letra:'ok', audio:'ok', escucha:'act'});
    const TASA = AC.sampleRate, VEN = 30;
    const src = AC.createMediaStreamSource(st), proc = AC.createScriptProcessor(4096, 1, 1), mudo = AC.createGain(); mudo.gain.value = 0;
    const R = IA.rec = {src, proc, mudo, st, propio, buf:[], len:0, ini:null, k:0, activo:false, energia:0, muestras:0};
    proc.onaudioprocess = ev => {
      if(!R.activo) return;
      const d = ev.inputBuffer.getChannelData(0);
      if(R.ini == null) R.ini = segundo();
      R.buf.push(new Float32Array(d)); R.len += d.length;
      let e = 0; for(let i = 0; i < d.length; i += 16) e += d[i]*d[i]; R.energia += e; R.muestras += d.length/16;
      if(R.len >= VEN*TASA) vaciar(false);
    };
    src.connect(proc); proc.connect(mudo); mudo.connect(AC.destination);
    await A.spReiniciar();
    await new Promise(r => setTimeout(r, 400));
    R.activo = true;
    const pista = idActual();
    $('#edPie').innerHTML = '<span class="kb">Deja que la canción suene. Puedes terminar antes si ya pasó toda la parte cantada.</span><span class="sp"></span><button id="aiFin" class="cap big on">■ TERMINAR Y REVISAR</button>';
    let avisado = false;
    await new Promise(res => {
      $('#aiFin').onclick = res;
      const iv = setInterval(() => {
        if(IA.cancelar){ clearInterval(iv); res(); return; }
        const d = duracion(), s = segundo();
        paso('Escuchando… ' + fmt(s) + (d ? ' / ' + fmt(d) : '') + (IA.hechas ? ' · ' + IA.hechas + ' parte(s) analizada(s)' : ''), d ? s/d*90 : 10);
        if(!avisado && R.muestras > 5*TASA/16 && R.energia/R.muestras < 1e-6){ avisado = true; aviso('No llega sonido. ¿La canción está sonando <b>en SEÑAL</b> y compartiste el audio de <b>esta pestaña</b>?', 8000); }
        if(idActual() !== pista || (d && s >= d - 1)){ clearInterval(iv); res(); }
      }, 300);
    });
    if(IA.cancelar) return;
    R.activo = false; if(R.len > 16000) vaciar(true);
    pararRec(); paso('Terminando de analizar…', 92);
    await IA.cola; terminar();
  } catch(e){ pararRec(); error(e.message || e); }
}
function vaciar(final){
  const R = IA.rec; if(!R || !R.len) return;
  const todo = new Float32Array(R.len); let o = 0; for(const c of R.buf){ todo.set(c, o); o += c.length; }
  const tasa = contextoAudio().sampleRate, offset = R.ini, k = R.k++;
  encolar(() => a16k(todo, tasa), offset, k === 0 ? 0 : 1, final ? 1e9 : 29);
  const queda = todo.slice(Math.max(0, todo.length - 2*tasa));
  R.buf = [queda]; R.len = queda.length; R.ini = offset + (todo.length - queda.length)/tasa;
}
function pararRec(){ const R = IA.rec; if(!R) return; try { R.proc.disconnect(); R.src.disconnect(); R.mudo.disconnect(); if(R.propio) R.st.getTracks().forEach(t => t.stop()); } catch(e){} IA.rec = null; }
function detener(cancelar){ if(cancelar) IA.cancelar = true; IA.ocupada = false; pararRec(); }
A.aiCancelar = () => detener(true);
function terminar(){
  IA.ocupada = false; if(!S.editor || IA.cancelar) return;
  const r = IA.palabras.length ? alinear(S.editor.lineas.map(l => l.text), IA.palabras) : null;
  if(!r){ error('La IA no reconoció voz suficiente. Puede pasar con mucha música encima o voces muy distorsionadas. Puedes sincronizar a mano.'); return; }
  S.editor.lineas.forEach((l, i) => l.t = Math.round(r.times[i]*100)/100);
  S.editor.meta = 0; paso2();
  aviso('✦ La IA sincronizó <b>' + r.matched + ' de ' + S.editor.lineas.length + '</b> líneas (las demás se estimaron). Dale play para revisar; toca una línea para corregirla, o <b>GUARDAR</b>.', 10000);
}
function error(msg){
  IA.ocupada = false; pararRec(); if(!S.editor) return;
  paso('', 0); flujo({letra:'ok', audio:'mal'});
  const b = $('#aiLista'); if(b) b.insertAdjacentHTML('beforebegin', '<div class="aiError">✕ ' + msg + '</div>');
  $('#edPie').innerHTML = '<button class="cap chico" id="aiAtras2">← TEXTO</button><span class="sp"></span><button id="aiMano" class="cap big">A MANO</button><button id="aiOtra" class="cap big on">REINTENTAR</button>';
  $('#aiAtras2').onclick = paso1; $('#aiMano').onclick = paso2; $('#aiOtra').onclick = empezar;
}

// alineación: compara las palabras de tu letra con las que la IA escuchó
const norm = w => w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '')
  .replace(/h/g, '').replace(/v/g, 'b').replace(/ll/g, 'y').replace(/z/g, 's').replace(/c([ei])/g, 's$1').replace(/qu/g, 'k').replace(/(.)\1+/g, '$1');
function sim(a, b){
  if(a === b) return 1; const n = a.length, m = b.length; if(!n || !m) return 0;
  if(Math.abs(n - m) > Math.max(n, m)*.5) return 0;
  let prev = Array.from({length:m+1}, (_, j) => j);
  for(let i = 1; i <= n; i++){ const cur = [i]; for(let j = 1; j <= m; j++) cur[j] = Math.min(prev[j] + 1, cur[j-1] + 1, prev[j-1] + (a[i-1] === b[j-1] ? 0 : 1)); prev = cur; }
  return 1 - prev[m]/Math.max(n, m);
}
export function alinear(lineas, asr){
  const L = []; lineas.forEach((ln, li) => ln.split(/\s+/).forEach((w, wi) => { const n = norm(w); if(n) L.push({n, li, wi}); }));
  const Aw = asr.map(x => ({n:norm(x.w), t:x.t})).filter(x => x.n);
  const n = L.length, m = Aw.length; if(!n || m < 3) return null;
  const C = m + 1, P = new Float32Array((n+1)*C), B = new Uint8Array((n+1)*C);
  for(let i = 1; i <= n; i++){ P[i*C] = -.5*i; B[i*C] = 2; }
  for(let j = 1; j <= m; j++){ P[j] = 0; B[j] = 3; }
  for(let i = 1; i <= n; i++) for(let j = 1; j <= m; j++){
    const s = sim(L[i-1].n, Aw[j-1].n);
    const d = P[(i-1)*C + j-1] + (s >= .55 ? 1 + s : -.9), u = P[(i-1)*C + j] - .5, l = P[i*C + j-1] - .15;
    if(d >= u && d >= l){ P[i*C+j] = d; B[i*C+j] = 1; } else if(u >= l){ P[i*C+j] = u; B[i*C+j] = 2; } else { P[i*C+j] = l; B[i*C+j] = 3; }
  }
  let j = 1; for(let k = 1; k <= m; k++) if(P[n*C+k] > P[n*C+j]) j = k;
  let i = n; const hit = new Array(lineas.length).fill(null);
  while(i > 0 && j > 0){
    const b = B[i*C+j];
    if(b === 1){ if(sim(L[i-1].n, Aw[j-1].n) >= .55){ const w = L[i-1], t = Aw[j-1].t - w.wi*.28; if(hit[w.li] == null || t < hit[w.li]) hit[w.li] = t; } i--; j--; }
    else if(b === 2) i--; else j--;
  }
  const matched = hit.filter(x => x != null).length; if(!matched) return null;
  const times = hit.slice(), idx = times.map((t, k) => t != null ? k : -1).filter(k => k >= 0);
  for(let k = 0; k < times.length; k++){
    if(times[k] != null) continue;
    const a = idx.filter(x => x < k).pop(), b = idx.find(x => x > k);
    if(a != null && b != null) times[k] = times[a] + (times[b] - times[a])*(k - a)/(b - a);
    else if(a != null) times[k] = times[a] + 3*(k - a);
    else times[k] = Math.max(0, times[b] - 3*(b - k));
  }
  for(let k = 1; k < times.length; k++) if(times[k] < times[k-1] + .3) times[k] = times[k-1] + .3;
  return {times:times.map(t => Math.max(0, t)), matched, hit};
}
