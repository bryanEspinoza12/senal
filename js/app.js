// SEÑAL v2 · app instalable: registra el service worker, ofrece "Instalar" y avisa cuando hay una versión nueva.
import { $, aviso, ES_MOVIL } from './estado.js';

const instalada = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const esIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
let pedido = null, pidioActualizar = false;

export function iniciarApp(){
  const b = $('#bInstalar');
  // Chrome, Edge y Android: el navegador nos deja mostrar su ventana de instalar
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); pedido = e; if(!instalada()) b.hidden = false; });
  addEventListener('appinstalled', () => { pedido = null; b.hidden = true; aviso('¡Listo! SEÑAL quedó instalada. Búscala con su ícono <b>ñ</b>.', 5000); });
  // iPhone y iPad: Safari no tiene ventana de instalar; se explica cómo hacerlo a mano
  if(esIOS && !instalada()) b.hidden = false;
  b.onclick = async () => {
    A_cerrar();
    if(pedido){ pedido.prompt(); const r = await pedido.userChoice.catch(() => null); if(r && r.outcome === 'accepted') b.hidden = true; pedido = null; return; }
    if(esIOS) aviso('En iPhone: abre SEÑAL en <b>Safari</b>, toca <b>Compartir</b> (el cuadrado con la flecha ⬆) y elige <b>Agregar a inicio</b>.', 12000);
    else aviso('Abre el menú del navegador (⋮) y elige <b>Instalar SEÑAL</b> o <b>Agregar a la pantalla principal</b>.', 9000);
  };

  if(!('serviceWorker' in navigator) || !isSecureContext) return;
  navigator.serviceWorker.register('sw.js').then(reg => {
    const ofrecer = w => {
      if(!w || !navigator.serviceWorker.controller) return;   // primera instalación: no hay nada que actualizar
      aviso('Hay una versión nueva de SEÑAL. <button id="bActualizar">ACTUALIZAR</button>', 30000);
      const u = $('#bActualizar'); if(u) u.onclick = () => { pidioActualizar = true; w.postMessage('actualizar'); };
    };
    if(reg.waiting) ofrecer(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing; if(!w) return;
      w.addEventListener('statechange', () => { if(w.state === 'installed') ofrecer(w); });
    });
    // revisa si hay versión nueva cada vez que vuelves a SEÑAL
    document.addEventListener('visibilitychange', () => { if(!document.hidden) reg.update().catch(() => {}); });
  }).catch(e => console.warn('SEÑAL: no se pudo activar el modo app', e));
  let recargando = false;
  // solo recarga si tú pediste actualizar (la primera vez que se activa no debe recargar: cortaría, por ejemplo, la vuelta de Spotify)
  navigator.serviceWorker.addEventListener('controllerchange', () => { if(recargando || !pidioActualizar) return; recargando = true; location.reload(); });
}
const A_cerrar = () => { const x = document.querySelector('.hoja.abierta'); if(x) x.classList.remove('abierta'); };
