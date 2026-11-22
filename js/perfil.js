// SEÑAL v2 · Mi perfil: estadísticas de escucha, mis letras, pieles por artista y mi cuenta (descargar / borrar datos).
import { S, A, $, esc, store, aviso } from './estado.js';
import { cuenta, alCambiar, leerHistorial, listarLetras, borrarLetra, exportarDatos, borrarHistorial, borrarCuenta, borrarDatosLocales, salirCuenta } from './nube.js';
import { PIELES, modo } from './pieles/index.js';
import { revisarLetraPropia } from './letras.js';

const COLOR = {a:'#ff4b3e', b:'#d4ff3a', c:'#b9a4ff', d:'#3d5cff', dr:'#c8141c'};
const nombrePiel = id => (PIELES.find(p => p.id === id) || {n: 'Otra'}).n;
let pest = 'stats', rango = 30, hist = null, ganchos = {}, abierto = false, focoAntes = null;

const min = ms => Math.round(ms/60000);
const hace = f => {
  const s = (Date.now() - f)/1000;
  if(s < 90) return 'hace un momento'; if(s < 3600) return 'hace ' + Math.round(s/60) + ' min';
  if(s < 86400) return 'hace ' + Math.round(s/3600) + ' h'; if(s < 172800) return 'ayer';
  return new Date(f).toLocaleDateString('es', {day: 'numeric', month: 'short'});
};
function bajar(nombre, texto, tipo){
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([texto], {type: tipo + ';charset=utf-8'}));
  a.download = nombre; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
const porArtista = () => { try { return JSON.parse(store.get('senal_pielArt') || '{}') || {}; } catch(e){ return {}; } };

// ---------- estadísticas ----------
function calcular(h, dias){
  const desde = dias ? Date.now() - dias*864e5 : 0, L = h.filter(x => x.fecha >= desde);
  const art = new Map(), gen = new Map(), piel = new Map(), horas = new Array(24).fill(0);
  let ms = 0;
  L.forEach(x => {
    ms += x.ms;
    const a = art.get(x.artista) || {ms: 0, n: 0}; a.ms += x.ms; a.n++; art.set(x.artista, a);
    if(x.genero) gen.set(x.genero, (gen.get(x.genero) || 0) + 1);
    if(x.piel) piel.set(x.piel, (piel.get(x.piel) || 0) + x.ms);
    horas[new Date(x.fecha - x.ms/2).getHours()] += x.ms;
  });
  const orden = m => [...m.entries()].sort((p, q) => (q[1].ms ?? q[1]) - (p[1].ms ?? p[1]));
  return {L, ms, n: L.length, artistas: orden(art), generos: orden(gen), pieles: orden(piel), horas};
}
function vistaStats(){
  if(!hist) return '<p class="pf-vacio">Cargando tu historial…</p>';
  const st = calcular(hist, rango);
  const rangos = [[7, '7 DÍAS'], [30, '30 DÍAS'], [0, 'TODO']].map(([d, t]) => `<button class="${rango === d ? 'on' : ''}" data-rango="${d}">${t}</button>`).join('');
  let html = `<div class="pf-rango" role="group" aria-label="Periodo">${rangos}</div>`;
  if(!st.n) return html + `<div class="pf-vacio"><b>Todavía no hay escuchas${rango ? ' en este periodo' : ''}.</b><br>Cada canción de Spotify o MP3 que escuches más de 30 segundos aparece aquí. Las canciones del demo no cuentan.${cuenta.estado === 'invitado' ? '' : '<br><br>Sin cuenta, tu historial se guarda solo en este dispositivo.'}</div>`;
  const maxA = st.artistas[0][1].ms, maxH = Math.max(...st.horas), pico = st.horas.indexOf(maxH), totP = st.pieles.reduce((s, [, v]) => s + v, 0) || 1;
  html += `
    <div class="pf-numeros">
      <div><b>${min(st.ms).toLocaleString('es')}</b><span>minutos</span></div>
      <div><b>${st.n.toLocaleString('es')}</b><span>${st.n === 1 ? 'canción' : 'canciones'}</span></div>
      <div><b>${st.artistas.length}</b><span>${st.artistas.length === 1 ? 'artista' : 'artistas'}</span></div>
    </div>
    <section class="pf-sec"><h4>Tus artistas</h4>
      ${st.artistas.slice(0, 6).map(([a, v], i) => `<div class="pf-barra"><span class="nom"><i>${i + 1}</i>${esc(a)}</span><span class="pista"><span style="width:${Math.max(3, v.ms/maxA*100).toFixed(1)}%"></span></span><span class="val">${min(v.ms)} min</span></div>`).join('')}
    </section>
    ${st.generos.length ? `<section class="pf-sec"><h4>Tus géneros</h4><div class="pf-chips">${st.generos.slice(0, 10).map(([g, n]) => `<span>${esc(g)} <small>${n}</small></span>`).join('')}</div></section>` : ''}
    ${st.pieles.length ? `<section class="pf-sec"><h4>Cómo se vio tu música</h4>
      <div class="pf-pieles" aria-hidden="true">${st.pieles.map(([p, v]) => `<span style="flex:${v};background:${COLOR[p] || '#666'}"></span>`).join('')}</div>
      <div class="pf-ley">${st.pieles.map(([p, v]) => `<span><i style="background:${COLOR[p] || '#666'}"></i>${esc(nombrePiel(p))} · ${Math.round(v/totP*100)}%</span>`).join('')}</div></section>` : ''}
    <section class="pf-sec"><h4>A qué hora escuchas <small>más a las ${String(pico).padStart(2, '0')}:00</small></h4>
      <div class="pf-horas" role="img" aria-label="Minutos escuchados por hora del día; la hora con más música es las ${pico}:00">${st.horas.map((v, h) => `<span class="${h === pico ? 'pico' : ''}" style="height:${maxH ? Math.max(2, v/maxH*100).toFixed(1) : 2}%"></span>`).join('')}</div>
      <div class="pf-ejes"><span>0 h</span><span>6 h</span><span>12 h</span><span>18 h</span><span>23 h</span></div></section>
    <section class="pf-sec"><h4>Lo último</h4>
      ${st.L.slice(0, 12).map(x => `<div class="pf-fila"><span class="tx"><b>${esc(x.cancion)}</b><small>${esc(x.artista)}${x.genero ? ' · ' + esc(x.genero) : ''}</small></span><span class="cuando">${hace(x.fecha)}</span></div>`).join('')}
    </section>`;
  return html;
}

// ---------- mis letras ----------
function vistaLetras(){
  const l = listarLetras();
  if(!l.length) return '<div class="pf-vacio"><b>Aún no tienes letras propias.</b><br>Crea una con <b>Aa Letra → ✎ Crear / editar</b>, sincronízala con IA o importa un .lrc.</div>';
  return `<p class="pf-nota">${l.length} ${l.length === 1 ? 'letra' : 'letras'} · ${cuenta.estado === 'invitado' ? 'guardadas en tu cuenta' : 'guardadas en este dispositivo'}</p>` +
    l.map((x, i) => `<div class="pf-fila"><span class="tx"><b>${esc(x.titulo)}</b><small>${esc(x.artista || '—')}</small></span>
      <button class="cap chico" data-bajar="${i}" aria-label="Descargar ${esc(x.titulo)} como .lrc">⇩ .LRC</button>
      <button class="cap chico peligro" data-borrar="${i}" aria-label="Borrar tu letra de ${esc(x.titulo)}">✕</button></div>`).join('');
}

// ---------- pieles ----------
function vistaPieles(){
  const m = modo(), mapa = porArtista(), ks = Object.keys(mapa);
  return `<p class="pf-nota">Modo actual: <b>${m === 'auto' ? 'automático (por género)' : 'fijo en ' + esc(nombrePiel(m))}</b>. Lo cambias con <b>◈ Piel</b>, arriba.</p>
    <section class="pf-sec"><h4>Pieles fijas por artista</h4>
    ${ks.length ? ks.sort().map(k => `<div class="pf-fila"><span class="tx"><b>${esc(k)}</b><small><i class="pf-punto" style="background:${COLOR[mapa[k]] || '#666'}"></i>${esc(nombrePiel(mapa[k]))}</small></span><button class="cap chico" data-quitar="${esc(k)}">QUITAR</button></div>`).join('')
      : '<div class="pf-vacio">Ningún artista tiene piel fija. Mientras suena una canción, abre <b>◈ Piel</b> y elige <b>Usar siempre…</b></div>'}</section>`;
}

// ---------- cuenta ----------
function vistaCuenta(){
  const dentro = cuenta.estado === 'invitado';
  return `
    <section class="pf-sec"><h4>Tus datos</h4>
      <p class="pf-nota">${dentro ? 'Tu nombre, tus letras, tus ajustes, tus pieles por artista y tu historial están guardados en tu cuenta.' : 'Sin cuenta: tus letras, ajustes e historial están solo en este navegador.'} <a href="privacidad.html" target="_blank" rel="noopener">Lee la política de privacidad</a>.</p>
      <button class="opt" id="pfExport">⇩ DESCARGAR MIS DATOS<small>Todo lo que SEÑAL guarda de ti, en un archivo .json</small></button>
      <button class="opt" id="pfHist">✕ BORRAR MI HISTORIAL<small>Las estadísticas vuelven a cero. Tus letras no se tocan</small></button>
      ${dentro ? '<button class="opt" id="pfSalir">⎋ CERRAR SESIÓN<small>Tus datos quedan guardados en tu cuenta</small></button>' : ''}
    </section>
    <section class="pf-sec pf-peligro"><h4>${dentro ? 'Borrar mi cuenta' : 'Borrar todo de este dispositivo'}</h4>
      <p class="pf-nota">${dentro ? 'Se borran para siempre tus letras, tu historial, tus ajustes y tu perfil, y tu cuenta de SEÑAL. No se puede deshacer. Tu cuenta de Google y la de Spotify no se tocan.' : 'Se borran tus letras, ajustes, historial y la sesión de Spotify guardados en este navegador. No se puede deshacer.'}</p>
      <label class="pf-conf">Para confirmar, escribe <b>BORRAR</b><input id="pfConf" autocomplete="off" spellcheck="false" aria-describedby="pfEstado"></label>
      <button class="cap peligro" id="pfBorrar" disabled>${dentro ? 'BORRAR MI CUENTA' : 'BORRAR TODO'}</button>
      <p class="pf-estado" id="pfEstado" role="status"></p>
    </section>`;
}

// ---------- pintar y atar ----------
async function pintar(){
  const yo = $('#pfYo'), u = cuenta.usuario, dentro = cuenta.estado === 'invitado';
  yo.innerHTML = (dentro && u.foto ? '<img alt="" referrerpolicy="no-referrer" src="' + esc(u.foto) + '">' : '<span class="pf-av" aria-hidden="true">' + (dentro ? esc((u.nombre || '?').charAt(0)) : '○') + '</span>') +
    '<div><h3 id="pfTitulo">' + (dentro ? esc(u.nombre) : 'Sin <i>cuenta</i>') + '</h3><p>' + (dentro ? esc(u.correo) : 'Todo se guarda solo en este dispositivo') + '</p></div>';
  document.querySelectorAll('.pf-tabs [data-tab]').forEach(b => { const on = b.dataset.tab === pest; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
  const c = $('#pfCuerpo');
  c.innerHTML = pest === 'stats' ? vistaStats() : pest === 'letras' ? vistaLetras() : pest === 'pieles' ? vistaPieles() : vistaCuenta();
  atarCuerpo(c);
}
function atarCuerpo(c){
  c.querySelectorAll('[data-rango]').forEach(b => b.onclick = () => { rango = +b.dataset.rango; pintar(); });
  const l = c.querySelector('[data-bajar]') ? listarLetras() : null;
  c.querySelectorAll('[data-bajar]').forEach(b => b.onclick = () => { const x = l[+b.dataset.bajar]; bajar(((x.artista ? x.artista + ' - ' : '') + x.titulo).replace(/[\\/:*?"<>|]/g, '') + '.lrc', x.lrc, 'text/plain'); });
  c.querySelectorAll('[data-borrar]').forEach(b => b.onclick = async () => {
    if(!b.classList.contains('seguro')){ b.classList.add('seguro'); b.textContent = '¿BORRAR?'; return; }
    const x = listarLetras()[+b.dataset.borrar]; if(!x) return;
    await borrarLetra(x.clave); if(S.meta && S.meta.key === x.clave) revisarLetraPropia();
    aviso('Se borró tu letra de <b>' + esc(x.titulo) + '</b>.', 3000); pintar();
  });
  c.querySelectorAll('[data-quitar]').forEach(b => b.onclick = () => {
    const mapa = porArtista(); delete mapa[b.dataset.quitar];
    store.set('senal_pielArt', JSON.stringify(mapa)); ganchos.guardarPieles && ganchos.guardarPieles(mapa); ganchos.decidir && ganchos.decidir(); pintar();
  });
  const ex = $('#pfExport'); if(ex) ex.onclick = async () => { ex.disabled = true; try { bajar('senal-mis-datos.json', await exportarDatos(), 'application/json'); } catch(e){ aviso('No se pudieron reunir tus datos. Intenta de nuevo.', 4000); } ex.disabled = false; };
  const hb = $('#pfHist'); if(hb) hb.onclick = async () => {
    if(!hb.classList.contains('seguro')){ hb.classList.add('seguro'); hb.firstChild.textContent = '✕ TOCA OTRA VEZ PARA BORRAR TU HISTORIAL'; return; }
    hb.disabled = true; try { await borrarHistorial(); hist = []; aviso('Tu historial se borró.', 3000); } catch(e){ aviso('No se pudo borrar el historial. Intenta de nuevo.', 4000); } pintar();
  };
  const sa = $('#pfSalir'); if(sa) sa.onclick = async () => { cerrarPerfil(); store.set('senal_sinCuenta', '1'); await salirCuenta(); aviso('Sesión cerrada.', 3000); };
  const cf = $('#pfConf'), bo = $('#pfBorrar');
  if(cf) cf.oninput = () => { bo.disabled = cf.value.trim().toUpperCase() !== 'BORRAR'; };
  if(bo) bo.onclick = async () => {
    const est = $('#pfEstado'); bo.disabled = true; cf.disabled = true;
    if(cuenta.estado !== 'invitado'){ borrarDatosLocales(); est.textContent = 'Listo. Recargando…'; setTimeout(() => location.reload(), 800); return; }
    est.textContent = 'Borrando tus datos… no cierres esta página.';
    try { await borrarCuenta(); est.textContent = 'Tu cuenta y todos tus datos de SEÑAL se borraron. Recargando…'; setTimeout(() => location.reload(), 2500); }
    catch(e){ est.textContent = e.code === 'auth/popup-closed-by-user' ? 'Google necesita que confirmes tu cuenta para borrarla. Vuelve a intentarlo.' : 'No se pudo terminar (' + (e.code || e.message) + '). Vuelve a intentarlo.'; bo.disabled = false; cf.disabled = false; }
  };
}

export async function abrirPerfil(tab){
  if(tab) pest = tab;
  ganchos.cerrarPaneles && ganchos.cerrarPaneles();
  focoAntes = document.activeElement; abierto = true;
  const p = $('#perfil'); p.hidden = false; document.body.classList.add('enPerfil');
  hist = null; pintar();
  $('#pfCerrar').focus();
  try { hist = await leerHistorial(); } catch(e){ console.warn(e); hist = []; }
  if(abierto) pintar();
}
A.abrirPerfil = abrirPerfil;
export function cerrarPerfil(){
  if(!abierto) return; abierto = false;
  $('#perfil').hidden = true; document.body.classList.remove('enPerfil');
  focoAntes && focoAntes.focus && focoAntes.focus();
}
export function atarPerfil(g){
  ganchos = g;
  $('#pfCerrar').onclick = cerrarPerfil;
  $('#perfil').addEventListener('mousedown', e => { if(e.target.id === 'perfil') cerrarPerfil(); });
  document.querySelectorAll('.pf-tabs [data-tab]').forEach(b => b.onclick = () => { pest = b.dataset.tab; pintar(); });
  $('#perfil').addEventListener('keydown', e => {
    if(e.key === 'Escape'){ e.stopPropagation(); cerrarPerfil(); return; }
    if(e.key !== 'Tab') return;
    const f = [...$('#perfil').querySelectorAll('button:not([disabled]),input:not([disabled]),a[href]')]; if(!f.length) return;
    const i = f.indexOf(document.activeElement);
    if(e.shiftKey && i <= 0){ e.preventDefault(); f[f.length - 1].focus(); }
    else if(!e.shiftKey && i === f.length - 1){ e.preventDefault(); f[0].focus(); }
  });
  let antes = '';
  alCambiar(c => { const k = c.estado + (c.usuario ? c.usuario.uid : ''); if(k !== antes){ antes = k; if(abierto){ hist = null; pintar(); leerHistorial().then(h => { hist = h; if(abierto) pintar(); }).catch(() => { hist = []; }); } } });
}
