// SEÑAL v2 · PIEL C · "Escritorio" (lo-fi, acústico, baladas, jazz, instrumental)
// Mosaico de tarjetas sobre una cuadrícula de puntos: letra en tarjeta clara, disco que gira, barras, cola y minutos de hoy.
import { S, A, store } from '../estado.js';
import { colorCancion, rgba, botonCancion, copiar } from './comun.js';

const hoy = () => new Date().toISOString().slice(0, 10);
function leerHoy(){ try { const h = JSON.parse(store.get('senal_hoy') || '{}'); return h.d === hoy() ? h.s || 0 : 0; } catch(e){ return 0; } }

export function crearPielC(ui, poco){
  let caja = null, disco = null, barras = [], seg = leerHoy(), tSeg = 0;
  return {
    id: 'c', nombre: 'Escritorio',
    montar(){
      caja = document.createElement('div'); caja.className = 'bento-c';
      caja.innerHTML = `
        <section class="t disco" aria-label="Disco"><span class="et">GIRANDO</span><div class="vinilo"><canvas width="160" height="160" aria-hidden="true"></canvas></div></section>
        <section class="t viz" aria-label="Visualizador"><span class="et">VISUAL</span><div class="barras" aria-hidden="true">${'<i></i>'.repeat(10)}</div></section>
        <section class="t hoy" aria-label="Hoy en SEÑAL"><span class="et">HOY EN SEÑAL</span><p class="num">0</p><span class="pie">minutos escuchados</span></section>
        <section class="t cola" aria-label="Para escuchar"><span class="et">PARA ESCUCHAR</span><div class="lista"></div><button class="abrir">Abrir biblioteca</button></section>`;
      ui.tarjetas.appendChild(caja);
      disco = caja.querySelector('.vinilo canvas'); barras = [...caja.querySelectorAll('.barras i')];
      copiar(A.portada && A.portada(), disco);
      caja.querySelector('.abrir').onclick = () => document.querySelector('#bLib2').click();
      this.minutos();
    },
    desmontar(){ caja && caja.remove(); caja = null; barras = []; },
    cancion(){},
    portada(c){ ui.pintarFoto(c); copiar(c, disco); },
    tarjetas(lista){
      if(!caja) return;
      const l = caja.querySelector('.lista'); l.innerHTML = '';
      lista.slice(0, 4).forEach(c => l.appendChild(botonCancion(c, 'c-item', '<span data-img></span><span class="tx"><b data-t></b><small data-a></small></span>')));
    },
    marcar(clave){ caja && caja.querySelectorAll('.c-item').forEach(t => t.classList.toggle('sonando', !!clave && t.dataset.clave === clave)); },
    minutos(){ if(caja) caja.querySelector('.num').textContent = Math.floor(seg/60); },

    // fondo: la cuadrícula de puntos va en CSS; aquí, dos manchas suaves del color de la canción
    halo(ctx, W, H, e, ms, previa, suave){
      const {acc, acc2} = colorCancion(), a = suave ? .06 : .14;
      [[.25 + Math.sin(ms/7000)*.05, .3, acc], [.75, .7 + Math.cos(ms/9000)*.05, acc2]].forEach(([x, y, c]) => {
        const g = ctx.createRadialGradient(W*x, H*y, 0, W*x, H*y, Math.max(W, H)*(.45 + e.bajo*.08));
        g.addColorStop(0, rgba(c, a)); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      });
      if(previa){
        const b = A.bandas ? A.bandas(10) : null; ctx.fillStyle = 'rgba(185,164,255,.9)';
        for(let i = 0; i < 10; i++){ const h = (b ? b[i] : .3)*H*.8; ctx.fillRect(W*.1 + i*W*.08, H - h, W*.06, h); }
      }
    },
    // barras del mosaico, disco girando y minutos escuchados hoy
    cuadro(){
      if(!caja) return;
      if(barras.length && A.bandas){ const b = A.bandas(10); barras.forEach((el, i) => el.style.transform = 'scaleY(' + Math.max(.06, b[i]).toFixed(3) + ')'); }
      disco.parentElement.classList.toggle('para', !S.sonando || poco());
      const t = performance.now(); if(t - tSeg > 2000){ tSeg = t; seg = leerHoy(); this.minutos(); }
    }
  };
}
