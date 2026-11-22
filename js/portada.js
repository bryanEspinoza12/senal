// SEÑAL v2 · portadas generadas para el demo (anillos ondulados con los colores de la canción)
export function dibujarPortada(canvas, c){
  const g = canvas.getContext('2d'), W = canvas.width, H = canvas.height, cx = W/2, cy = H/2;
  const fondo = g.createRadialGradient(cx*.8, cy*.7, 0, cx, cy, W*.75);
  fondo.addColorStop(0, c.acc2); fondo.addColorStop(.45, c.acc); fondo.addColorStop(1, '#05060f');
  g.fillStyle = fondo; g.fillRect(0, 0, W, H);
  let s = c.semilla || 1; const rnd = () => { s = (s*9301 + 49297) % 233280; return s/233280; };
  const w = [rnd()*6, rnd()*6];
  g.lineWidth = Math.max(1, W/220);
  for(let k = 0; k < 11; k++){
    g.beginPath(); const r = W*.06 + k*W*.045;
    for(let a = 0; a <= Math.PI*2 + .07; a += .07){
      const rr = r + Math.sin(a*3 + w[0] + k*.4)*W*.02 + Math.sin(a*5 + w[1])*W*.012;
      const x = cx + Math.cos(a)*rr, y = cy + Math.sin(a)*rr;
      a === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
    }
    g.strokeStyle = `rgba(255,255,255,${.12 + .5*(k/11)})`; g.stroke();
  }
}
