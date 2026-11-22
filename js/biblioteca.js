// SEÑAL v2 · biblioteca de Spotify: playlists, canciones, Me gusta, más escuchadas, álbumes, artistas y búsqueda.
import { S, A, $, esc, fmt, store } from './estado.js';
import { api, token, reproducir, encolar, uriActual, entrar, renovarPermisos } from './spotify.js';

let pila = [], vista = null, volver = null;
const L = () => $('#spLista');
const imgDe = (imgs, chica) => { if(!imgs || !imgs.length) return ''; const a = [...imgs].sort((x, y) => (x.width||0) - (y.width||0)); return (chica ? a[0] : a[a.length-1]).url; };
const msTxt = ms => fmt((ms || 0)/1000);

// ---------- abrir / cerrar el cajón ----------
export function ponerBiblioteca(abrir){
  const estaba = document.body.classList.contains('lib');
  if(abrir) A.cerrarPaneles();
  document.body.classList.toggle('lib', abrir);
  $('#cajon').inert = !abrir; $('#bLib2').setAttribute('aria-expanded', String(abrir));
  if(abrir && !estaba){ volver = document.activeElement; if(matchMedia('(hover:hover) and (pointer:fine)').matches) setTimeout(() => $('#bLibX').focus({preventScroll:true}), 60); }
  if(!abrir && estaba && $('#cajon').contains(document.activeElement)) (volver && volver.isConnected ? volver : $('#bLib2')).focus({preventScroll:true});
  setTimeout(() => A.reubicarLetra && A.reubicarLetra(), 520);
}
A.ponerBiblioteca = ponerBiblioteca;
export function abrirBuscar(){ A.cerrarPaneles(); ponerBiblioteca(true); if(!vista) ir({v:'pl'}, true); setTimeout(() => $('#buscar').focus(), 120); }

// ---------- navegación ----------
function pestanas(v){ $('#tPl').classList.toggle('on', v === 'pl'); $('#tGusta').classList.toggle('on', v === 'gusta'); $('#tTop').classList.toggle('on', v === 'top'); }
export function ir(v, reiniciar){ if(reiniciar) pila = []; else if(vista) pila.push(vista); vista = v; pintar(); }
A.bibIr = ir;
function atras(){ vista = pila.pop() || {v:'pl'}; pintar(); }
const migas = t => pila.length ? '<div class="migas"><button class="cap chico" id="bibAtras">← VOLVER</button><b>' + esc(t || '') + '</b></div>' : '';
function atarMigas(){ const b = $('#bibAtras'); if(b) b.onclick = atras; }
function empezar(v){ if(vista !== v) return false; L().innerHTML = migas(v.titulo); atarMigas(); return true; }

function filaCancion(t, i, alTocar){
  const d = document.createElement('div'); d.className = 'item trk' + (t.uri === uriActual() ? ' sonando' : ''); d.dataset.uri = t.uri;
  d.setAttribute('role', 'button'); d.tabIndex = 0;
  const img = t.album ? imgDe(t.album.images, true) : '';
  d.innerHTML = '<span class="n">' + (i + 1) + '</span>' + (img ? '<img alt="" src="' + esc(img) + '">' : '') +
    '<div class="tx"><b title="' + esc(t.name) + '">' + esc(t.name) + '</b><span>' + esc((t.artists || []).map(a => a.name).join(', ')) + '</span></div>' +
    '<span class="d">' + msTxt(t.duration_ms) + '</span><button class="q" aria-label="Agregar ' + esc(t.name) + ' a la cola">＋</button>';
  d.onclick = () => alTocar(i, t);
  d.onkeydown = e => { if(e.key === 'Enter' && e.target === d) alTocar(i, t); };
  d.querySelector('.q').onclick = e => { e.stopPropagation(); encolar(t); };
  return d;
}
function filaTarjeta(o){
  const d = document.createElement('button'); d.className = 'item' + (o.redondo ? ' redondo' : '');
  d.innerHTML = '<img alt=""' + (o.img ? ' src="' + esc(o.img) + '"' : '') + '><div class="tx"><b title="' + esc(o.nombre) + '">' + esc(o.nombre) + '</b><span>' + esc(o.sub || '') + '</span></div>';
  d.onclick = o.ir; return d;
}
function botonMas(fn){ const b = document.createElement('button'); b.className = 'cap mas'; b.textContent = 'VER MÁS'; b.onclick = () => { b.remove(); fn(); }; L().appendChild(b); }
export function marcarSonando(){ const u = uriActual(); document.querySelectorAll('#spLista .item.trk').forEach(el => el.classList.toggle('sonando', el.dataset.uri === u)); }
A.marcarSonando = marcarSonando;

async function pintar(){
  const v = vista || {v:'pl'};
  pestanas(['pl','gusta','top'].includes(v.v) ? v.v : '');
  if(!(await token())){ L().innerHTML = '<p class="nota">Conecta Spotify para ver tu biblioteca y buscar.</p><button class="cap mas" id="bibConectar">CONECTAR SPOTIFY</button>'; $('#bibConectar').onclick = entrar; return; }
  L().innerHTML = migas(v.titulo) + '<p class="nota">Cargando…</p>'; atarMigas();
  const esta = vista;
  try {
    await ({pl:vPlaylists, playlist:vPlaylist, gusta:vGusta, top:vTop, album:vAlbum, artista:vArtista, buscar:vBuscar})[v.v](esta);
  } catch(e){
    if(vista !== esta) return;
    if(/scope|permission|forbidden|401|403/i.test(e.message) && v.v !== 'playlist'){
      L().innerHTML = migas(v.titulo) + '<p class="aviso2">Tu sesión de Spotify tiene <b>permisos de una versión anterior</b>. Pulsa el botón para renovarlos.</p><button class="cap mas" id="reAuth2">RENOVAR PERMISOS</button>';
      atarMigas(); $('#reAuth2').onclick = renovarPermisos;
    } else { L().innerHTML = migas(v.titulo) + '<p class="aviso2">No se pudo cargar: ' + esc(e.message) + '</p>'; atarMigas(); }
  }
}

async function vPlaylists(v){
  const items = []; let url = '/me/playlists?limit=50';
  while(url && items.length < 200){ const j = await api(url); items.push(...(j.items || []).filter(Boolean)); url = j.next ? j.next.replace('https://api.spotify.com/v1', '') : null; }
  if(!empezar(v)) return;
  const yo = store.get('sp_me');
  const mg = filaTarjeta({nombre:'♥ Canciones que te gustan', sub:'Tus canciones guardadas', ir:() => ir({v:'gusta'}, true)}); mg.querySelector('img').style.background = 'linear-gradient(135deg,var(--acc),var(--acc2))'; L().appendChild(mg);
  if(!items.length) L().insertAdjacentHTML('beforeend', '<p class="nota">No tienes playlists todavía.</p>');
  items.forEach(p => L().appendChild(filaTarjeta({nombre:p.name, sub:((p.owner && p.owner.display_name) || 'Playlist') + (p.owner && yo && p.owner.id !== yo ? ' · seguida' : ''), img:imgDe(p.images, true),
    ir:() => ir({v:'playlist', id:p.id, uri:p.uri, titulo:p.name, img:imgDe(p.images), dueno:p.owner})})));
}
async function vPlaylist(v){
  let j = null, err = null;
  try { j = await api('/playlists/' + v.id + '/items?limit=50'); } catch(e){ err = e; }
  if(!empezar(v)) return;
  const total = j && j.total != null ? ' · ' + j.total + ' canciones' : '';
  L().insertAdjacentHTML('beforeend', '<div class="heroe"><img alt=""' + (v.img ? ' src="' + esc(v.img) + '"' : '') + '><div><h5>' + esc(v.titulo) + '</h5><p>' + esc((v.dueno && v.dueno.display_name) || '') + total + '</p><button class="cap on" id="plTodo">▶ REPRODUCIR</button></div></div>');
  $('#plTodo').onclick = () => reproducir({context_uri:v.uri});
  const entradas = j && (j.items || []);
  if(err || !entradas){ L().insertAdjacentHTML('beforeend', '<p class="aviso2">Spotify solo deja ver las canciones de <b>playlists creadas por ti</b> (o en las que colaboras). Esta la puedes <b>reproducir completa</b> con el botón de arriba.</p>'); return; }
  const lista = [], sumar = arr => arr.forEach(e => { const t = e && (e.item || e.track); if(t && t.uri && t.type !== 'episode'){ const i = lista.length; lista.push(t); L().appendChild(filaCancion(t, i, k => reproducir({context_uri:v.uri, offset:{uri:lista[k].uri}}))); } });
  sumar(entradas);
  if(!lista.length) L().insertAdjacentHTML('beforeend', '<p class="nota">Esta playlist está vacía.</p>');
  let sig = j.next; const mas = () => botonMas(async () => { const k = await api(sig.replace('https://api.spotify.com/v1', '')); sumar(k.items || []); sig = k.next; if(sig) mas(); });
  if(sig) mas();
}
async function vGusta(v){
  const sc = store.get('sp_scope');
  if(!sc || !sc.includes('user-library-read')){ if(!empezar(v)) return; L().insertAdjacentHTML('beforeend', '<p class="aviso2">Para ver tus <b>Me gusta</b>, SEÑAL necesita un permiso nuevo de Spotify.</p><button class="cap mas" id="reAuth">DAR PERMISO</button>'); $('#reAuth').onclick = renovarPermisos; return; }
  const j = await api('/me/tracks?limit=50');
  if(!empezar(v)) return;
  const lista = [];
  L().insertAdjacentHTML('beforeend', '<div class="heroe"><img alt="" style="background:linear-gradient(135deg,var(--acc),var(--acc2))"><div><h5>Me gusta</h5><p>' + (j.total || 0) + ' canciones</p><button class="cap on" id="plTodo">▶ REPRODUCIR</button></div></div>');
  const desde = k => reproducir({uris:lista.slice(k, k + 100).map(t => t.uri)});
  $('#plTodo').onclick = () => lista.length && desde(0);
  const sumar = arr => arr.forEach(e => { const t = e && e.track; if(t && t.uri){ const i = lista.length; lista.push(t); L().appendChild(filaCancion(t, i, desde)); } });
  sumar(j.items || []);
  let sig = j.next; const mas = () => botonMas(async () => { const k = await api(sig.replace('https://api.spotify.com/v1', '')); sumar(k.items || []); sig = k.next; if(sig) mas(); });
  if(sig) mas();
}
async function vTop(v){
  const j = await api('/me/top/tracks?limit=50&time_range=short_term');
  if(!empezar(v)) return;
  const lista = j.items || [];
  L().insertAdjacentHTML('beforeend', '<p class="sec">LO QUE MÁS ESCUCHASTE ÚLTIMAMENTE</p>');
  lista.forEach((t, i) => L().appendChild(filaCancion(t, i, k => reproducir({uris:lista.slice(k).map(x => x.uri)}))));
  if(!lista.length) L().insertAdjacentHTML('beforeend', '<p class="nota">Todavía no hay datos. Escucha más música y vuelve.</p>');
}
async function vAlbum(v){
  const a = await api('/albums/' + v.id);
  if(!empezar(v)) return;
  L().insertAdjacentHTML('beforeend', '<div class="heroe"><img alt="" src="' + esc(imgDe(a.images)) + '"><div><h5>' + esc(a.name) + '</h5><p>' + esc((a.artists || []).map(x => x.name).join(', ')) + ' · ' + esc((a.release_date || '').slice(0, 4)) + '</p><button class="cap on" id="plTodo">▶ REPRODUCIR</button></div></div>');
  $('#plTodo').onclick = () => reproducir({context_uri:a.uri});
  ((a.tracks && a.tracks.items) || []).forEach((t, i) => { t.album = t.album || {images:a.images}; L().appendChild(filaCancion(t, i, () => reproducir({context_uri:a.uri, offset:{uri:t.uri}}))); });
}
async function vArtista(v){
  const [ar, cs, als] = await Promise.all([
    api('/artists/' + v.id).catch(() => null),
    api('/search?' + new URLSearchParams({q:'artist:"' + v.titulo + '"', type:'track', limit:10})).catch(() => null),
    api('/artists/' + v.id + '/albums?include_groups=album,single&limit=20').catch(() => null)
  ]);
  if(!empezar(v)) return;
  L().insertAdjacentHTML('beforeend', '<div class="heroe"><img alt="" style="border-radius:50%" src="' + esc(ar ? imgDe(ar.images) : v.img || '') + '"><div><h5>' + esc(v.titulo) + '</h5><p>ARTISTA' + (ar && ar.genres && ar.genres.length ? ' · ' + esc(ar.genres.slice(0, 2).join(', ')) : '') + '</p><button class="cap on" id="plTodo">▶ REPRODUCIR</button></div></div>');
  $('#plTodo').onclick = () => reproducir({context_uri:'spotify:artist:' + v.id});
  const lista = ((cs && cs.tracks && cs.tracks.items) || []).filter(t => t.artists.some(a => a.id === v.id));
  if(lista.length){ L().insertAdjacentHTML('beforeend', '<p class="sec">CANCIONES</p>'); lista.forEach((t, i) => L().appendChild(filaCancion(t, i, k => reproducir({uris:lista.slice(k).map(x => x.uri)})))); }
  const al = (als && als.items) || [];
  if(al.length){ L().insertAdjacentHTML('beforeend', '<p class="sec">ÁLBUMES Y SENCILLOS</p>'); al.forEach(a => L().appendChild(filaTarjeta({nombre:a.name, sub:(a.album_type === 'single' ? 'Sencillo' : 'Álbum') + ' · ' + (a.release_date || '').slice(0, 4), img:imgDe(a.images, true), ir:() => ir({v:'album', id:a.id, titulo:a.name})}))); }
}
async function vBuscar(v){
  const q = v.q, j = await api('/search?' + new URLSearchParams({q, type:'track,artist,album,playlist', limit:10}));
  if(!empezar(v) || $('#buscar').value.trim() !== q) return;
  const tr = ((j.tracks && j.tracks.items) || []).filter(Boolean), ar = ((j.artists && j.artists.items) || []).filter(Boolean),
        al = ((j.albums && j.albums.items) || []).filter(Boolean), pl = ((j.playlists && j.playlists.items) || []).filter(Boolean);
  if(!tr.length && !ar.length && !al.length && !pl.length){ L().insertAdjacentHTML('beforeend', '<p class="nota">No encontré nada para "' + esc(q) + '".</p>'); return; }
  if(tr.length){
    L().insertAdjacentHTML('beforeend', '<p class="sec">CANCIONES</p>');
    const caja = document.createElement('div'); L().appendChild(caja); const lista = [];
    const sumar = arr => arr.forEach(t => { const i = lista.length; lista.push(t); caja.appendChild(filaCancion(t, i, k => reproducir({uris:[lista[k].uri]}))); });
    sumar(tr); let off = 10; const total = j.tracks.total || 0;
    const mas = () => { const b = document.createElement('button'); b.className = 'cap mas'; b.textContent = 'MÁS CANCIONES'; caja.after(b);
      b.onclick = async () => { b.remove(); const k = await api('/search?' + new URLSearchParams({q, type:'track', limit:10, offset:off})); off += 10; sumar(((k.tracks && k.tracks.items) || []).filter(Boolean)); if(off < Math.min(total, 100)) mas(); }; };
    if(off < Math.min(total, 100)) mas();
  }
  if(ar.length){ L().insertAdjacentHTML('beforeend', '<p class="sec">ARTISTAS</p>'); ar.slice(0, 5).forEach(a => L().appendChild(filaTarjeta({nombre:a.name, sub:'Artista', img:imgDe(a.images, true), redondo:true, ir:() => ir({v:'artista', id:a.id, titulo:a.name, img:imgDe(a.images)})}))); }
  if(al.length){ L().insertAdjacentHTML('beforeend', '<p class="sec">ÁLBUMES</p>'); al.slice(0, 6).forEach(a => L().appendChild(filaTarjeta({nombre:a.name, sub:(a.artists || []).map(x => x.name).join(', ') + ' · ' + (a.release_date || '').slice(0, 4), img:imgDe(a.images, true), ir:() => ir({v:'album', id:a.id, titulo:a.name})}))); }
  if(pl.length){ L().insertAdjacentHTML('beforeend', '<p class="sec">PLAYLISTS</p>'); pl.slice(0, 6).forEach(p => L().appendChild(filaTarjeta({nombre:p.name, sub:(p.owner && p.owner.display_name) || 'Playlist', img:imgDe(p.images, true), ir:() => ir({v:'playlist', id:p.id, uri:p.uri, titulo:p.name, img:imgDe(p.images), dueno:p.owner})}))); }
}

// tus más escuchadas, para las tarjetas flotantes de la piel D
export async function tarjetasSpotify(){
  try { const j = await api('/me/top/tracks?limit=4&time_range=short_term'); const it = (j && j.items) || [];
    if(it.length) A.piel.tarjetas(it.map(t => ({titulo:t.name, artista:(t.artists || []).map(a => a.name).join(', '), img:imgDe(t.album && t.album.images, false), uri:t.uri, tocar:() => reproducir({uris:it.slice(it.indexOf(t)).map(x => x.uri)})})));
  } catch(e){}
}
A.tarjetasSpotify = tarjetasSpotify;

// ---------- botones del cajón ----------
let tBus = 0;
export function atarBiblioteca(){
  $('#tPl').onclick = () => ir({v:'pl'}, true);
  $('#tTop').onclick = () => ir({v:'top'}, true);
  $('#tGusta').onclick = () => ir({v:'gusta'}, true);
  $('#bLibX').onclick = () => ponerBiblioteca(false);
  $('#bLib').onclick = () => { ponerBiblioteca(true); if(!vista) ir({v:'pl'}, true); };
  $('#bLib2').onclick = () => { const a = !document.body.classList.contains('lib'); ponerBiblioteca(a); if(a && !vista) ir({v:'pl'}, true); };
  $('#bBuscar').onclick = e => { e.stopPropagation(); abrirBuscar(); };
  $('#buscar').addEventListener('input', () => {
    const q = $('#buscar').value.trim(); $('#buscarCaja').classList.toggle('tiene', !!q);
    clearTimeout(tBus); tBus = setTimeout(() => { if(q.length >= 2) ir({v:'buscar', q, titulo:'Resultados'}, true); else if(!q) ir({v:'pl'}, true); }, 380);
  });
  $('#buscar').addEventListener('keydown', e => { if(e.key === 'Enter'){ clearTimeout(tBus); const q = $('#buscar').value.trim(); if(q) ir({v:'buscar', q, titulo:'Resultados'}, true); } });
  $('#buscarX').onclick = () => { $('#buscar').value = ''; $('#buscarCaja').classList.remove('tiene'); ir({v:'pl'}, true); $('#buscar').focus(); };
}
