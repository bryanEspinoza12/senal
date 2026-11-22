// SEÑAL v2 · PIEL A · "Transmisión" (rock, indie, alternativo, punk)
// Un televisor viejo: marco con bordes redondos, letra en serif cursiva, portada "EN VIVO" y un osciloscopio rojo.
import { A } from '../estado.js';
import { colorCancion, rgba, botonCancion, copiar } from './comun.js';

const ROJO = [255, 75, 62];

export function crearPielA(ui){
  let caja = null, portada = null;
  return {
    id: 'a', nombre: 'Transmisión',
    montar(){
      caja = document.createElement('div'); caja.className = 'tv-a';
      caja.innerHTML = `
        <div class="tv-portada"><canvas width="360" height="360" aria-hidden="true"></canvas><span class="l1">PORTADA</span><span class="l2">● EN VIVO</span></div>
        <p class="tv-tit"></p><p class="tv-sub"></p>
        <p class="tv-guiaT">GUÍA DE CANALES</p><div class="tv-guia"></div>`;
      ui.tarjetas.appendChild(caja);
      portada = caja.querySelector('canvas');
      copiar(A.portada && A.portada(), portada);
      this.cancion();
    },
    desmontar(){ caja && caja.remove(); caja = null; },
    cancion(){
      if(!caja) return;
      caja.querySelector('.tv-tit').textContent = document.querySelector('#tTitulo').textContent;
      caja.querySelector('.tv-sub').textContent = document.querySelector('#tArtista').textContent.toUpperCase();
    },
    portada(c){ ui.pintarFoto(c); copiar(c, portada); },
    tarjetas(lista){
      if(!caja) return;
      const g = caja.querySelector('.tv-guia'); g.innerHTML = '';
      lista.slice(0, 4).forEach((c, k) => g.appendChild(botonCancion(c, 'tv-canal', `<span class="ch">CH 0${k + 1}</span><span class="tx"><b data-t></b><small data-a></small></span>`)));
    },
    marcar(clave){ caja && caja.querySelectorAll('.tv-canal').forEach(t => t.classList.toggle('sonando', !!clave && t.dataset.clave === clave)); },

    // fondo: brillo del color de la canción en el tubo + osciloscopio rojo abajo
    halo(ctx, W, H, e, ms, previa, suave){
      const c = colorCancion().acc;
      const g = ctx.createRadialGradient(W*.42, H*.45, 0, W*.42, H*.45, Math.max(W, H)*.7);
      g.addColorStop(0, rgba(c, suave ? .07 : .16 + e.bajo*.1)); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      if(suave) return;
      const k = H/innerHeight, y0 = previa ? H*.55 : H - (innerWidth < 760 ? 222 : 158)*k, amp = (previa ? H*.3 : 18*k)*(.35 + e.bajo*1.2);
      const b = A.bandas ? A.bandas(48) : null;
      ctx.strokeStyle = rgba(ROJO, .95); ctx.lineWidth = previa ? 1.5 : 2; ctx.shadowColor = rgba(ROJO, .7); ctx.shadowBlur = previa ? 4 : 12;
      ctx.beginPath();
      const n = 160;
      for(let i = 0; i <= n; i++){
        const x = (previa ? 0 : W*.03) + i/n*(previa ? W : W*.94);
        const v = b ? b[Math.floor(i/n*47)] : .3;
        const y = y0 + Math.sin(i*.9 + ms/90)*amp*v*(i % 7 === 0 ? 1.8 : .6) + Math.sin(i*.21 - ms/400)*amp*.15;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke(); ctx.shadowBlur = 0;
    },
    cuadro(){}
  };
}
