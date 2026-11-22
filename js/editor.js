// SEÑAL v2 · editor de letras propias: pegar → sincronizar con Enter (o con IA) → guardar.
import { S, A, $, esc, store, aviso, fmt } from './estado.js';
import { segundo, moverSeg, irA, alternar } from './reproductor.js';
import { leerLRC, letraPropia, ponerLetra, recargarLetra } from './letras.js';
import { guardarLetra, borrarLetra, cuenta } from './nube.js';

let volverA = null;
const ED = () => S.editor;
export const fmtL = s => { s = Math.max(0, s || 0); const m = Math.floor(s/60), r = s - m*60; return String(m).padStart(2, '0') + ':' + r.toFixed(2).padStart(5, '0'); };

export function abrirEditor(){
  A.cerrarPaneles();
  if(!S.meta){ aviso('Primero pon una canción (Spotify, un MP3 o el demo). Con <b>Audio del PC</b> no se sabe qué canción suena.', 6000); return; }
  const hay = S.L && (S.tipoLetra === 'synced' || S.tipoLetra === 'plain');
  S.editor = {lineas: hay ? S.L.filter(l => l.text).map(l => ({text:l.text, t: S.tipoLetra === 'synced' ? l.t : null})) : [], meta:0, paso:1, key:S.meta.key};
  $('#edCancion').textContent = S.meta.titulo + (S.meta.artista ? ' — ' + S.meta.artista : '');
  volverA = document.activeElement; $('#editor').classList.add('abierto'); paso1();
  if(S.fuente === 'mp3' || (S.fuente === 'spotify' && !S.spRemoto)) A.aiPrecargar();
}
A.abrirEditor = abrirEditor;
export function cerrarEditor(){
  if(A.aiOcupada()) A.aiCancelar();
  $('#editor').classList.remove('abierto'); S.editor = null;
  if(volverA && volverA.isConnected) volverA.focus({preventScroll:true}); volverA = null;
}
export function ponerPaso(n){ ['#st1','#st2','#st3'].forEach((s, i) => $(s).classList.toggle('on', i === (n === 'ia' ? 1 : n - 1))); ED().paso = n; }

export function paso1(){
  ponerPaso(1);
  $('#edCuerpo').innerHTML = '<textarea id="edTexto" spellcheck="false" aria-label="Letra de la canción" placeholder="Pega aquí la letra, una frase por renglón.&#10;&#10;Tip: escribe ♪ en un renglón para marcar una parte sin voz."></textarea>';
  $('#edTexto').value = ED().lineas.map(l => l.text).join('\n');
  $('#edPie').innerHTML = '<span class="kb">Cada renglón será una línea en pantalla. Las líneas cortas se ven mejor.</span><span class="sp"></span>' +
    (S.spRemoto ? '' : '<button id="edIA" class="cap big on">✦ QUE LA IA SINCRONICE</button>') + '<button id="edSig" class="cap big">A MANO →</button>';
  const tomar = () => {
    const txt = $('#edTexto').value.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
    if(!txt.length){ aviso('Primero pega o escribe la letra.', 3000); return false; }
    const viejo = ED().lineas;
    ED().lineas = txt.map((text, i) => ({text, t: viejo[i] && viejo[i].text === text ? viejo[i].t : null}));
    const libre = ED().lineas.findIndex(l => l.t == null); ED().meta = libre < 0 ? 0 : libre;
    return true;
  };
  $('#edSig').onclick = () => { if(tomar()) paso2(); };
  if($('#edIA')) $('#edIA').onclick = () => { if(tomar()) A.aiEmpezar(); };
  setTimeout(() => $('#edTexto') && $('#edTexto').focus(), 60);
}
export function paso2(){
  ponerPaso(2);
  $('#edCuerpo').innerHTML = ED().lineas.map((l, i) => '<div class="sl" data-i="' + i + '" role="button" tabindex="-1"><span class="tm"></span><span class="tx">' + esc(l.text) + '</span></div>').join('');
  $('#edCuerpo').querySelectorAll('.sl').forEach(el => el.onclick = () => { ED().meta = +el.dataset.i; const l = ED().lineas[ED().meta]; if(l.t != null) irA(Math.max(0, l.t - 2)); pintar(); });
  $('#edPie').innerHTML = '<div class="kb">Dale play y toca <b>MARCAR</b> (o <b>ENTER</b>) justo cuando empiece cada línea · <b>⌫</b> deshacer · <b>←</b> <b>→</b> 5 s · <b>ESPACIO</b> pausa · <b>,</b> <b>.</b> ±0.1 s</div>' +
    '<button class="cap chico" id="edAtras">← TEXTO</button>' + (S.spRemoto ? '' : '<button class="cap chico" id="edIA2">✦ IA</button>') + '<button class="cap chico" id="edMenos">−0.1 s</button><button class="cap chico" id="edMas">+0.1 s</button><button class="cap chico" id="edDeshacer">⌫</button><span class="sp"></span><button id="edMarcar" class="cap big on">⏎ MARCAR</button><button id="edGuardar" class="cap big">GUARDAR ✓</button>';
  $('#edAtras').onclick = paso1; if($('#edIA2')) $('#edIA2').onclick = A.aiEmpezar;
  $('#edMarcar').onclick = marcar; $('#edDeshacer').onclick = deshacer; $('#edGuardar').onclick = guardar;
  $('#edMenos').onclick = () => ajustar(-.1); $('#edMas').onclick = () => ajustar(.1);
  pintar();
}
function pintar(desplazar = true){
  if(!ED() || ED().paso !== 2) return;
  const els = $('#edCuerpo').querySelectorAll('.sl');
  els.forEach((el, i) => { const l = ED().lineas[i]; el.classList.toggle('hecha', l.t != null); el.classList.toggle('meta2', i === ED().meta); el.querySelector('.tm').textContent = l.t != null ? fmtL(l.t) : '--:--.--'; });
  if(desplazar && els[ED().meta]) els[ED().meta].scrollIntoView({block:'center', behavior:'smooth'});
}
function marcar(){
  if(!ED() || ED().paso !== 2) return;
  ED().lineas[ED().meta].t = Math.round(segundo()*100)/100;
  if(ED().meta < ED().lineas.length - 1) ED().meta++; else aviso('¡Última línea marcada! Revisa y pulsa <b>GUARDAR</b>.', 4000);
  pintar();
}
function deshacer(){ if(!ED() || ED().paso !== 2) return; let k = ED().meta; if(ED().lineas[k].t == null && k > 0) k--; ED().lineas[k].t = null; ED().meta = k; pintar(); }
function ajustar(d){ if(!ED() || ED().paso !== 2) return; const k = ED().lineas[ED().meta].t != null ? ED().meta : ED().meta - 1; if(k < 0 || ED().lineas[k].t == null) return; ED().lineas[k].t = Math.max(0, Math.round((ED().lineas[k].t + d)*100)/100); pintar(false); }
export function tickEditor(s){
  if(!ED()) return;
  $('#edReloj').textContent = fmtL(s);
  if(ED().paso !== 2) return;
  let pi = -1; ED().lineas.forEach((l, i) => { if(l.t != null && l.t <= s) pi = i; });
  $('#edCuerpo').querySelectorAll('.sl').forEach((el, i) => el.classList.toggle('sonando', i === pi));
}
export function teclaEditor(e){
  if(e.key === 'Tab'){
    const f = [...document.querySelectorAll('#editor button,#editor textarea,#editor input,#editor [tabindex]:not([tabindex="-1"])')].filter(x => !x.disabled && x.offsetParent !== null);
    if(!f.length) return; const a = f[0], z = f[f.length - 1];
    if(!$('#editor').contains(document.activeElement)){ e.preventDefault(); a.focus(); }
    else if(e.shiftKey && document.activeElement === a){ e.preventDefault(); z.focus(); }
    else if(!e.shiftKey && document.activeElement === z){ e.preventDefault(); a.focus(); }
    return;
  }
  if(e.key === 'Escape'){ if(!A.aiOcupada()) cerrarEditor(); return; }
  if(ED().paso === 'ia' || e.target.tagName === 'TEXTAREA') return;
  if(e.key === 'Enter' && !e.target.closest('button')){ e.preventDefault(); marcar(); }
  else if(e.key === 'Backspace'){ e.preventDefault(); deshacer(); }
  else if(e.code === 'Space' && !e.target.closest('button')){ e.preventDefault(); alternar(); }
  else if(e.key === 'ArrowLeft'){ e.preventDefault(); moverSeg(-5); }
  else if(e.key === 'ArrowRight'){ e.preventDefault(); moverSeg(5); }
  else if(e.key === ','){ ajustar(-.1); } else if(e.key === '.'){ ajustar(.1); }
}
export function aLRC(lineas, meta){
  const cab = '[ti:' + meta.titulo + ']\n' + (meta.artista ? '[ar:' + meta.artista + ']\n' : '') + '[by:SEÑAL]\n';
  return cab + lineas.filter(l => l.t != null).sort((a, b) => a.t - b.t).map(l => '[' + fmtL(l.t) + ']' + (l.text || '')).join('\n');
}
function guardar(){
  const hechas = ED().lineas.filter(l => l.t != null);
  if(!hechas.length){ aviso('Marca al menos una línea antes de guardar.', 3000); return; }
  const faltan = ED().lineas.length - hechas.length, lrc = aLRC(ED().lineas, S.meta);
  const ok = guardarLetra(ED().key, lrc, S.meta);
  if(S.meta && S.meta.key === ED().key){ S.origenLetra = 'tuya'; ponerLetra(leerLRC(lrc), 'synced'); }
  ponerPaso(3);
  $('#edCuerpo').innerHTML = '<div class="listo">¡Letra <span>guardada!</span></div><p class="nota" style="margin-top:16px;font-size:14px">' + hechas.length + ' líneas sincronizadas' + (faltan ? ' · ' + faltan + ' sin marcar (no se mostrarán)' : '') + '.<br>La próxima vez que suene esta canción, SEÑAL usará tu letra.<br><span id="edDonde">' + (cuenta.estado === 'invitado' ? '☁ Guardando en tu cuenta…' : 'Guardada en este dispositivo (sin cuenta).') + '</span></p>';
  $('#edPie').innerHTML = '<button class="cap chico" id="edOtra">✎ SEGUIR EDITANDO</button><button class="cap chico" id="edExp">⇩ EXPORTAR .LRC</button><span class="sp"></span><button id="edOk" class="cap big on">VER MI LETRA →</button>';
  if(cuenta.estado === 'invitado') ok.then(b => { const d = $('#edDonde'); if(d) d.textContent = b ? '☁ Guardada en tu cuenta: la verás en cualquier dispositivo.' : '⚠ No se pudo subir a tu cuenta; quedó guardada en este dispositivo.'; });
  $('#edOtra').onclick = paso2; $('#edExp').onclick = exportarLRC; $('#edOk').onclick = cerrarEditor;
}
export function exportarLRC(){
  A.cerrarPaneles();
  if(!S.meta || !S.L || S.tipoLetra !== 'synced'){ aviso('No hay una letra sincronizada para exportar en esta canción.', 4000); return; }
  const lrc = letraPropia(S.meta.key) || aLRC(S.L, S.meta);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([lrc], {type:'text/plain;charset=utf-8'}));
  a.download = ((S.meta.artista ? S.meta.artista + ' - ' : '') + S.meta.titulo).replace(/[\\/:*?"<>|]/g, '') + '.lrc';
  document.body.appendChild(a); a.click(); a.remove();
}
export function importarLRC(){
  A.cerrarPaneles();
  if(!S.meta){ aviso('Primero pon una canción (Spotify, un MP3 o el demo).', 4000); return; }
  $('#lrcIn').click();
}
A.importarLRC = importarLRC;
export function atarEditor(){
  $('#edCerrar').onclick = cerrarEditor;
  $('#editor').addEventListener('mousedown', e => { if(e.target.id === 'editor') cerrarEditor(); });
  $('#lrcIn').onchange = async e => {
    const f = e.target.files[0]; e.target.value = ''; if(!f || !S.meta) return;
    const txt = await f.text(), L = leerLRC(txt);
    if(!L.length){ aviso('Ese archivo no tiene tiempos tipo [01:23.45]. ¿Es un .lrc sincronizado?', 6000); return; }
    guardarLetra(S.meta.key, txt, S.meta); S.origenLetra = 'tuya'; ponerLetra(L, 'synced');
    aviso('Letra cargada y guardada para <b>' + esc(S.meta.titulo) + '</b>.', 3500);
  };
}
export function borrarLetraPropia(){
  A.cerrarPaneles();
  if(!S.meta || !letraPropia(S.meta.key)){ aviso('Esta canción no tiene una letra tuya guardada.', 3000); return; }
  borrarLetra(S.meta.key); aviso('Se borró tu letra. Volviendo a la original…', 3000); recargarLetra();
}
