# SEÑAL — otra manera de escuchar música

Reproductor web personal conectado a **Spotify** que convierte la música en una experiencia **visual**: letras sincronizadas a pantalla completa, visualizadores de sonido, colores que cambian con la portada de cada canción y un modo inmersivo.

> Proyecto personal. Funciona en Chrome o Edge en una PC con Windows.

## Funciones

- **Spotify dentro de la página**: SEÑAL aparece como un dispositivo más de Spotify (requiere Premium).
- **Biblioteca y búsqueda**: playlists, canciones una por una, Me gusta, más escuchadas, artistas y álbumes. También puedes agregar canciones a la cola.
- **Letras sincronizadas** desde [LRCLIB](https://lrclib.net) con 7 estilos: Karaoke, Foco, Palabra, Máquina, Subtítulo, Profundidad 3D y Sin letra.
- **Traducción al español** debajo de cada línea, con el traductor integrado de Chrome.
- **Crea tus propias letras**: pégalas y sincronízalas con Enter, o deja que la **IA (Whisper)** lo haga escuchando la canción. Puedes importar y exportar archivos `.lrc`.
- **7 visualizadores**: Barras neón, Aurora, Orbe, Cordillera, Warp, Vinilo y Pixeles.
- **Modo inmersivo**: todo se esconde en los bordes y las opciones aparecen al acercar el mouse, con vistas previas animadas.
- Otras fuentes: **audio del PC**, **archivos MP3** y **demo**.

## Cómo usarlo

1. Descarga o clona este repositorio.
2. Haz doble clic en **`iniciar.bat`**. Se abre un pequeño servidor local y el navegador en `http://127.0.0.1:5500/`.
3. En **♫ MÚSICA → SPOTIFY** inicia sesión con tu cuenta Premium.

> Si usas VS Code con la extensión **Live Server**, también puedes abrir la carpeta y pulsar *Go Live*.

### Usar tu propia app de Spotify

El archivo `index.html` trae el **Client ID** de la app de Spotify del autor (es un dato público, no es secreto). Si quieres usar el tuyo:

1. Crea una app en [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard) con la Redirect URI `http://127.0.0.1:5500/` y las APIs *Web API* y *Web Playback SDK*.
2. Cambia `SPOTIFY_CLIENT_ID` al inicio del `<script>` en `index.html`.

En modo desarrollo, Spotify solo permite que la app la usen el dueño y hasta 5 usuarios registrados.

## Atajos de teclado

| Tecla | Acción |
|---|---|
| `Espacio` | Play / pausa |
| `← →` | Mover 5 segundos |
| `1`–`7` | Cambiar visualizador |
| `L` | Cambiar estilo de letra |
| `T` | Traducir la letra |
| `E` | Crear / editar la letra |
| `I` | Modo inmersivo |
| `/` | Buscar en Spotify |
| `C` / `B` / `F` | CRT / blanco y negro / pantalla completa |
| `[` `]` | Adelantar o atrasar la letra |
| `Esc` | Cerrar menús |

## Tecnología

- HTML, CSS y JavaScript en un solo archivo, sin instalación.
- Spotify Web API y Web Playback SDK (inicio de sesión seguro con PKCE, sin contraseñas ni secretos guardados).
- LRCLIB para letras sincronizadas.
- Transformers.js + Whisper para la sincronización con IA (se ejecuta en el navegador).
- Canvas 2D y Web Audio API para los visualizadores.
- Servidor local mínimo en PowerShell (`servidor.ps1`).

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `index.html` | Toda la aplicación |
| `iniciar.bat` | Abre SEÑAL con doble clic |
| `servidor.ps1` | Servidor local en `127.0.0.1:5500` (solo tu PC) |
| `LEEME.txt` | Guía de uso paso a paso |

## Versiones

- **v1.4.1**: aviso para renovar permisos de Spotify.
- **v1.4**: biblioteca con canciones, Me gusta, búsqueda, artistas y álbumes.
- **v1.3.1**: sincronización con IA más fácil y estable.
- **v1.3**: barra ordenada, traducción y sincronización con IA.
- **v1.2**: editor de letras propias y modo inmersivo.
- **v1.1**: estilos de letra y visualizadores nuevos.
- **v1.0**: diseño inmersivo y letras sincronizadas.
