# SEÑAL — otra manera de escuchar música

Reproductor web personal conectado a **Spotify** que convierte la música en algo para **ver**: letras sincronizadas, visualizadores, colores que salen de cada portada y **pieles** que cambian solas según el género de la canción.

> **Abrir:** https://bryanespinoza12.github.io/senal/ · Se puede **instalar como app** en la PC y en el celular.
>
> Proyecto personal en **pruebas privadas**: para entrar con cuenta hace falta invitación. Sin cuenta se puede probar todo y lo guardado queda solo en tu dispositivo.

## Novedades de la v2.0

- **Cuenta con Google**: tus letras, ajustes, pieles por artista e historial te siguen a cualquier dispositivo. Lista de invitados en Firestore.
- **4 pieles + 1 variante**, elegidas por el género del artista en Spotify:

  | Piel | Géneros |
  |---|---|
  | Transmisión | rock · indie · alternativo · punk |
  | Cromo | electrónica · pop · dance · K-pop |
  | Escritorio | lo-fi · acústico · baladas · jazz |
  | Video lírico | urbano · reggaetón · trap · R&B |
  | Video lírico rojo | corridos · regional mexicano |

  Si el artista no tiene género, usa **tus gustos** (tus artistas más escuchados) y, si tampoco hay, la **energía del audio**. Con **◈ Piel** puedes fijar una piel o elegir una para cada artista.
- **Mi perfil**: estadísticas (minutos, artistas, géneros, pieles, a qué hora escuchas), tus letras, tus pieles y tu cuenta: **descargar** y **borrar** tus datos o la cuenta entera.
- **App instalable** (PWA) con modo sin conexión y aviso de versiones nuevas.
- **Política de privacidad**: [privacidad.html](privacidad.html).
- Código separado en módulos (`js/`, `css/`).

## Todo lo de antes sigue

- Spotify dentro de la página en la PC (Premium) y **modo acompañante** en el celular.
- Biblioteca y búsqueda: playlists, Me gusta, más escuchadas, artistas y álbumes.
- **8 estilos de letra**: De la piel, Karaoke, Foco, Palabra, Máquina, Subtítulo, 3D y Sin letra. Letras de [LRCLIB](https://lrclib.net).
- **Traducción** al español (traductor integrado de Chrome) y **sincronización con IA** (Whisper, en tu equipo).
- Editor de letras, importar y exportar `.lrc`.
- **8 visualizadores**: Piel, Barras, Aurora, Orbe, Cordillera, Warp, Vinilo y Pixeles.
- Fuentes: Spotify, audio del PC, micrófono, MP3 y demo. Modo inmersivo.

## Cómo usarlo

**En el navegador:** abre https://bryanespinoza12.github.io/senal/, entra con Google (o "Probar sin cuenta") y conecta Spotify.

**En tu PC sin GitHub:** descarga el repositorio y haz doble clic en **`iniciar.bat`**. Se abre `http://127.0.0.1:5500/`.

**Instalar como app:** ⛶ Pantalla → **⇩ Instalar SEÑAL** (Chrome / Edge / Android). En iPhone: Safari → Compartir → **Agregar a inicio**.

## Estructura

```
index.html            la app
privacidad.html       política de privacidad
manifest.webmanifest  datos de la app instalable
sw.js                 modo sin conexión y actualizaciones (sube VERSION al publicar cambios)
firebase-config.js    configuración pública de Firebase
firestore.rules       reglas de seguridad de la base de datos (se publican en la consola de Firebase)
css/                  estilos: base, letras, paneles, una hoja por piel, portada y perfil
js/                   módulos: main, estado, reproductor, spotify, biblioteca, letras, editor, ia,
                      visual, paneles, nube (cuenta), puerta (portada), perfil, app (instalable)
js/pieles/            gestor de pieles y una piel por archivo
iconos/               íconos de la app
servidor.ps1 + iniciar.bat   servidor local para Windows (solo 127.0.0.1)
```

## Seguridad

- El **Client ID** de Spotify y la configuración web de Firebase son **públicos por diseño**. La protección está en las **reglas de Firestore** (cada persona solo lee y escribe lo suyo, y solo si está invitada) y en los dominios autorizados.
- El *Client secret* de Spotify **no** se usa (PKCE) y nunca debe subirse.
- El servidor local solo escucha en `127.0.0.1`, solo responde GET y solo entrega archivos de su carpeta.

## Usar tus propias apps

- **Spotify:** crea una app en [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard) con las Redirect URI `http://127.0.0.1:5500/` y la de tu GitHub Pages, y cambia `CLIENT_ID` en `js/spotify.js`. En modo desarrollo Spotify permite hasta 5 usuarios registrados.
- **Firebase:** crea un proyecto (plan gratuito Spark), activa Google en Authentication, crea Firestore, pega tu configuración en `firebase-config.js`, publica `firestore.rules` y agrega tu correo como documento en la colección `acceso`.

## Atajos de teclado

| Tecla | Acción |
|---|---|
| `Espacio` | Play / pausa |
| `← →` | Mover 5 segundos |
| `1`–`8` | Visualizador |
| `L` | Estilo de letra |
| `T` | Traducir |
| `E` | Crear / editar letra |
| `I` | Modo inmersivo |
| `/` | Buscar |
| `C` / `B` / `F` | CRT / blanco y negro / pantalla completa |
| `[` `]` | Adelantar o atrasar la letra |
| `Esc` | Cerrar |

SEÑAL no es un producto de Spotify ni está afiliado a Spotify.
