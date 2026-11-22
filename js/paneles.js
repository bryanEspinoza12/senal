// SEÑAL v2 · paneles, modo inmersivo, efectos, quietud (la interfaz se desvanece) y atajos de teclado.
import { S, A, $, store, aviso } from './estado.js';
import { alternar, moverSeg } from './reproductor.js';
import { siguienteEstilo, ponerDesfase, alternarTraduccion } from './letras.js';
import { ponerModo } from './visual.js';
import { abrirEditor, teclaEditor } from './editor.js';
import { abrirBuscar, ponerBiblioteca } from './biblioteca.js';

const inm = () => document.body.classList.contains('imm');
export function cerrarPaneles(){
  document.querySelectorAll('.hoja.abierta,.lado.abierta').forEach(m => m.classList.remove('abierta'));
  document.querySelectorAll('.hb[aria-expanded="true"]').forEach(b => b.setAttribute('aria-expanded', 'false'));
  if(inm() && !$('.barra').matches(':hover')) document.body.classList.remove('verT');
}
A.cerrarPaneles = cerrarPaneles;
function abrirPanel(sel){
  if(inm() && (sel === '#pLyr' || sel === '#pViz')){
    const lado = sel === '#pLyr' ? 'verL' : 'verR', ya = document.body.classList.contains(lado);
    document.body.classList.remove('verL', 'verR'); if(!ya) document.body.classList.add(lado); return;
  }
  const m = $(sel), estaba = m.classList.contains('abierta'); cerrarPaneles(); if(estaba) return;
  m.classList.add('abierta'); const b = document.querySelector('[data-panel="' + sel + '"]'); if(b) b.setAttribute('aria-expanded', 'true');
}
export const panelVisible = sel => inm() ? document.body.classList.contains(sel === '#pLyr' ? 'verL' : 'verR') : $(sel).classList.contains('abierta');
A.panelVisible = panelVisible;

export function ponerInmersivo(on){
  document.body.classList.toggle('imm', on); $('#bImm').classList.toggle('on', on); cerrarPaneles();
  document.body.classList.remove('verL', 'verR', 'verT', 'verB');
  if(on){ ponerBiblioteca(false); aviso('Modo inmersivo · acerca el mouse a los <b>bordes</b>: izquierda letra, derecha visual, abajo reproductor, arriba menú. <b>I</b> o <b>Esc</b> para salir.', 6000); }
  setTimeout(() => A.reubicarLetra(), 500);
}
const ocultarEn = {};
function borde(lado, ver){
  if(!inm()) return;
  clearTimeout(ocultarEn[lado]);
  if(ver) document.body.classList.add('ver' + lado);
  else ocultarEn[lado] = setTimeout(() => { if(lado === 'T' && document.querySelector('.hoja.abierta')) return; document.body.classList.remove('ver' + lado); }, 380);
}

// la interfaz se desvanece cuando no tocas nada y la música suena
let tQuieto = 0;
function despertar(){
  document.body.classList.remove('quieto'); clearTimeout(tQuieto);
  tQuieto = setTimeout(() => { if(S.sonando && !document.body.classList.contains('lib') && !document.querySelector('.hoja.abierta,.lado.abierta') && !S.editor) document.body.classList.add('quieto'); }, 3500);
}

const recargas = [];
// vuelve a leer los efectos guardados (al arrancar y cuando llegan los ajustes de tu cuenta)
export function aplicarEfectos(){
  const mqOn = store.get('senal_mq') !== '0';
  $('#marquesina').style.display = mqOn ? '' : 'none'; $('#bMq').classList.toggle('on', mqOn);
  recargas.forEach(f => f());
}
export function atarPaneles(){
  document.querySelectorAll('[data-panel]').forEach(b => b.onclick = e => { e.stopPropagation(); abrirPanel(b.dataset.panel); });
  document.addEventListener('click', e => { if(e.target.isConnected && !e.target.closest('.hoja,.lado,[data-panel],#editor,#cajon,#puerta,#perfil')) cerrarPaneles(); });
  [['L','#bordeL','#pLyr'], ['R','#bordeR','#pViz'], ['T','#bordeT','.barra'], ['B','#bordeB','.controles']].forEach(([l, b, p]) => {
    [$(b), $(p)].forEach(el => { el.addEventListener('mouseenter', () => borde(l, true)); el.addEventListener('mouseleave', () => borde(l, false)); });
  });
  $('#bImm').onclick = () => { cerrarPaneles(); ponerInmersivo(!inm()); };
  $('#bFs').onclick = () => { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => aviso('Tu navegador no permite pantalla completa aquí.', 3000)); };
  $('#bMq').onclick = () => { const off = $('#marquesina').style.display !== 'none'; $('#marquesina').style.display = off ? 'none' : ''; $('#bMq').classList.toggle('on', !off); store.set('senal_mq', off ? '0' : '1'); };
  const efecto = (id, clase, clave, inverso) => {
    const b = $(id), aplicar = on => { document.body.classList.toggle(clase, inverso ? !on : on); b.classList.toggle('on', on); };
    recargas.push(() => { const g = store.get(clave); if(g != null) aplicar(g === '1'); });
    b.onclick = () => { const on = !b.classList.contains('on'); aplicar(on); store.set(clave, on ? '1' : '0'); };
  };
  efecto('#bCrt', 'crt', 'senal_crt'); efecto('#bBn', 'bn', 'senal_bn'); efecto('#bGar', 'sinGar', 'senal_gar', true);
  aplicarEfectos();
  ['mousemove', 'keydown', 'click', 'touchstart'].forEach(ev => addEventListener(ev, despertar, {passive:true})); despertar();

  document.addEventListener('keydown', e => {
    if(document.body.classList.contains('enPuerta') || document.body.classList.contains('enPerfil')) return;
    if(S.editor){ teclaEditor(e); return; }
    if(e.target.closest('input,textarea')){ if(e.key === 'Escape') e.target.blur(); return; }
    const k = e.key;
    if(k === 'i' || k === 'I') ponerInmersivo(!inm());
    else if(k === 'ArrowLeft' && !e.target.closest('#progreso')) moverSeg(-5);
    else if(k === 'ArrowRight' && !e.target.closest('#progreso')) moverSeg(5);
    else if(k === 'e' || k === 'E') abrirEditor();
    else if(e.code === 'Space' && !e.target.closest('button,[role="button"]')){ e.preventDefault(); alternar(); }
    else if(k >= '1' && k <= '8') ponerModo(+k - 1);
    else if(k === 'l' || k === 'L') siguienteEstilo();
    else if(k === 'c' || k === 'C') $('#bCrt').click();
    else if(k === 'b' || k === 'B') $('#bBn').click();
    else if(k === 'f' || k === 'F') $('#bFs').click();
    else if(k === '/'){ e.preventDefault(); abrirBuscar(); }
    else if(k === 'Escape'){ cerrarPaneles(); ponerBiblioteca(false); if(inm()) ponerInmersivo(false); }
    else if(k === '[' || k === ']'){ ponerDesfase(S.desfase + (k === ']' ? .25 : -.25)); aviso('Letra ' + (S.desfase >= 0 ? 'adelantada ' : 'atrasada ') + Math.abs(S.desfase).toFixed(2) + ' s', 1500); }
    else if(k === 't' || k === 'T') alternarTraduccion();
  });
}
