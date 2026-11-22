// SEÑAL v2 · PIEL D · "Video lírico": halo de luz con estrellas, tarjetas flotantes y temblor con el bajo.
import { montarGarabatos, limpiarGarabatos } from '../garabatos.js';
import { esc } from '../estado.js';
import { colorCancion } from './comun.js';

export function crearPielD(ui, poco, variante){
  let sac = 0, bajoAntes = 0;
  const estrellas = Array.from({length: 90}, () => ({x: Math.random(), y: Math.random(), r: Math.random()*1.4 + .3, f: Math.random()*6}));
  const LUGARES = [{l:'0px', t:'0px', g:'-9deg'}, {l:'340px', t:'-10px', g:'8deg'}, {l:'20px', t:'calc(100% - 190px)', g:'6deg'}, {l:'320px', t:'calc(100% - 210px)', g:'-7deg'}];

  return {
    id: variante === 'rojo' ? 'dr' : 'd', nombre: variante === 'rojo' ? 'Video lírico rojo' : 'Video lírico',
    montar(){ montarGarabatos(ui.garabatos); },
    desmontar(){ limpiarGarabatos(); ui.tarjetas.querySelectorAll('.tarjeta').forEach(t => t.remove()); },
    cancion(){},
    portada(c){ ui.pintarFoto(c); },

    // tarjetas flotantes: canciones para tocar (demo o tus más escuchadas de Spotify)
    tarjetas(lista){
      ui.tarjetas.querySelectorAll('.tarjeta').forEach(t => t.remove());
      lista.slice(0, 4).forEach((c, k) => {
        const p = LUGARES[k], b = document.createElement('button'); b.className = 'tarjeta';
        b.style.cssText = `left:${p.l};top:${p.t};--giro:${p.g};--ret:-${k*1.7}s`;
        b.setAttribute('aria-label', 'Reproducir ' + c.titulo + ' de ' + c.artista);
        b.dataset.clave = c.clave || c.uri || '';
        b.innerHTML = (c.img ? '<img alt="" src="' + esc(c.img) + '">' : '<canvas width="300" height="206" aria-hidden="true"></canvas>') + '<b></b><span></span>';
        b.querySelector('b').textContent = c.titulo; b.querySelector('span').textContent = c.artista;
        if(c.dibujar) c.dibujar(b.querySelector('canvas'));
        b.onclick = c.tocar; ui.tarjetas.appendChild(b);
      });
    },
    marcar(clave){ ui.tarjetas.querySelectorAll('.tarjeta').forEach(t => t.classList.toggle('sonando', !!clave && t.dataset.clave === clave)); },

    // fondo: halo del color de la canción y estrellas que titilan (suave = detrás de otro visualizador)
    halo(ctx, W, H, e, ms, previa, suave){
      const cx = W*(previa ? .5 : .72), cy = H*.48, R = Math.min(W, H)*(.42 + e.bajo*.12)*(previa ? 1.4 : 1);
      const [r, gg, b] = colorCancion().acc, a1 = suave ? .25 : .65, a2 = suave ? .08 : .2;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
      g.addColorStop(0, `rgba(${r},${gg},${b},${a1})`); g.addColorStop(.45, `rgba(${r},${gg},${b},${a2})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
      if(suave) return;
      ctx.fillStyle = '#fff';
      for(const s of estrellas){
        ctx.globalAlpha = .25 + .55*Math.abs(Math.sin(ms/900 + s.f))*(.6 + e.agudos);
        ctx.beginPath(); ctx.arc(s.x*W, s.y*H, s.r*(previa ? .6 : 1), 0, 6.283); ctx.fill();
      }
      ctx.globalAlpha = 1;
    },

    // la línea actual del estilo Lírico tiembla con los golpes del bajo
    cuadro(e){
      if(poco()) return;
      if(e.bajo > .62 && e.bajo - bajoAntes > .04) sac = (Math.random() < .5 ? -1 : 1)*(4 + e.bajo*6);
      sac *= .82; bajoAntes = e.bajo;
      const el = document.querySelector('#letras .actual'); if(el) el.style.setProperty('--sac', sac.toFixed(2));
    }
  };
}
