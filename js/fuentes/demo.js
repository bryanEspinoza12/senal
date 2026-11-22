// SEÑAL v2 · fuente DEMO: canciones inventadas (letra original) y un espectro simulado.
export const CANCIONES = [
  {id:'demo:0', titulo:'Señal perdida', artista:'Nodo 7', genero:'trap latino', bpm:118, acc:'#3d5cff', acc2:'#9fd8ff', semilla:11, dur:96,
   letra:['Busco tu señal entre el ruido','Un paquete perdido en la red','Cada ping que mando vuelve vacío','Pero sigo esperando respuesta','Sube el volumen, baja la luz','Que la música encienda la pantalla','Si te caes del mapa yo te encuentro','Aunque se corte la conexión']},
  {id:'demo:1', titulo:'Fuera de la red', artista:'Cat6', genero:'corridos tumbados', bpm:96, acc:'#7a3dff', acc2:'#d3b8ff', semilla:42, dur:96,
   letra:['Viajo en un hilo de luz','Tres pisos de cable hasta tu voz','No hay latencia cuando estás','Todo llega a la velocidad del sol','Apaga el router de la ciudad','Que esta noche solo hablamos tú y yo','Cada bit que mando lleva tu nombre','Y no se pierde ni uno en el camino']},
  {id:'demo:2', titulo:'Planeta 443', artista:'Handshake', genero:'indie rock', bpm:104, acc:'#ff3d6e', acc2:'#ffb3c4', semilla:77, dur:96,
   letra:['Toco tu puerta en el 443','Te mando un saludo cifrado','Eres de otro planeta, de otra luna','Mi llave encaja en tu corazón','Firewall abajo, fuego arriba','Solo entra quien sabe la clave','Esta noche el cielo es nuestro','Y llueven estrellas sobre el rack']},
  {id:'demo:3', titulo:'Ping infinito', artista:'TTL 64', genero:'electropop', bpm:128, acc:'#00c2a8', acc2:'#9ff5e8', semilla:5, dur:96,
   letra:['Mando un ping al infinito','Sesenta y cuatro saltos hasta ti','Si respondes en milisegundos','Ya sé que sigues aquí','Las luces del switch parpadean','Como estrellas en la noche','Que no termine esta canción','Que no se acabe la señal']},
  {id:'demo:4', titulo:'Modo avión', artista:'Bajo consumo', genero:'lo-fi', bpm:82, acc:'#8f7bff', acc2:'#e4dcff', semilla:23, dur:96,
   letra:['Pongo el teléfono en modo avión','Y el cuarto se queda en silencio','Café frío junto al teclado','La lluvia escribe en la ventana','No hay notificaciones esta tarde','Solo el disco dando vueltas','Me quedo un rato más aquí','Sin señal, pero en calma']}
];

// letra sincronizada inventada: una línea cada 9 s, con pausas al inicio y al final
export function letraDemo(c){
  const out = [{t:0, texto:''}]; let t = 4;
  for(const l of c.letra){ out.push({t, texto:l}); t += 9; }
  out.push({t, texto:''}); return out;
}

// espectro simulado al ritmo de la canción (no hay audio real en el demo)
const F = new Uint8Array(1024);
export function espectro(ms, bpm, sonando){
  if(!sonando){ for(let i=0;i<1024;i++) F[i] *= .9; return F; }
  const fase = ((ms/1000)*bpm/60) % 1, golpe = Math.exp(-fase*6);
  for(let i=0;i<1024;i++){
    const x = i/1024;
    let v = Math.pow(1-x,1.6)*170*(.55+.45*golpe) + 40*Math.sin(ms/700+i*.05)*(1-x) + 30*Math.sin(ms/430+i*.013)*(1-x) + Math.random()*22*(1-x*.7);
    if(x > .02 && x < .08) v += 60*Math.abs(Math.sin(ms/180));
    F[i] = Math.max(0, Math.min(255, v));
  }
  return F;
}
