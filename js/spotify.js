// SEÑAL v2 · Spotify: inicio de sesión (PKCE), reproductor en la PC y modo acompañante en el celular.
import { S, A, $, esc, store, aviso, ES_MOVIL } from './estado.js';
import { soltar, marcarFuente, ponerCancion, portadaDesdeURL, botonPlay, segundo } from './reproductor.js';

export const CLIENT_ID = '2d02a46696374c5ea441f000b38d97ce';
export const REDIRECT = location.origin + location.pathname.replace(/[^/]*$/, '');
const REDIRECTS_OK = ['http://127.0.0.1:5500/', 'https://bryanespinoza12.github.io/senal/'];
const SCOPES = ['streaming','user-read-email','user-read-private','user-read-playback-state','user-modify-playback-state','user-read-currently-playing','playlist-read-private','playlist-read-collaborative','user-top-read','user-library-read'].join(' ');

// ---------- sesión ----------
const b64url = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
export async function entrar(){
  if(!REDIRECTS_OK.includes(REDIRECT)){ aviso('Para conectar Spotify abre SEÑAL con <b>iniciar.bat</b> (en tu PC) o desde <b>bryanespinoza12.github.io/senal</b> (en el celular).', 10000); return; }
  const verificador = b64url(crypto.getRandomValues(new Uint8Array(64)));
  const reto = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verificador)));
  store.set('sp_verifier', verificador);
  location.href = 'https://accounts.spotify.com/authorize?' + new URLSearchParams({client_id:CLIENT_ID, response_type:'code', redirect_uri:REDIRECT, code_challenge_method:'S256', code_challenge:reto, scope:SCOPES});
}
async function pedirToken(p){
  const r = await fetch('https://accounts.spotify.com/api/token', {method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body:new URLSearchParams(p)});
  const j = await r.json(); if(!r.ok) throw new Error(j.error_description || j.error || 'Error de token');
  store.set('sp_access', j.access_token); if(j.refresh_token) store.set('sp_refresh', j.refresh_token); if(j.scope) store.set('sp_scope', j.scope);
  store.set('sp_exp', String(Date.now() + (j.expires_in - 60)*1000)); return j.access_token;
}
export async function token(){
  const t = store.get('sp_access'), exp = +(store.get('sp_exp') || 0);
  if(t && Date.now() < exp) return t;
  const rt = store.get('sp_refresh'); if(!rt) return null;
  try { return await pedirToken({grant_type:'refresh_token', refresh_token:rt, client_id:CLIENT_ID}); } catch(e){ salir(); return null; }
}
export function salir(){ ['sp_access','sp_refresh','sp_exp','sp_verifier'].forEach(store.del); }
export async function api(ruta, op = {}){
  const t = await token(); if(!t) throw new Error('No hay sesión de Spotify');
  const r = await fetch('https://api.spotify.com/v1' + ruta, {...op, headers:{Authorization:'Bearer ' + t, 'Content-Type':'application/json', ...(op.headers || {})}});
  if(r.status === 204) return null;
  const txt = await r.text(); let j = null; try { j = txt ? JSON.parse(txt) : null; } catch(e){}
  if(!r.ok) throw new Error((j && j.error && (j.error.message || j.error)) || ('Error ' + r.status));
  return j;
}
export async function volverDeSpotify(){
  const q = new URLSearchParams(location.search); if(!q.get('code') && !q.get('error')) return;
  history.replaceState(null, '', location.pathname);
  if(q.get('error')){ aviso('Spotify no dio permiso: ' + esc(q.get('error'))); return; }
  try { await pedirToken({grant_type:'authorization_code', code:q.get('code'), redirect_uri:REDIRECT, client_id:CLIENT_ID, code_verifier:store.get('sp_verifier') || ''}); }
  catch(e){ aviso('No se pudo conectar con Spotify: ' + esc(e.message), 8000); }
}
export const permisosOk = () => { const sc = store.get('sp_scope'); return !!sc && SCOPES.split(' ').every(x => sc.split(' ').includes(x)); };
export function renovarPermisos(){ salir(); store.del('sp_scope'); entrar(); }

// ---------- estado del reproductor ----------
let jugador = null, dispositivo = null, est = null, estEn = 0, ultimaId = null, sondeo = null, sondeando = false, tVol = 0;
export const dispositivoActivo = () => dispositivo;
export const uriActual = () => est && est.track_window && est.track_window.current_track ? est.track_window.current_track.uri : '';
export const idActual = () => ultimaId;
A.spSegundo = () => est ? Math.min(est.duration, est.position + (S.sonando ? performance.now() - estEn : 0))/1000 : 0;
A.spDuracion = () => est ? est.duration/1000 : 0;

export function salirSpotify(){
  clearInterval(sondeo); sondeo = null; S.spRemoto = false;
  if(jugador){ try { jugador.disconnect(); } catch(e){} }
  jugador = null; dispositivo = null; est = null; ultimaId = null;
}
A.salirSpotify = salirSpotify;

function cargarSDK(){ return new Promise(res => { if(window.Spotify) return res(); window.onSpotifyWebPlaybackSDKReady = res; const s = document.createElement('script'); s.src = 'https://sdk.scdn.co/spotify-player.js'; document.head.appendChild(s); }); }
async function guardarYo(){ try { const yo = await api('/me'); if(yo && yo.id) store.set('sp_me', yo.id); } catch(e){} }

function nuevaCancion(tr, durMs, kicker){
  ultimaId = tr.id;
  ponerCancion(tr.name, (tr.artists || []).map(a => a.name).join(', ') + (tr.album ? ' · ' + tr.album.name : ''), kicker);
  const imgs = [...((tr.album && tr.album.images) || [])].sort((a, b) => (b.width||0) - (a.width||0)); if(imgs[0]) portadaDesdeURL(imgs[0].url);
  const meta = {key:'sp:' + tr.id, titulo:tr.name, artista:tr.artists && tr.artists[0] ? tr.artists[0].name : '', artistaId:tr.artists && tr.artists[0] ? (tr.artists[0].id || String(tr.artists[0].uri || '').split(':').pop()) : '', album:tr.album ? tr.album.name : '', dur:durMs/1000};
  A.letraPara(meta, () => A.buscarLetra(meta));
}

export async function iniciar(){
  if(!(await token())) return;
  if(!permisosOk()) setTimeout(() => { aviso('SEÑAL necesita <b>renovar los permisos de Spotify</b>. <button id="reAuth3">RENOVAR</button>', 15000); const b = $('#reAuth3'); if(b) b.onclick = renovarPermisos; }, 1500);
  if(ES_MOVIL){ iniciarAcompanante(); return; }
  await cargarSDK(); soltar(); salirSpotify();
  S.fuente = 'spotify'; S.sonando = false; botonPlay(); marcarFuente('#sSpot', 'SPOTIFY');
  ponerCancion('Conectando…', 'Preparando el reproductor', 'SPOTIFY'); S.meta = null; S.origenLetra = 'none'; A.ponerLetra(null, 'none');
  jugador = new Spotify.Player({name:'SEÑAL', getOAuthToken: cb => { token().then(t => cb(t)); }, volume:S.volumen/100});
  jugador.addListener('ready', async ({device_id}) => {
    dispositivo = device_id; guardarYo();
    ponerCancion('Listo para sonar', 'Elige algo en tu biblioteca', 'SPOTIFY CONECTADO'); S.meta = null; A.ponerLetra(null, 'none');
    aviso('Conectado. <b>SEÑAL</b> ya aparece como dispositivo en tu Spotify.', 4500);
    try { await api('/me/player', {method:'PUT', body:JSON.stringify({device_ids:[device_id], play:false})}); } catch(e){}
    A.bibIr({v:'pl'}, true); A.ponerBiblioteca(true); A.tarjetasSpotify && A.tarjetasSpotify();
  });
  jugador.addListener('not_ready', () => aviso('El reproductor de Spotify se desconectó.'));
  ['initialization_error','authentication_error','account_error','playback_error'].forEach(ev => jugador.addListener(ev, ({message}) => aviso('Spotify: ' + esc(message), 8000)));
  jugador.addListener('player_state_changed', st => {
    if(!st) return;
    est = st; estEn = performance.now(); S.sonando = !st.paused; botonPlay(); A.marcarSonando && A.marcarSonando();
    const tr = st.track_window && st.track_window.current_track;
    if(tr && tr.id !== ultimaId) nuevaCancion(tr, st.duration, 'SONANDO EN SPOTIFY');
  });
  if(!(await jugador.connect())) aviso('No se pudo iniciar el reproductor de Spotify en este navegador.', 6000);
}

// ---------- modo acompañante (celular): la música suena en la app de Spotify ----------
function iniciarAcompanante(){
  soltar(); salirSpotify();
  S.fuente = 'spotify'; S.spRemoto = true; S.sonando = false; botonPlay(); marcarFuente('#sSpot', 'SPOTIFY · ACOMPAÑANTE');
  ponerCancion('Pon música en tu app de Spotify', 'SEÑAL la sigue: letra, portada y colores', 'MODO ACOMPAÑANTE'); S.meta = null; A.ponerLetra(null, 'none');
  aviso('<b>Modo acompañante</b>: la música suena en tu <b>app de Spotify</b> y SEÑAL muestra la letra y los visuales. Para que las ondas sigan el sonido real, activa <b>MICRÓFONO</b>.', 9000);
  guardarYo(); sondear(); sondeo = setInterval(sondear, 2500);
}
async function sondear(){
  if(!S.spRemoto || sondeando || document.hidden) return;
  sondeando = true;
  try {
    const t0 = performance.now(), j = await api('/me/player?additional_types=track'), medio = (performance.now() - t0)/2;
    if(!S.spRemoto) return;
    if(j && j.device) dispositivo = j.device.id;
    if(!j || !j.item || j.item.type !== 'track'){ if(S.sonando){ S.sonando = false; botonPlay(); } return; }
    est = {position: j.progress_ms + (j.is_playing ? medio : 0), duration: j.item.duration_ms, paused: !j.is_playing, track_window:{current_track:{uri:j.item.uri}}};
    estEn = performance.now();
    if(S.sonando !== j.is_playing){ S.sonando = j.is_playing; botonPlay(); }
    A.marcarSonando && A.marcarSonando();
    if(j.item.id !== ultimaId) nuevaCancion(j.item, j.item.duration_ms, 'SONANDO EN TU SPOTIFY');
  } catch(e){
    if(/401|token|sesión/i.test(e.message)){ aviso('Tu sesión de Spotify expiró. Vuelve a conectar desde ♫ Música.', 6000); salirSpotify(); }
  } finally { sondeando = false; }
}
document.addEventListener('visibilitychange', () => { if(!document.hidden && S.spRemoto) sondear(); });
function errorRemoto(e){
  if(/NO_ACTIVE_DEVICE|404|no active/i.test(e.message)) aviso('Abre la <b>app de Spotify</b> y dale play una vez; luego podrás controlarla desde aquí.', 6000);
  else if(/restrict|403|premium/i.test(e.message)) aviso('Spotify no dejó hacer eso desde aquí. Hazlo en la app de Spotify.', 5000);
  else aviso('Spotify: ' + esc(e.message), 5000);
}
async function orden(cmd){
  try {
    if(cmd === 'play' || cmd === 'pause'){ S.sonando = cmd === 'play'; if(est){ est.position = segundo()*1000; estEn = performance.now(); } botonPlay(); await api('/me/player/' + cmd, {method:'PUT'}); }
    else await api('/me/player/' + cmd, {method:'POST'});
  } catch(e){ errorRemoto(e); }
  setTimeout(sondear, 450);
}

// ---------- controles (PC o celular) ----------
A.spAlternar = () => { if(S.spRemoto) return orden(S.sonando ? 'pause' : 'play'); if(jugador){ if(jugador.activateElement) jugador.activateElement(); jugador.togglePlay(); } };
A.spSiguiente = () => S.spRemoto ? orden('next') : jugador && jugador.nextTrack();
A.spAnterior = () => S.spRemoto ? orden('previous') : jugador && jugador.previousTrack();
A.spIrA = async seg => {
  const ms = Math.max(0, Math.floor(seg*1000));
  if(est){ est.position = ms; estEn = performance.now(); }
  if(S.spRemoto){ try { await api('/me/player/seek?position_ms=' + ms, {method:'PUT'}); } catch(e){ errorRemoto(e); } setTimeout(sondear, 450); }
  else if(jugador) jugador.seek(ms);
};
A.spVolumen = v => {
  if(jugador) jugador.setVolume(v/100);
  if(S.spRemoto){ clearTimeout(tVol); tVol = setTimeout(() => api('/me/player/volume?volume_percent=' + v, {method:'PUT'}).catch(() => {}), 350); }
};
A.spReiniciar = async () => { // la IA pide empezar la canción desde 0
  if(jugador){ if(jugador.activateElement) await jugador.activateElement(); try { await jugador.seek(0); } catch(e){} try { await jugador.resume(); } catch(e){} }
  if(est){ est.position = 0; estEn = performance.now(); } S.sonando = true; botonPlay();
};
export async function reproducir(cuerpo){
  if(S.spRemoto){
    try { await api('/me/player/play' + (dispositivo ? '?device_id=' + dispositivo : ''), {method:'PUT', body:JSON.stringify(cuerpo)}); setTimeout(sondear, 600); }
    catch(e){ errorRemoto(e); }
    return;
  }
  if(!dispositivo){ if(S.fuente !== 'spotify'){ aviso('Conectando Spotify…', 3000); iniciar(); } else aviso('El reproductor todavía se está preparando, espera un segundo.', 3000); return; }
  try { if(jugador.activateElement) await jugador.activateElement(); await api('/me/player/play?device_id=' + dispositivo, {method:'PUT', body:JSON.stringify(cuerpo)}); }
  catch(e){ aviso('No se pudo reproducir: ' + esc(e.message), 6000); }
}
export async function encolar(t){
  if(!dispositivo){ aviso(S.spRemoto ? 'Abre la app de Spotify y dale play una vez.' : 'Primero conecta Spotify.', 3000); return; }
  try { await api('/me/player/queue?' + new URLSearchParams({uri:t.uri, device_id:dispositivo}), {method:'POST'}); aviso('Agregada a la cola: <b>' + esc(t.name) + '</b>', 2500); }
  catch(e){ aviso('No se pudo agregar a la cola: ' + esc(e.message), 5000); }
}
