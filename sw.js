// SEÑAL v2 · service worker: guarda la app en el equipo para que abra rápido y funcione sin conexión
// (la música de Spotify, las letras de LRCLIB y la cuenta siguen necesitando internet).
// Al publicar cambios, sube VERSION: así los equipos instalados se enteran de que hay una versión nueva.
const VERSION = 'senal-2.0.0';
const ARCHIVOS = [
  './',
  'css/base.css',
  'css/letras.css',
  'css/paneles.css',
  'css/perfil.css',
  'css/piel-a.css',
  'css/piel-b.css',
  'css/piel-c.css',
  'css/piel-d.css',
  'css/pieles.css',
  'css/puerta.css',
  'firebase-config.js',
  'iconos/apple-touch-icon.png',
  'iconos/favicon-32.png',
  'iconos/icono-192.png',
  'iconos/icono-512.png',
  'iconos/icono-maskable-512.png',
  'index.html',
  'js/app.js',
  'js/biblioteca.js',
  'js/editor.js',
  'js/estado.js',
  'js/fuentes/demo.js',
  'js/garabatos.js',
  'js/ia.js',
  'js/letras.js',
  'js/main.js',
  'js/nube.js',
  'js/paneles.js',
  'js/perfil.js',
  'js/pieles/comun.js',
  'js/pieles/index.js',
  'js/pieles/piel-a.js',
  'js/pieles/piel-b.js',
  'js/pieles/piel-c.js',
  'js/pieles/piel-d.js',
  'js/portada.js',
  'js/puerta.js',
  'js/reproductor.js',
  'js/spotify.js',
  'js/visual.js',
  'manifest.webmanifest',
  'privacidad.html',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ARCHIVOS)));
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for(const k of await caches.keys()) if(k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});
// la página pide pasar a la versión nueva cuando tú tocas "Actualizar"
self.addEventListener('message', e => { if(e.data === 'actualizar') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const r = e.request, url = new URL(r.url);
  if(r.method !== 'GET' || url.origin !== self.location.origin) return;   // Spotify, Firebase, LRCLIB…: siempre por internet
  if(r.mode === 'navigate'){
    // la página: primero internet (trae lo último y la vuelta de Spotify con ?code=), si no hay, la copia guardada
    e.respondWith(fetch(r).catch(async () => (await caches.match(r, {ignoreSearch: true})) || caches.match('./')));
    return;
  }
  // archivos de la app: la copia guardada al instante; si no está, se descarga y se guarda
  e.respondWith((async () => {
    const guardado = await caches.match(r);
    if(guardado) return guardado;
    const resp = await fetch(r);
    if(resp.ok && resp.type === 'basic'){ const c = await caches.open(VERSION); c.put(r, resp.clone()); }
    return resp;
  })());
});
