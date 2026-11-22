// SEÑAL v2 · PIEL B · "Cromo" (electrónica, pop, dance, K-pop)
// Letra cromada gigante al centro, piso de rejilla neón que avanza con el bajo y portadas en carrusel 3D.
import { A } from '../estado.js';
import { colorCancion, rgba, botonCancion, copiar } from './comun.js';

const LIMA = [212, 255, 58];

export function crearPielB(ui){
  let caja = null, centro = null, avance = 0, antes = 0;
  return {
    id: 'b', nombre: 'Cromo',
    montar(){
      caja = document.createElement('div'); caja.className = 'cf-b';
      ui.tarjetas.appendChild(caja);
      this.tarjetas([]);
    },
    desmontar(){ caja && caja.remove(); caja = null; centro = null; },
    cancion(){},
    portada(c){ ui.pintarFoto(c); copiar(c, centro); },
    // carrusel: 2 canciones, la que suena al centro, 2 canciones
    tarjetas(lista){
      if(!caja) return;
      caja.innerHTML = '';
      const pon = (c, k) => { const b = botonCancion(c, 'cf-it p' + k, '<span data-img></span><span class="cf-txt"><b data-t></b><small data-a></small></span>'); caja.appendChild(b); };
      lista.slice(0, 2).forEach((c, k) => pon(c, k));
      const m = document.createElement('div'); m.className = 'cf-it p2 actual'; m.setAttribute('aria-hidden', 'true');
      m.innerHTML = '<canvas width="300" height="300"></canvas>'; caja.appendChild(m); centro = m.querySelector('canvas');
      copiar(A.portada && A.portada(), centro);
      lista.slice(2, 4).forEach((c, k) => pon(c, k + 3));
    },
    marcar(clave){ caja && caja.querySelectorAll('.cf-it[data-clave]').forEach(t => t.classList.toggle('sonando', !!clave && t.dataset.clave === clave)); },

    // fondo: cielo, horizonte del color de la canción y rejilla que corre hacia ti
    halo(ctx, W, H, e, ms, previa, suave){
      const c = colorCancion().acc, hz = H*(previa ? .45 : .53);
      const dt = Math.min(.1, (ms - antes)/1000 || 0); antes = ms;
      avance = (avance + dt*(.25 + e.bajo*1.6)) % 1;
      const g = ctx.createRadialGradient(W/2, hz, 0, W/2, hz, W*.55);
      g.addColorStop(0, rgba(c, suave ? .12 : .32 + e.bajo*.2)); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const lin = suave ? .06 : .22;
      ctx.strokeStyle = rgba(LIMA, lin); ctx.lineWidth = previa ? .6 : 1;
      ctx.beginPath();
      for(let i = -12; i <= 12; i++){ ctx.moveTo(W/2, hz); ctx.lineTo(W/2 + i*W*.16, H); }
      for(let k = 0; k < 12; k++){
        const z = (k + avance)/12, y = hz + (H - hz)*z*z;
        ctx.moveTo(0, y); ctx.lineTo(W, y);
      }
      ctx.stroke();
      ctx.fillStyle = rgba(LIMA, suave ? .08 : .3 + e.medios*.4); ctx.fillRect(0, hz - 1, W, 2);
    },
    cuadro(){}
  };
}
