// SEÑAL v2 · cuenta con Google + lista de acceso + letras y ajustes en la nube (Firebase).
// Sin cuenta (o si Firebase no carga) todo sigue funcionando y se guarda solo en este dispositivo.
import { store } from './estado.js';
import { firebaseConfig } from '../firebase-config.js';

const V = '11.10.0', CDN = 'https://www.gstatic.com/firebasejs/' + V + '/';
const AJUSTES = ['senal_piel', 'senal_lyr2', 'senal_viz2', 'senal_tr_on', 'senal_mq', 'senal_crt', 'senal_bn', 'senal_gar', 'senal_vol'];
const LOCAL = 'senal_lrc:';

let fb = null, auth = null, db = null;
export const cuenta = { estado: 'cargando', usuario: null, error: '' }; // cargando | fuera | invitado | sinAcceso | sinNube
const letras = new Map();   // clave de canción → texto .lrc (copia en memoria de la nube)
const letrasInfo = new Map(); // clave → {titulo, artista}
const oyentes = new Set();
export const alCambiar = fn => { oyentes.add(fn); fn(cuenta); };
const avisar = () => oyentes.forEach(fn => { try { fn(cuenta); } catch(e){ console.error(e); } });
const poner = (estado, extra = {}) => { Object.assign(cuenta, {estado, error: ''}, extra); avisar(); };

// Firestore no acepta "/" en los id: la clave se codifica.
const idDe = k => encodeURIComponent(k).replace(/\./g, '%2E').slice(0, 700);
const enNube = () => cuenta.estado === 'invitado';

// ---------- arranque ----------
export async function iniciarNube(){
  try {
    const [app, a, f] = await Promise.all([import(CDN + 'firebase-app.js'), import(CDN + 'firebase-auth.js'), import(CDN + 'firebase-firestore.js')]);
    fb = {...app, ...a, ...f};
    const ap = fb.initializeApp(firebaseConfig);
    auth = fb.getAuth(ap); auth.languageCode = 'es';
    db = fb.getFirestore(ap);
  } catch(e){
    console.warn('SEÑAL: no se pudo cargar Firebase', e);
    poner('sinNube', {usuario: null}); return;
  }
  fb.onAuthStateChanged(auth, u => alEntrar(u));
}

async function alEntrar(u){
  if(!u){ letras.clear(); poner('fuera', {usuario: null}); return; }
  const usuario = {uid: u.uid, nombre: u.displayName || 'Tú', correo: u.email || '', foto: u.photoURL || ''};
  poner('cargando', {usuario});
  let ok = false;
  try { ok = (await fb.getDoc(fb.doc(db, 'acceso', u.email))).exists(); }
  catch(e){ if(e.code !== 'permission-denied'){ poner('sinNube', {usuario, error: 'No se pudo comprobar tu acceso (' + (e.code || 'sin conexión') + ').'}); return; } }
  if(!ok){ letras.clear(); poner('sinAcceso', {usuario}); return; }
  try {
    await asegurarPerfil(u);
    await traerLetras();
    await traerAjustes();
    cuenta.subidas = await subirLetrasLocales();
  } catch(e){ console.warn('SEÑAL: nube', e); cuenta.error = 'Tu cuenta abrió, pero no se pudo leer todo de la nube.'; }
  poner('invitado', {usuario, subidas: cuenta.subidas || 0, error: cuenta.error});
}

const refUsuario = () => fb.doc(db, 'usuarios', cuenta.usuario.uid);
async function asegurarPerfil(u){
  const ref = fb.doc(db, 'usuarios', u.uid), d = await fb.getDoc(ref);
  const datos = {nombre: (u.displayName || '').slice(0, 100), foto: (u.photoURL || '').slice(0, 500)};
  if(!d.exists()) datos.creado = fb.serverTimestamp();
  await fb.setDoc(ref, datos, {merge: true});
}

// ---------- entrar / salir ----------
export async function entrarGoogle(){
  if(!auth){ return 'La cuenta no está disponible aquí. Abre SEÑAL desde tu PC (iniciar.bat) o desde GitHub Pages.'; }
  try {
    const p = new fb.GoogleAuthProvider(); p.setCustomParameters({prompt: 'select_account'});
    await fb.signInWithPopup(auth, p); return '';
  } catch(e){
    if(e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') return '';
    if(e.code === 'auth/popup-blocked') return 'El navegador bloqueó la ventana de Google. Permite ventanas emergentes para esta página y vuelve a intentar.';
    if(e.code === 'auth/unauthorized-domain') return 'Esta dirección no está autorizada para entrar. Usa tu PC (iniciar.bat) o GitHub Pages.';
    if(e.code === 'auth/network-request-failed') return 'Sin conexión. Revisa tu internet y vuelve a intentar.';
    return 'No se pudo entrar (' + (e.code || e.message) + ').';
  }
}
export async function salirCuenta(){ if(auth) await fb.signOut(auth); }

// ---------- letras propias ----------
export function letraGuardada(k){
  if(!k) return null;
  return enNube() ? (letras.get(k) ?? store.get(LOCAL + k)) : store.get(LOCAL + k);
}
export async function guardarLetra(k, lrc, meta = {}){
  if(!enNube()){ store.set(LOCAL + k, lrc); return true; }
  return subir(k, lrc, meta);
}
async function subir(k, lrc, meta){
  letras.set(k, lrc); letrasInfo.set(k, {titulo: String(meta.titulo || ''), artista: String(meta.artista || '')});
  try {
    await fb.setDoc(fb.doc(db, 'usuarios', cuenta.usuario.uid, 'letras', idDe(k)),
      {lrc, titulo: String(meta.titulo || '').slice(0, 300), artista: String(meta.artista || '').slice(0, 300), actualizado: fb.serverTimestamp()});
    return true;
  } catch(e){ console.warn(e); letras.delete(k); store.set(LOCAL + k, lrc); return false; }   // si falla, queda en este equipo
}
export async function borrarLetra(k){
  store.del(LOCAL + k);
  if(!enNube()) return;
  letras.delete(k); letrasInfo.delete(k);
  try { await fb.deleteDoc(fb.doc(db, 'usuarios', cuenta.usuario.uid, 'letras', idDe(k))); } catch(e){ console.warn(e); }
}
async function traerLetras(){
  letras.clear();
  const q = await fb.getDocs(fb.collection(db, 'usuarios', cuenta.usuario.uid, 'letras'));
  letrasInfo.clear();
  q.forEach(d => { const x = d.data(), k = decodeURIComponent(d.id); if(typeof x.lrc === 'string'){ letras.set(k, x.lrc); letrasInfo.set(k, {titulo: x.titulo || '', artista: x.artista || ''}); } });
}
// Las letras que hiciste sin cuenta en este equipo se suben una vez (si en la nube no hay otra para esa canción).
async function subirLetrasLocales(){
  const claves = [];
  try { for(let i = 0; i < localStorage.length; i++){ const k = localStorage.key(i); if(k && k.startsWith(LOCAL)) claves.push(k); } } catch(e){ return 0; }
  let n = 0;
  for(const k of claves){
    const clave = k.slice(LOCAL.length), lrc = store.get(k);
    if(!lrc || letras.has(clave) || lrc.length >= 60000) continue;
    const ti = (lrc.match(/\[ti:([^\]]*)\]/) || [])[1], ar = (lrc.match(/\[ar:([^\]]*)\]/) || [])[1];
    if(await subir(clave, lrc, {titulo: ti, artista: ar})){ store.del(k); n++; }
  }
  return n;
}
export const cuantasLetras = () => enNube() ? letras.size : (() => { let n = 0; try { for(let i = 0; i < localStorage.length; i++) if((localStorage.key(i) || '').startsWith(LOCAL)) n++; } catch(e){} return n; })();

// ---------- ajustes (estilo de letra, visual, efectos, volumen) ----------
let tAjustes = 0, aplicando = false;
export let alTraerAjustes = () => {};
export const ponerAlTraerAjustes = fn => { alTraerAjustes = fn; };
async function traerAjustes(){
  const d = await fb.getDoc(refUsuario()), datos = d.exists() ? d.data() : {}, aj = datos.ajustes || null;
  if(datos.pieles && typeof datos.pieles === 'object') store.set('senal_pielArt', JSON.stringify(datos.pieles));
  else { const local = store.get('senal_pielArt'); if(local && local !== '{}') try { guardarPieles(JSON.parse(local)); } catch(e){} }
  if(!aj){ guardarAjustes(); alTraerAjustes(); return; }        // primera vez: sube los de este equipo
  aplicando = true;
  AJUSTES.forEach(k => { if(typeof aj[k] === 'string') store.set(k, aj[k]); });
  aplicando = false;
  alTraerAjustes();
}
function guardarAjustes(){
  if(!enNube() && cuenta.estado !== 'cargando') return;
  clearTimeout(tAjustes);
  tAjustes = setTimeout(() => {
    if(!enNube()) return;
    const aj = {}; AJUSTES.forEach(k => { const v = store.get(k); if(v != null) aj[k] = String(v).slice(0, 40); });
    fb.setDoc(refUsuario(), {ajustes: aj}, {merge: true}).catch(e => console.warn(e));
  }, 1500);
}
// pieles fijas por artista (se reemplaza el mapa entero, así lo que quitas también se borra en la nube)
export function guardarPieles(mapa){
  if(cuenta.estado !== 'invitado' && cuenta.estado !== 'cargando') return;
  fb.updateDoc(refUsuario(), {pieles: mapa}).catch(e => console.warn(e));
}
store.alGuardar = k => { if(!aplicando && AJUSTES.includes(k)) guardarAjustes(); };

// ---------- historial de escucha ----------
// Con cuenta va a la nube (usuarios/{uid}/historial). Sin cuenta, queda en este dispositivo (últimas 300).
const HIST = 'senal_hist';
const histLocal = () => { try { const h = JSON.parse(store.get(HIST) || '[]'); return Array.isArray(h) ? h : []; } catch(e){ return []; } };
export async function registrarEscucha(d){
  const e = {cancion: String(d.cancion || '').slice(0, 290), artista: String(d.artista || '').slice(0, 290), genero: String(d.genero || '').slice(0, 80), piel: String(d.piel || '').slice(0, 4), ms: Math.max(0, Math.min(3599999, Math.round(d.ms || 0)))};
  if(!e.cancion || e.ms < 1000) return;
  if(enNube()){
    try { await fb.addDoc(fb.collection(db, 'usuarios', cuenta.usuario.uid, 'historial'), {...e, fecha: fb.serverTimestamp()}); return; }
    catch(err){ console.warn('SEÑAL: historial', err); }
  }
  const h = histLocal(); h.push({...e, fecha: Date.now()}); store.set(HIST, JSON.stringify(h.slice(-300)));
}
// lista de escuchas (más reciente primero) con fecha como número (ms)
export async function leerHistorial(max = 1500){
  if(enNube()){
    const q = await fb.getDocs(fb.query(fb.collection(db, 'usuarios', cuenta.usuario.uid, 'historial'), fb.orderBy('fecha', 'desc'), fb.limit(max)));
    const out = []; q.forEach(d => { const x = d.data(); out.push({id: d.id, cancion: x.cancion, artista: x.artista, genero: x.genero || '', piel: x.piel || '', ms: x.ms || 0, fecha: x.fecha && x.fecha.toMillis ? x.fecha.toMillis() : Date.now()}); });
    return out;
  }
  return histLocal().slice().reverse();
}

// ---------- tus datos: listar, exportar y borrar ----------
export function listarLetras(){
  const out = [];
  if(enNube()) letras.forEach((lrc, k) => { const i = letrasInfo.get(k) || {}; out.push({clave: k, titulo: i.titulo || (lrc.match(/\[ti:([^\]]*)\]/) || [])[1] || k, artista: i.artista || (lrc.match(/\[ar:([^\]]*)\]/) || [])[1] || '', lrc}); });
  else { try { for(let i = 0; i < localStorage.length; i++){ const k = localStorage.key(i); if(!k || !k.startsWith(LOCAL)) continue; const lrc = store.get(k) || ''; out.push({clave: k.slice(LOCAL.length), titulo: (lrc.match(/\[ti:([^\]]*)\]/) || [])[1] || k.slice(LOCAL.length), artista: (lrc.match(/\[ar:([^\]]*)\]/) || [])[1] || '', lrc}); } } catch(e){} }
  return out.sort((a, b) => a.titulo.localeCompare(b.titulo));
}
export async function exportarDatos(){
  const datos = {app: 'SEÑAL v2.0', exportado: new Date().toISOString(), cuenta: enNube() ? {nombre: cuenta.usuario.nombre, correo: cuenta.usuario.correo} : 'sin cuenta (este dispositivo)',
    ajustes: Object.fromEntries(AJUSTES.map(k => [k, store.get(k)]).filter(([, v]) => v != null)),
    pielesPorArtista: (() => { try { return JSON.parse(store.get('senal_pielArt') || '{}'); } catch(e){ return {}; } })(),
    letras: listarLetras().map(({clave, titulo, artista, lrc}) => ({clave, titulo, artista, lrc})),
    historial: (await leerHistorial(5000)).map(({id, ...h}) => ({...h, fecha: new Date(h.fecha).toISOString()}))};
  return JSON.stringify(datos, null, 2);
}
async function borrarColeccion(nombre){
  const q = await fb.getDocs(fb.collection(db, 'usuarios', cuenta.usuario.uid, nombre)), refs = [];
  q.forEach(d => refs.push(d.ref || fb.doc(db, 'usuarios', cuenta.usuario.uid, nombre, d.id)));
  for(let i = 0; i < refs.length; i += 20) await Promise.all(refs.slice(i, i + 20).map(r => fb.deleteDoc(r)));
  return refs.length;
}
export async function borrarHistorial(){
  store.del(HIST);
  if(enNube()) await borrarColeccion('historial');
}
const CLAVES_LOCALES = () => { const k = []; try { for(let i = 0; i < localStorage.length; i++){ const x = localStorage.key(i); if(x && (x.startsWith('senal_') || x.startsWith('sp_'))) k.push(x); } } catch(e){} return k; };
// sin cuenta: borra todo lo que SEÑAL guardó en este navegador (letras, ajustes, historial, sesión de Spotify)
export function borrarDatosLocales(){ store.congelado = true; CLAVES_LOCALES().forEach(store.del); }   // después se recarga la página
// con cuenta: borra letras, historial y perfil en la nube y luego la cuenta de Firebase.
// Google pide haber entrado hace poco para borrar una cuenta: si hace falta, abre otra vez la ventana de Google.
export async function borrarCuenta(){
  if(!enNube()) throw new Error('No hay una cuenta abierta.');
  const u = auth.currentUser;
  await borrarColeccion('letras'); await borrarColeccion('historial');
  await fb.deleteDoc(refUsuario());
  try { await fb.deleteUser(u); }
  catch(e){
    if(e.code !== 'auth/requires-recent-login') throw e;
    await fb.reauthenticateWithPopup(u, new fb.GoogleAuthProvider());
    await fb.deleteUser(u);
  }
  letras.clear(); letrasInfo.clear();
  borrarDatosLocales();
}
