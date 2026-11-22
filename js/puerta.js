// SEÑAL v2 · la puerta: portada con Google → (pruebas privadas) → conectar Spotify → reproductor.
// También pinta el botón y el panel de "Tu cuenta".
import { $, esc, store, aviso } from './estado.js';
import { cuenta, alCambiar, entrarGoogle, salirCuenta, cuantasLetras } from './nube.js';

const SIN_CUENTA = 'senal_sinCuenta';      // eligió "probar sin cuenta" en este dispositivo
const SP_AHORA_NO = 'senal_spAhoraNo';     // dijo "ahora no" a Spotify en esta visita
let abierta = false, ocupado = false, ganchos = {};

const el = () => $('#puerta');
function mostrar(html, paso){
  const p = el(); p.querySelector('.pu-cuerpo').innerHTML = html;
  p.querySelectorAll('.pu-pasos li').forEach((li, i) => { li.classList.toggle('on', i === paso); li.classList.toggle('hecho', i < paso); });
  if(!abierta){ abierta = true; p.hidden = false; p.inert = false; document.body.classList.add('enPuerta'); requestAnimationFrame(() => p.classList.add('abierta')); }
  const f = p.querySelector('[data-foco]'); if(f) setTimeout(() => f.focus({preventScroll:true}), 60);
}
function cerrar(){
  if(!abierta) return; abierta = false;
  const p = el(); p.classList.remove('abierta'); p.inert = true; document.body.classList.remove('enPuerta');
  setTimeout(() => { if(!abierta) p.hidden = true; }, 500);
}
const nombreCorto = u => esc((u && u.nombre || '').split(' ')[0] || 'tú');

const vista = {
  cargando: () => mostrar('<p class="pu-cargando" data-foco tabindex="-1">sintonizando<span>…</span></p>', 0),
  fuera: (aqui = true) => {
    mostrar(`
      <p class="pu-kicker">Otra manera de escuchar música</p>
      <p class="pu-texto">Letras que se escriben solas, visuales que cambian con cada canción y una piel distinta para cada género. Entra con tu cuenta y tus letras te siguen a cualquier pantalla.</p>
      <div class="pu-acciones">
        <button class="cap big on" id="puGoogle" data-foco ${aqui ? '' : 'disabled'}>Entrar con Google</button>
        <button class="pu-link" id="puSin">Probar sin cuenta →</button>
      </div>
      <p class="pu-error" id="puErr" role="alert">${aqui ? '' : 'La cuenta no está disponible en esta página. Ábrela desde tu PC (iniciar.bat) o desde GitHub Pages.'}</p>
      <p class="pu-letra">Con tu cuenta se guarda tu nombre, tus letras, tus ajustes y lo que escuchas en SEÑAL, para tus estadísticas. Nada más, y lo puedes borrar cuando quieras. Sin cuenta, todo queda solo en este dispositivo. <a href="privacidad.html" target="_blank" rel="noopener">Privacidad</a></p>`, 0);
    $('#puGoogle').onclick = entrar;
    $('#puSin').onclick = sinCuenta;
  },
  sinAcceso: u => {
    mostrar(`
      <p class="pu-kicker">Hola, ${nombreCorto(u)}</p>
      <h2 class="pu-titulo">Estamos en <i>pruebas privadas</i></h2>
      <p class="pu-texto">SEÑAL todavía no está abierto para todos. Tu correo <b>${esc(u.correo)}</b> no tiene invitación por ahora.</p>
      <div class="pu-acciones">
        <button class="cap big on" id="puOtra" data-foco>Usar otra cuenta</button>
        <button class="pu-link" id="puSin">Seguir sin cuenta →</button>
      </div>
      <p class="pu-error" id="puErr" role="alert"></p>`, 0);
    $('#puOtra').onclick = async () => { await salirCuenta(); entrar(); };
    $('#puSin').onclick = async () => { await salirCuenta(); sinCuenta(); };
  },
  spotify: u => {
    mostrar(`
      <p class="pu-kicker">Listo, ${nombreCorto(u)}</p>
      <h2 class="pu-titulo">Ahora conecta tu <i>Spotify</i></h2>
      <p class="pu-texto">SEÑAL lee lo que suena en tu Spotify para poner la letra y el visual. Necesitas Spotify Premium.</p>
      <div class="pu-acciones">
        <button class="cap big on" id="puSpot" data-foco>Conectar Spotify</button>
        <button class="pu-link" id="puNo">Ahora no, ver el demo →</button>
      </div>`, 1);
    $('#puSpot').onclick = () => { try { sessionStorage.setItem(SP_AHORA_NO, '1'); } catch(e){} cerrar(); ganchos.conectarSpotify && ganchos.conectarSpotify(); };
    $('#puNo').onclick = () => { try { sessionStorage.setItem(SP_AHORA_NO, '1'); } catch(e){} cerrar(); };
  }
};

async function entrar(){
  if(ocupado) return; ocupado = true;
  const b = $('#puGoogle'); if(b){ b.disabled = true; b.textContent = 'Abriendo Google…'; }
  const err = await entrarGoogle(); ocupado = false;
  if(err){ const e = $('#puErr'); if(e) e.textContent = err; else aviso(esc(err), 7000); }
  if(b && document.body.contains(b)){ b.disabled = false; b.textContent = 'Entrar con Google'; }
}
function sinCuenta(){ store.set(SIN_CUENTA, '1'); cerrar(); aviso('Sin cuenta: tus letras y ajustes se guardan solo en este dispositivo. Puedes entrar cuando quieras desde <b>tu cuenta</b>, arriba a la derecha.', 6000); }

// ---------- botón y panel "Tu cuenta" ----------
function pintarCuenta(c){
  const u = c.usuario, dentro = c.estado === 'invitado';
  const av = $('#cuAv');
  if(dentro && u.foto){ av.innerHTML = '<img alt="" referrerpolicy="no-referrer" src="' + esc(u.foto) + '">'; }
  else av.textContent = dentro ? (u.nombre || '?').trim().charAt(0).toUpperCase() : '○';
  $('#bCuenta').classList.toggle('dentro', dentro);
  $('#bCuenta').setAttribute('aria-label', dentro ? 'Tu cuenta: ' + u.nombre : 'Entrar a tu cuenta');
  const n = cuantasLetras(), letras = n === 1 ? '1 letra tuya' : n + ' letras tuyas';
  let html;
  if(dentro) html = `
    <div class="cu-yo">${u.foto ? '<img alt="" referrerpolicy="no-referrer" src="' + esc(u.foto) + '">' : ''}<div><b>${esc(u.nombre)}</b><span>${esc(u.correo)}</span></div></div>
    <p class="cu-estado">☁ ${letras} y tus ajustes se guardan en tu cuenta.</p>
    ${c.error ? '<p class="cu-estado mal">' + esc(c.error) + '</p>' : ''}
    <button class="opt" id="cuPerfil">◉ MI PERFIL<small>Tus estadísticas, letras, pieles y datos</small></button>
    <button class="opt" id="cuSalir">⎋ CERRAR SESIÓN<small>Tus letras quedan guardadas en tu cuenta</small></button>`;
  else if(c.estado === 'cargando') html = '<p class="cu-estado">Revisando tu cuenta…</p>';
  else html = `
    <p class="cu-estado">Sin cuenta: ${letras} y tus ajustes se guardan solo en este dispositivo.</p>
    ${c.estado === 'sinAcceso' ? '<p class="cu-estado mal">' + esc(u.correo) + ' no tiene invitación todavía.</p>' : ''}
    <button class="opt" id="cuEntrar" ${c.estado === 'sinNube' ? 'disabled' : ''}>◉ ENTRAR CON GOOGLE<small>${c.estado === 'sinNube' ? 'No disponible en esta página' : 'Tus letras te siguen a cualquier dispositivo'}</small></button>
    <button class="opt" id="cuPerfil">◉ MI PERFIL<small>Tus estadísticas, letras y datos en este dispositivo</small></button>`;
  html += '<p class="cu-pie"><a href="privacidad.html" target="_blank" rel="noopener">Privacidad</a></p>';
  $('#cuCuerpo').innerHTML = html;
  const pf = $('#cuPerfil'); if(pf) pf.onclick = () => { ganchos.cerrarPaneles && ganchos.cerrarPaneles(); ganchos.abrirPerfil && ganchos.abrirPerfil(); };
  const s = $('#cuSalir'); if(s) s.onclick = async () => { ganchos.cerrarPaneles && ganchos.cerrarPaneles(); store.set(SIN_CUENTA, '1'); await salirCuenta(); aviso('Sesión cerrada. Sigues sin cuenta en este dispositivo.', 4000); };
  const e = $('#cuEntrar'); if(e) e.onclick = () => { ganchos.cerrarPaneles && ganchos.cerrarPaneles(); store.del(SIN_CUENTA); vista.fuera(); };
}

// ---------- arranque ----------
export function atarPuerta(g){
  ganchos = g;
  const eligioSinCuenta = store.get(SIN_CUENTA) === '1';
  let antes = '';
  alCambiar(c => {
    pintarCuenta(c);
    const clave = c.estado + ':' + (c.usuario ? c.usuario.uid : '');
    if(clave === antes) return; antes = clave;
    if(c.estado !== 'cargando') ganchos.alCambiarCuenta && ganchos.alCambiarCuenta(c);
    const conPuerta = abierta || !eligioSinCuenta || store.get(SIN_CUENTA) !== '1';
    switch(c.estado){
      case 'cargando': if(abierta || !eligioSinCuenta) vista.cargando(); break;
      case 'fuera':    if(store.get(SIN_CUENTA) === '1') cerrar(); else vista.fuera(); break;
      case 'sinNube':  if(store.get(SIN_CUENTA) === '1') cerrar(); else vista.fuera(false); break;
      case 'sinAcceso': vista.sinAcceso(c.usuario); break;
      case 'invitado': {
        store.del(SIN_CUENTA);
        if(c.subidas) aviso('Subí ' + c.subidas + (c.subidas === 1 ? ' letra' : ' letras') + ' de este dispositivo a tu cuenta.', 5000);
        let ahoraNo = false; try { ahoraNo = sessionStorage.getItem(SP_AHORA_NO) === '1'; } catch(e){}
        if(conPuerta && abierta && !store.get('sp_refresh') && !ahoraNo) vista.spotify(c.usuario); else cerrar();
      }
    }
  });
  el().addEventListener('keydown', e => {   // el foco no se escapa de la puerta
    if(e.key !== 'Tab') return;
    const f = [...el().querySelectorAll('button:not([disabled])')]; if(!f.length) return;
    const i = f.indexOf(document.activeElement);
    if(e.shiftKey && i <= 0){ e.preventDefault(); f[f.length - 1].focus(); }
    else if(!e.shiftKey && i === f.length - 1){ e.preventDefault(); f[0].focus(); }
  });
}
