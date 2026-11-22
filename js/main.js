// SEÑAL v2 · arranque: une todos los módulos y corre el bucle de cada cuadro.
import { S, A, $, store, POCO, ES_MOVIL, aviso } from './estado.js';
import { CANCIONES } from './fuentes/demo.js';
import { dibujarPortada } from './portada.js';
import * as R from './reproductor.js';
import * as SP from './spotify.js';
import { atarBiblioteca } from './biblioteca.js';
import * as LE from './letras.js';
import { atarEditor, abrirEditor, exportarLRC, importarLRC, borrarLetraPropia, tickEditor } from './editor.js';
import './ia.js';
import * as V from './visual.js';
import { atarPaneles, cerrarPaneles, aplicarEfectos } from './paneles.js';
import { iniciarNube, ponerAlTraerAjustes, guardarPieles, registrarEscucha } from './nube.js';
import { atarPerfil } from './perfil.js';
import { iniciarApp } from './app.js';
import { atarPuerta } from './puerta.js';
import { iniciarPieles, decidir, pielDeGeneros } from './pieles/index.js';

// ---------- piel ----------
const ui = { garabatos: $('#garabatos'), tarjetas: $('#tarjetas'), pintarFoto: c => LE.pintarFoto(c) };
A.portada = () => R.portadaCanvas;
const enCurso = {};
const cache = (k, d) => { try { return JSON.parse(store.get(k) || '') || d; } catch(e){ return d; } };
iniciarPieles(ui, () => POCO.matches, {
  // géneros de un artista de Spotify (se guardan para no preguntar dos veces)
  async generosArtista(id){
    const c = cache('senal_gen', {}); if(c[id]) return c[id];
    try {
      const a = await SP.api('/artists/' + encodeURIComponent(id)), g = (a && a.genres || []).slice(0, 8);
      const ks = Object.keys(c); if(ks.length > 300) ks.slice(0, 100).forEach(k => delete c[k]);
      c[id] = g; store.set('senal_gen', JSON.stringify(c)); return g;
    } catch(e){ return []; }
  },
  // tus gustos: los géneros de tus artistas más escuchados (se recalcula una vez al día)
  gustoUsuario(){
    const c = cache('senal_gusto', null); if(c && Date.now() - c.t < 864e5) return Promise.resolve(c.r);
    if(S.fuente !== 'spotify') return Promise.resolve(null);
    return enCurso.gusto || (enCurso.gusto = (async () => { try {
      const j = await SP.api('/me/top/artists?limit=20&time_range=medium_term');
      const r = pielDeGeneros((j && j.items || []).flatMap(a => a.genres || []));
      store.set('senal_gusto', JSON.stringify({t: Date.now(), r})); return r;
    } catch(e){ return null; } finally { enCurso.gusto = null; } })());
  },
  guardarPieles,
  alCambiarPiel(){
    LE.construir(); A.piel.portada(R.portadaCanvas); V.colores(); A.marcarTarjetas && A.marcarTarjetas();
    if(S.meta) A.piel.cancion(S.meta);
  }
});

// tarjetas flotantes del demo (con Spotify conectado se cambian por tus más escuchadas)
function tarjetasDemo(){
  A.piel.tarjetas(CANCIONES.map((c, k) => ({titulo:c.titulo, artista:c.artista, clave:c.id, dibujar: cv => dibujarPortada(cv, c),
    tocar: () => { if(S.fuente !== 'demo') R.ponerDemo(); R.cargarDemo(k); S.sonando = true; R.botonPlay(); }})));
}
A.marcarTarjetas = () => A.piel.marcar(S.meta ? (S.meta.key.startsWith('sp:') ? SP.uriActual() : S.meta.key) : '');
A.cargarDemoActual = () => R.cargarDemo(CANCIONES.findIndex(c => c === R.demoActual()));

// ---------- botones ----------
$('#sDemo').onclick = () => { R.ponerDemo(); tarjetasDemo(); };
$('#sPc').onclick = () => R.capturar('pc');
$('#sMic').onclick = () => R.capturar('mic');
if(!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) || ES_MOVIL) $('#sPc').style.display = 'none';
$('#sMp3').onclick = () => $('#fileIn').click();
$('#fileIn').onchange = e => { if(e.target.files[0]) R.abrirMP3(e.target.files[0]); e.target.value = ''; };
$('#sSpot').onclick = async () => { cerrarPaneles(); if(S.fuente === 'spotify') return; if(await SP.token()) SP.iniciar(); else SP.entrar(); };
$('#spSalir').onclick = () => { SP.salir(); store.del('sp_scope'); store.del('sp_me'); R.ponerDemo(); tarjetasDemo(); $('#spLista').innerHTML = '<p class="nota">Sesión cerrada.</p>'; aviso('Sesión de Spotify cerrada en esta página.', 3000); };
$('#bPlay').onclick = R.alternar;
$('#bSig').onclick = R.siguiente;
$('#bAnt').onclick = R.anterior;
$('#tTr').onclick = LE.alternarTraduccion;
$('#tAi').onclick = () => { cerrarPaneles(); abrirEditor(); if(S.editor){ A.aiPrecargar(); if(S.editor.lineas.length) A.aiEmpezar(); else aviso('Pega la letra y pulsa <b>✦ QUE LA IA SINCRONICE</b>. Mientras tanto, la IA ya se está preparando.', 6000); } };
$('#pEdit').onclick = abrirEditor; $('#pImp').onclick = importarLRC; $('#pExp').onclick = exportarLRC; $('#tOrig').onclick = borrarLetraPropia;
$('#oMenos').onclick = () => LE.ponerDesfase(S.desfase - .25);
$('#oMas').onclick = () => LE.ponerDesfase(S.desfase + .25);
S.volumen = +(store.get('senal_vol') || 80); $('#vol').value = S.volumen;
$('#vol').oninput = e => R.volumen(+e.target.value);

// barra de progreso: tocar, arrastrar o flechas
const prog = $('#progreso');
const desdePuntero = ev => { const r = prog.getBoundingClientRect(), d = R.duracion(); if(d) R.irA((ev.clientX - r.left)/r.width*d); };
prog.addEventListener('pointerdown', ev => { prog.setPointerCapture(ev.pointerId); desdePuntero(ev); });
prog.addEventListener('pointermove', ev => { if(ev.buttons && S.fuente !== 'spotify') desdePuntero(ev); });
prog.addEventListener('keydown', ev => { if(ev.key === 'ArrowRight' || ev.key === 'ArrowLeft'){ ev.preventDefault(); R.moverSeg(ev.key === 'ArrowRight' ? 5 : -5); } });

atarPaneles(); atarBiblioteca(); atarEditor();
LE.tarjetasEstilos(); V.tarjetasVisual();
addEventListener('resize', () => { V.medir(); LE.reubicar(); }); V.medir();

// pantalla encendida mientras SEÑAL está abierta (útil en el celular)
let candado = null;
async function despierta(){ try { if('wakeLock' in navigator && !candado && !document.hidden){ candado = await navigator.wakeLock.request('screen'); candado.addEventListener('release', () => { candado = null; }); } } catch(e){} }
['click', 'touchend', 'keydown'].forEach(ev => addEventListener(ev, despierta, {passive:true}));
document.addEventListener('visibilitychange', () => { if(!document.hidden) despierta(); });

// ---------- historial: cada canción (Spotify o MP3) que suena 30 s o más, o la mitad si es corta ----------
let escucha = null, tEsc = Date.now();
const generoDe = m => m.genero || (cache('senal_gen', {})[m.artistaId] || [])[0] || '';
function cerrarEscucha(){
  const e = escucha; escucha = null;
  if(!e || !e.meta || e.meta.key.startsWith('demo:')) return;
  const dur = (e.meta.dur || 0)*1000;
  if(e.ms >= 30000 || (dur && e.ms >= dur*.5)) registrarEscucha({cancion: e.meta.titulo, artista: e.meta.artista, genero: generoDe(e.meta), piel: e.piel, ms: e.ms});
}
setInterval(() => {
  const ahora = Date.now(), paso = Math.min(70000, ahora - tEsc); tEsc = ahora;
  if(escucha && escucha.meta !== S.meta) cerrarEscucha();
  if(!S.meta || !S.sonando) return;
  if(!escucha) escucha = {meta: S.meta, ms: 0};
  escucha.ms += paso; escucha.piel = A.piel.id;
}, 1000);
addEventListener('pagehide', cerrarEscucha);

// ---------- bucle ----------
let antes = performance.now(), pctAntes = -1, metaAntes = null, colorAntes = '';
function cuadro(t){
  const dt = Math.min(.1, (t - antes)/1000); antes = t;
  R.avanzarDemo(dt);
  const F = R.datos(t); V.suavizar(F);
  const e = V.energia(F);
  const acc = document.documentElement.style.getPropertyValue('--acc'); if(acc !== colorAntes){ colorAntes = acc; V.colores(); }
  V.dibujar(e, t); V.dibujarPrevias(e, t);
  const pulso = POCO.matches ? 0 : Math.round(e.bajo*40)/40;
  $('#escena').style.setProperty('--pulso', pulso); $('#tarjetas').style.setProperty('--pulso', pulso);
  A.piel.cuadro(e);
  const s = R.segundo(), d = R.duracion();
  LE.actualizar(s);
  if(S.editor) tickEditor(s);
  const pct = d ? Math.min(100, s/d*100) : 100;
  $('#lleno').style.width = pct + '%'; $('#punto').style.left = pct + '%';
  $('#tiempo').textContent = R.fmtTiempo();
  const p = Math.round(pct); if(p !== pctAntes){ pctAntes = p; prog.setAttribute('aria-valuenow', p); prog.setAttribute('aria-valuetext', R.fmtTiempo()); }
  if(S.meta !== metaAntes){ metaAntes = S.meta; A.marcarTarjetas(); decidir(S.meta); }
  requestAnimationFrame(cuadro);
}

// ---------- cuenta ----------
// cuando llegan los ajustes guardados en tu cuenta, se aplican en vivo
ponerAlTraerAjustes(() => {
  const st = store.get('senal_lyr2'); if(st && st !== S.estiloLetra) LE.ponerEstilo(st);
  const vz = store.get('senal_viz2'); if(vz != null && +vz !== S.modoVisual) V.ponerModo(+vz);
  if((store.get('senal_tr_on') === '1') !== S.traducir) LE.alternarTraduccion();
  const vo = store.get('senal_vol'); if(vo != null && +vo !== S.volumen){ R.volumen(+vo); $('#vol').value = +vo; }
  aplicarEfectos();
  decidir(S.meta);
});
atarPerfil({ cerrarPaneles, decidir: () => decidir(S.meta), guardarPieles });
atarPuerta({
  conectarSpotify: () => $('#sSpot').click(),
  cerrarPaneles,
  abrirPerfil: () => A.abrirPerfil(),
  alCambiarCuenta: () => LE.revisarLetraPropia()
});

R.cargarDemo(0); R.marcarFuente('#sDemo', 'DEMO · sin sonido'); tarjetasDemo(); R.botonPlay();
requestAnimationFrame(cuadro);
iniciarNube();
iniciarApp();
(async () => { await SP.volverDeSpotify(); if(await SP.token()) SP.iniciar(); })();
