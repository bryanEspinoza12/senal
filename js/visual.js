// SEÑAL v2 · visualizadores: Halo (de la piel) + los 7 de la v1.5, con vistas previas en vivo.
import { S, A, $, store } from './estado.js';

let ctx = null, W = 0, H = 0, DPR = 1, PREV = false;
let acc = '#3d5cff', acc2 = '#9fd8ff';
export function colores(){ const cs = getComputedStyle(document.documentElement); acc = cs.getPropertyValue('--acc').trim() || acc; acc2 = cs.getPropertyValue('--acc2').trim() || acc2; }

const Sm = new Float32Array(1024);
export function suavizar(F){ for(let i = 0; i < 1024; i++){ const v = F[i]/255; Sm[i] += (v - Sm[i]) * (v > Sm[i] ? .5 : .1); } }
export function energia(F){ const p = (a, b) => { let s = 0; for(let i = a; i < b; i++) s += F[i]; return s/(b - a)/255; }; return {bajo:p(1, 12), medios:p(12, 120), agudos:p(120, 500)}; }
A.bandas = n => bandas(n);
export function bandas(n){
  const out = new Float32Array(n);
  for(let i = 0; i < n; i++){
    const a = Math.floor(Math.pow(i/n, 1.9)*480) + 2, b = Math.max(a + 1, Math.floor(Math.pow((i+1)/n, 1.9)*480) + 2);
    let s = 0; for(let k = a; k < b; k++) s += Sm[k]; out[i] = Math.min(1, s/(b - a)*1.15);
  }
  return out;
}
function curva(p){ ctx.moveTo(p[0][0], p[0][1]); for(let i = 1; i < p.length - 1; i++){ const xc = (p[i][0] + p[i+1][0])/2, yc = (p[i][1] + p[i+1][1])/2; ctx.quadraticCurveTo(p[i][0], p[i][1], xc, yc); } const l = p[p.length-1]; ctx.lineTo(l[0], l[1]); }
function mancha(p){ const n = p.length, mid = (a, b) => [(a[0]+b[0])/2, (a[1]+b[1])/2], s = mid(p[n-1], p[0]); ctx.moveTo(s[0], s[1]); for(let i = 0; i < n; i++){ const q = mid(p[i], p[(i+1) % n]); ctx.quadraticCurveTo(p[i][0], p[i][1], q[0], q[1]); } ctx.closePath(); }
function rrect(x, y, w, h, r){ ctx.beginPath(); if(ctx.roundRect) ctx.roundRect(x, y, w, h, Math.min(r, h/2)); else ctx.rect(x, y, w, h); ctx.fill(); }

// 0 · HALO: el fondo propio de la piel (luz y estrellas)
function vHalo(e, t){ A.piel.halo(ctx, W, H, e, t, PREV); }
// 1 · BARRAS NEÓN
function vBarras(e){
  const half = 36, B = bandas(half), n = half*2, base = H*.8, maxH = H*.48, gap = W/n, bw = gap*.52;
  const g = ctx.createLinearGradient(0, base - maxH, 0, base); g.addColorStop(0, acc2); g.addColorStop(1, acc); ctx.fillStyle = g;
  for(let i = 0; i < n; i++){
    const v = B[i < half ? half-1-i : i-half], h = Math.max(4*DPR, v*maxH), x = i*gap + (gap - bw)/2;
    ctx.globalAlpha = .95; ctx.shadowColor = acc; ctx.shadowBlur = PREV ? 0 : 18*DPR; rrect(x, base - h, bw, h, bw/2);
    ctx.shadowBlur = 0; ctx.globalAlpha = .16; rrect(x, base + 8*DPR, bw, h*.35, bw/2);
  }
  ctx.globalAlpha = .35; ctx.fillStyle = '#fff'; ctx.fillRect(0, base + 3*DPR, W, DPR); ctx.globalAlpha = 1;
}
// 2 · AURORA
function vAurora(e, t){
  const B = bandas(48), n = B.length;
  const capas = [{c:acc2, a:.32, y:.6, amp:.34, ph:0}, {c:acc, a:.42, y:.67, amp:.44, ph:1.7}, {c:'#ffffff', a:.1, y:.72, amp:.24, ph:3.1}, {c:acc, a:.7, y:.8, amp:.3, ph:4.4}];
  for(const L of capas){
    const p = [];
    for(let i = 0; i <= n; i++){ const v = B[(Math.min(n-1, i) + Math.floor(L.ph*5)) % n], w = .55 + .45*Math.sin(t*.0012 + i*.35 + L.ph); p.push([i/n*W, H*L.y - v*H*L.amp*w - e.bajo*H*.05]); }
    ctx.beginPath(); curva(p); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
    const g = ctx.createLinearGradient(0, H*(L.y - L.amp), 0, H); g.addColorStop(0, L.c); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = L.a; ctx.fillStyle = g; ctx.fill();
    ctx.beginPath(); curva(p); ctx.globalAlpha = Math.min(1, L.a + .35); ctx.strokeStyle = L.c; ctx.lineWidth = 2*DPR; ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
// 3 · ORBE
const orbP = Array.from({length:110}, () => ({a:Math.random()*Math.PI*2, r:Math.random(), s:.002 + Math.random()*.006}));
function vOrbe(e, t){
  const cx = W/2, cy = H*.47, R = Math.min(W, H)*.16*(1 + e.bajo*.35), B = bandas(48), n = 96;
  for(let ring = 2; ring >= 0; ring--){
    const p = [], rot = t*.00025*(ring % 2 ? -1 : 1);
    for(let i = 0; i < n; i++){ const v = B[i < n/2 ? i : n-1-i], a = i/n*Math.PI*2 + rot - Math.PI/2, rr = R*(1 + ring*.3) + v*R*(.6 - ring*.13); p.push([cx + Math.cos(a)*rr, cy + Math.sin(a)*rr]); }
    ctx.beginPath(); mancha(p);
    if(ring === 0){ const g = ctx.createRadialGradient(cx, cy, R*.05, cx, cy, R*1.7); g.addColorStop(0, '#ffffff'); g.addColorStop(.35, acc); g.addColorStop(1, acc2); ctx.globalAlpha = .9; ctx.fillStyle = g; ctx.shadowColor = acc; ctx.shadowBlur = PREV ? 0 : 60*DPR; ctx.fill(); ctx.shadowBlur = 0; }
    else { ctx.globalAlpha = .55 - ring*.13; ctx.strokeStyle = ring === 1 ? acc : acc2; ctx.lineWidth = 1.6*DPR; ctx.stroke(); }
  }
  for(const q of orbP){ if(!PREV) q.a += q.s*(1 + e.agudos*8); const rr = R*(2 + q.r*1.3) + e.bajo*R*.5; ctx.globalAlpha = .35 + q.r*.65; ctx.fillStyle = q.r > .6 ? acc : '#fff'; ctx.fillRect(cx + Math.cos(q.a)*rr, cy + Math.sin(q.a)*rr*.82, 2*DPR, 2*DPR); }
  ctx.globalAlpha = 1;
}
// 4 · CORDILLERA
const cord = []; let cTic = 0;
function vCordillera(){
  if(!PREV && cTic++ % 2 === 0){ cord.unshift(bandas(32)); if(cord.length > 34) cord.pop(); }
  for(let r = cord.length - 1; r >= 0; r--){
    const z = r/34, y0 = H*(.84 - z*.5), sx = 1 - z*.55, amp = H*.24*(1 - z*.55), x0 = W*(1 - sx)/2, w = W*sx, fila = cord[r], p = [];
    for(let i = 0; i < 64; i++){ const c = Math.abs(i - 31.5)/31.5, env = Math.pow(1 - c, .7); p.push([x0 + i/63*w, y0 - fila[i < 32 ? 31-i : i-32]*amp*env]); }
    ctx.beginPath(); curva(p); ctx.lineTo(x0 + w, y0 + 2); ctx.lineTo(x0, y0 + 2); ctx.closePath(); ctx.globalAlpha = 1; ctx.fillStyle = '#000'; ctx.fill();
    ctx.beginPath(); curva(p); ctx.strokeStyle = r === 0 ? '#fff' : (r % 6 === 0 ? acc2 : acc); ctx.globalAlpha = r === 0 ? 1 : (1 - z)*.85; ctx.lineWidth = (r === 0 ? 2.4 : 1.3)*DPR; ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
// 5 · WARP
const nueva = () => ({x:(Math.random() - .5)*2, y:(Math.random() - .5)*2, z:Math.random()*1000 + 50, c:Math.random()});
const WP = Array.from({length:440}, nueva);
function vWarp(e){
  const cx = W/2, cy = H*.47, f = Math.max(W, H)*45, sp = 4 + e.bajo*60 + (e.bajo + e.medios + e.agudos)/3*20;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(W, H)*(.25 + e.bajo*.25)); g.addColorStop(0, acc); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = .2 + e.bajo*.45; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.lineCap = 'round';
  for(const s of WP){
    let pz = s.z, z = s.z - sp; if(PREV){ z = s.z; pz = s.z + sp; } else s.z = z;
    if(z < 5){ if(!PREV) Object.assign(s, nueva(), {z:1000}); continue; }
    const x1 = cx + s.x/pz*f, y1 = cy + s.y/pz*f, x2 = cx + s.x/z*f, y2 = cy + s.y/z*f;
    if(x2 < 0 || x2 > W || y2 < 0 || y2 > H){ if(!PREV) Object.assign(s, nueva(), {z:1000}); continue; }
    ctx.globalAlpha = Math.min(1, (1 - z/1000)*1.4); ctx.strokeStyle = s.c > .75 ? acc2 : (s.c > .4 ? acc : '#fff'); ctx.lineWidth = Math.max(.5, (1 - z/1000)*3.2)*DPR;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
// 6 · VINILO
let ang = 0;
function vVinilo(e){
  const cx = W/2, cy = H*.47, R = Math.min(W, H)*.3, B = bandas(80);
  if(!PREV) ang += .006 + (S.sonando ? .02 : 0) + (e.bajo + e.medios)/2*.03;
  for(let i = 0; i < 160; i++){
    const a = i/160*Math.PI*2 - ang*.3, v = B[i < 80 ? i : 159-i], l = v*R*.6, r0 = R + 10*DPR;
    ctx.strokeStyle = i % 2 ? acc : acc2; ctx.globalAlpha = .3 + v*.7; ctx.lineWidth = 3*DPR; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(a)*r0, cy + Math.sin(a)*r0); ctx.lineTo(cx + Math.cos(a)*(r0 + l), cy + Math.sin(a)*(r0 + l)); ctx.stroke();
  }
  ctx.globalAlpha = 1; ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang);
  ctx.fillStyle = '#0a0a0a'; ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI*2); ctx.fill();
  for(let r = R*.4; r < R; r += 3*DPR){ ctx.strokeStyle = 'rgba(255,255,255,' + (.03 + .03*Math.sin(r)) + ')'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.stroke(); }
  ctx.save(); ctx.beginPath(); ctx.arc(0, 0, R*.36, 0, Math.PI*2); ctx.clip(); ctx.drawImage(A.portada(), -R*.36, -R*.36, R*.72, R*.72); ctx.restore();
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0, 0, R*.03, 0, Math.PI*2); ctx.fill(); ctx.restore();
}
// 7 · PIXELES
const COLS = 80, FILAS = 45, hist = []; let pTic = 0;
function vPixeles(){
  if(!PREV && pTic++ % 2 === 0){ hist.unshift(bandas(COLS)); if(hist.length > FILAS) hist.pop(); }
  const cw = W/COLS, ch = H/FILAS;
  for(let r = 0; r < hist.length; r++) for(let c = 0; c < COLS; c++){
    const v = hist[r][c]; if(v < .1) continue;
    ctx.globalAlpha = Math.min(1, v*1.2)*(1 - r/FILAS*.8); ctx.fillStyle = v > .72 ? acc2 : acc;
    ctx.fillRect(c*cw + 1, H - (r+1)*ch + 1, cw - 2, ch - 2);
  }
  ctx.globalAlpha = 1;
}
export const MODOS = [
  {n:'PIEL',        d:'El fondo propio de la piel que suena', f:vHalo},
  {n:'BARRAS NEÓN', d:'Barras en espejo con brillo', f:vBarras},
  {n:'AURORA',      d:'Ondas líquidas que respiran', f:vAurora},
  {n:'ORBE',        d:'Un núcleo que late con el bajo', f:vOrbe},
  {n:'CORDILLERA',  d:'Montañas 3D hechas de sonido', f:vCordillera},
  {n:'WARP',        d:'Viaje a la velocidad de la luz', f:vWarp},
  {n:'VINILO',      d:'El disco gira con la portada', f:vVinilo},
  {n:'PIXELES',     d:'Cascada de bloques retro', f:vPixeles}
];
S.modoVisual = Math.min(MODOS.length - 1, Math.max(0, +(store.get('senal_viz2') ?? 0)));

const lienzo = $('#fondo'); let base = null;
export function medir(){ DPR = Math.min(devicePixelRatio || 1, 1.5); W = lienzo.width = Math.round(innerWidth*DPR); H = lienzo.height = Math.round(innerHeight*DPR); base = lienzo.getContext('2d'); }
export function dibujar(e, t){
  ctx = base; PREV = false;
  ctx.clearRect(0, 0, W, H);
  if(S.modoVisual !== 0) A.piel.halo(ctx, W, H, e, t, false, true); // fondo suave de la piel detrás de cualquier visual
  MODOS[S.modoVisual].f(e, t);
}
export function ponerModo(i){
  S.modoVisual = i; store.set('senal_viz2', i);
  document.querySelectorAll('#vizCards .tp').forEach((c, j) => c.classList.toggle('on', j === i));
  base && base.clearRect(0, 0, W, H);
}
const previas = []; let pt = 0;
export function tarjetasVisual(){
  MODOS.forEach((m, i) => {
    const c = document.createElement('button'); c.className = 'tp' + (i === S.modoVisual ? ' on' : '');
    c.setAttribute('aria-label', 'Visualizador ' + (i + 1) + ': ' + m.n + ', ' + m.d);
    c.innerHTML = '<div class="pv" aria-hidden="true"><canvas width="190" height="76"></canvas></div><span class="cap2">' + (i + 1) + ' · ' + m.n + '</span>';
    c.onclick = () => ponerModo(i); $('#vizCards').appendChild(c); previas.push(c.querySelector('canvas'));
  });
}
export function dibujarPrevias(e, t){
  if(!A.panelVisible('#pViz') || (++pt % 2)) return;
  const guardado = [ctx, W, H, DPR];
  previas.forEach((c, i) => { ctx = c.getContext('2d'); W = c.width; H = c.height; DPR = .5; PREV = true; ctx.clearRect(0, 0, W, H); try { MODOS[i].f(e, t); } catch(err){} });
  [ctx, W, H, DPR] = guardado; PREV = false;
}
