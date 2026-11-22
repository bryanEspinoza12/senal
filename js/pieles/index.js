// SEÑAL v2 · gestor de pieles: cuál piel se ve, por qué, y el cambio con estática de TV.
// Orden para elegir (modo automático): piel fija del artista → género del artista → tus gustos → energía del audio.
// Los colores de la portada se aplican siempre, sea cual sea la piel.
import { S, A, $, esc, store, aviso, POCO } from '../estado.js';
import { crearPielA } from './piel-a.js';
import { crearPielB } from './piel-b.js';
import { crearPielC } from './piel-c.js';
import { crearPielD } from './piel-d.js';

export const PIELES = [
  {id:'a',  n:'Transmisión',        g:'Rock · indie · alternativo · punk'},
  {id:'b',  n:'Cromo',              g:'Electrónica · pop · dance · K-pop'},
  {id:'c',  n:'Escritorio',         g:'Lo-fi · acústico · baladas · jazz'},
  {id:'d',  n:'Video lírico',       g:'Urbano · reggaetón · trap · R&B'},
  {id:'dr', n:'Video lírico rojo',  g:'Corridos · regional mexicano'}
];
const nombre = id => (PIELES.find(p => p.id === id) || {n:'?'}).n;

// género de Spotify → piel (el primero que coincide gana el voto de ese género)
const REGLAS = [
  ['dr', /corrido|regional mexican|banda|norte[ñn]|sierre[ñn]|mariachi|ranchera|grupero|tumbado|duranguense|tejano|cumbia/],
  ['d',  /reggaet|urbano|trap|r&b|rnb|hip ?hop|rap\b|dembow|perreo|drill|neoperreo/],
  ['a',  /rock|indie|alternativ|punk|grunge|\bemo\b|metal|shoegaze|garage|post-/],
  ['c',  /lo-?fi|acoustic|ac[uú]stic|ballad|balada|jazz|instrumental|ambient|classical|cl[aá]sic|piano|bolero|soul|folk|chill|bossa|singer-songwriter|cantautor/],
  ['b',  /electr|edm|house|techno|dance|pop|k-?pop|synth|disco|trance|dubstep|club/],
  ['d',  /latin|urban/]
];
export function pielDeGeneros(lista){
  const votos = {}, ejemplo = {};
  (lista || []).forEach(g => {
    const s = String(g).toLowerCase();
    const r = REGLAS.find(([, re]) => re.test(s)); if(!r) return;
    votos[r[0]] = (votos[r[0]] || 0) + 1; ejemplo[r[0]] = ejemplo[r[0]] || s;
  });
  const id = Object.keys(votos).sort((x, y) => votos[y] - votos[x])[0];
  return id ? {id, genero: ejemplo[id]} : null;
}

let ui, poco, ganchos = {}, actual = null, idActual = '', ultimaLista = [], motivo = '', pedido = 0;
let porEnergia = null;            // {clave, suma, n} mientras se mide la energía de una canción sin género
const leerJSON = (k, d) => { try { return JSON.parse(store.get(k) || '') || d; } catch(e){ return d; } };
export const modo = () => { const m = store.get('senal_piel') || 'auto'; return m === 'auto' || PIELES.some(p => p.id === m) ? m : 'auto'; };
const porArtista = () => leerJSON('senal_pielArt', {});
const claveArtista = meta => (meta && meta.artista || '').trim().toLowerCase().slice(0, 100);

function crear(id){
  if(id === 'a') return crearPielA(ui);
  if(id === 'b') return crearPielB(ui);
  if(id === 'c') return crearPielC(ui, poco);
  return crearPielD(ui, poco, id === 'dr' ? 'rojo' : '');
}

// lo que el resto de la app ve como "la piel" (siempre el mismo objeto; por dentro cambia)
export const piel = {
  get id(){ return idActual; },
  tarjetas(l){ ultimaLista = l || []; actual && actual.tarjetas(ultimaLista); },
  marcar(k){ actual && actual.marcar(k); },
  portada(c){ actual && actual.portada(c); },
  cancion(m){ actual && actual.cancion(m); },
  halo(...a){ actual && actual.halo(...a); },
  cuadro(e){ actual && actual.cuadro(e); medirEnergia(e); contarMinutos(); }
};

function cambiar(id){
  if(actual) actual.desmontar();
  document.body.dataset.piel = id === 'dr' ? 'd' : id;
  if(id === 'dr') document.body.dataset.variante = 'rojo'; else delete document.body.dataset.variante;
  actual = crear(id); idActual = id;
  actual.montar(); actual.tarjetas(ultimaLista);
  ganchos.alCambiarPiel && ganchos.alCambiarPiel(id);
  pintarPanel();
}
export function aplicar(id, conEstatica = true){
  if(id === idActual){ pintarPanel(); return; }
  if(!idActual || !conEstatica || poco()){ cambiar(id); return; }
  estatica(() => cambiar(id));
}

// ---------- decidir la piel de una canción ----------
export async function decidir(meta){
  const yo = ++pedido; porEnergia = null;
  const m = modo();
  if(m !== 'auto'){ motivo = 'elegida a mano'; aplicar(m); return; }
  if(!meta){ pintarPanel(); return; }
  const fija = porArtista()[claveArtista(meta)];
  if(fija && PIELES.some(p => p.id === fija)){ motivo = 'siempre con ' + meta.artista; aplicar(fija); return; }
  let generos = meta.genero ? [meta.genero] : [];
  if(!generos.length && meta.artistaId && ganchos.generosArtista) generos = await ganchos.generosArtista(meta.artistaId);
  if(yo !== pedido) return;
  const r = pielDeGeneros(generos);
  if(r){ motivo = 'por género: ' + r.genero; aplicar(r.id); return; }
  const gusto = ganchos.gustoUsuario ? await ganchos.gustoUsuario() : null;
  if(yo !== pedido) return;
  if(gusto){ motivo = 'por tus gustos: ' + gusto.genero; aplicar(gusto.id); return; }
  motivo = 'midiendo la energía de la canción…'; pintarPanel();
  porEnergia = {clave: meta.key, suma: 0, n: 0};
}
// sin género ni gustos: después de ~8 s de audio real se elige por la energía
function medirEnergia(e){
  if(!porEnergia || !S.vivo || !S.sonando) return;
  porEnergia.suma += e.bajo + e.medios; porEnergia.n++;
  if(porEnergia.n < 480) return;
  const prom = porEnergia.suma/porEnergia.n; porEnergia = null;
  const id = prom > .9 ? 'b' : prom > .55 ? 'd' : prom > .3 ? 'a' : 'c';
  motivo = 'por la energía del audio'; aplicar(id);
}

// ---------- minutos escuchados hoy (los muestra la piel Escritorio) ----------
let tSeg = 0;
function contarMinutos(){
  const t = performance.now(); if(!S.sonando || t - tSeg < 1000) return; tSeg = t;
  const d = new Date().toISOString().slice(0, 10), h = leerJSON('senal_hoy', {});
  store.set('senal_hoy', JSON.stringify({d, s: (h.d === d ? h.s || 0 : 0) + 1}));
}

// ---------- estática de TV al cambiar de piel ----------
function estatica(alMedio){
  const cv = $('#estatica'), x = cv.getContext('2d'), w = cv.width = 160, h = cv.height = 100;
  const img = x.createImageData(w, h), t0 = performance.now(), DUR = 520;
  let hecho = false; cv.classList.add('ver');
  (function paso(t){
    const k = (t - t0)/DUR;
    for(let i = 0; i < img.data.length; i += 4){ const v = Math.random()*255; img.data[i] = img.data[i+1] = img.data[i+2] = v; img.data[i+3] = 255; }
    x.putImageData(img, 0, 0);
    x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(0, (k*1.6 % 1)*h, w, 6);
    cv.style.opacity = String(k < .4 ? k/.4 : k > .7 ? Math.max(0, (1 - k)/.3) : 1);
    if(!hecho && k >= .45){ hecho = true; alMedio(); }
    if(k < 1) requestAnimationFrame(paso); else { cv.classList.remove('ver'); cv.style.opacity = ''; }
  })(t0);
}

// ---------- panel "Piel ▾" ----------
export function pintarPanel(){
  const m = modo(), lbl = $('#pielLbl');
  if(lbl) lbl.textContent = m === 'auto' ? 'Piel: automática' : 'Piel: ' + nombre(m);
  const c = $('#pielCuerpo'); if(!c) return;
  const art = S.meta && S.meta.artista, fija = art && porArtista()[claveArtista(S.meta)];
  c.innerHTML = `
    <p class="piel-ahora">Ahora: <b>${esc(nombre(idActual))}</b>${m === 'auto' && motivo ? ' · ' + esc(motivo) : ''}</p>
    <button class="opt ${m === 'auto' ? 'on' : ''}" data-modo="auto">◎ AUTOMÁTICA<small>Cambia sola según el género de cada canción</small></button>
    ${PIELES.map(p => `<button class="opt ${m === p.id ? 'on' : ''}" data-modo="${p.id}"><span class="muestra m-${p.id}" aria-hidden="true"></span>${esc(p.n.toUpperCase())}<small>${esc(p.g)}</small></button>`).join('')}
    ${art ? `<p class="sub">PARA ESTE ARTISTA</p>
      <button class="opt" id="pielArt">${fija ? '✕ QUITAR LA PIEL FIJA DE ' + esc(art.toUpperCase()) + '<small>Ahora usa ' + esc(nombre(fija)) + ' siempre</small>'
        : '◈ USAR SIEMPRE ' + esc(nombre(idActual).toUpperCase()) + '<small>Cada vez que suene ' + esc(art) + '</small>'}</button>` : ''}`;
  c.querySelectorAll('[data-modo]').forEach(b => b.onclick = () => {
    const v = b.dataset.modo; store.set('senal_piel', v);
    if(v === 'auto') decidir(S.meta); else { motivo = 'elegida a mano'; aplicar(v); }
    pintarPanel();
  });
  const pa = $('#pielArt'); if(pa) pa.onclick = () => {
    const mapa = porArtista(), k = claveArtista(S.meta);
    if(mapa[k]){ delete mapa[k]; aviso('Listo: ' + esc(S.meta.artista) + ' vuelve a la piel automática.', 3000); }
    else { mapa[k] = idActual; const ks = Object.keys(mapa); if(ks.length > 200) delete mapa[ks[0]]; aviso('Listo: <b>' + esc(S.meta.artista) + '</b> siempre se verá con ' + esc(nombre(idActual)) + '.', 3500); }
    store.set('senal_pielArt', JSON.stringify(mapa));
    ganchos.guardarPieles && ganchos.guardarPieles(mapa);
    if(modo() === 'auto') decidir(S.meta); else pintarPanel();
  };
}

export function iniciarPieles(_ui, _poco, g){
  ui = _ui; poco = _poco; ganchos = g || {};
  A.piel = piel;
  const m = modo(); cambiar(m === 'auto' ? 'd' : m);
}
