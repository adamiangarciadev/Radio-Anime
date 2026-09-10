# Radio Anime

Una sala de escucha para descubrir openings y endings. Aplicación estática en español rioplatense, compatible con GitHub Pages en `/Radio-Anime/` y sin dependencias de compilación.

## Funciones

- Selección inicial de metadatos reales de AnimeThemes, con portadas y títulos de canciones.
- Búsqueda remota por anime, canción o artista; filtros de tipo/año y ordenación.
- Reproductor persistente, controles de volumen y posición, aleatorio, repetición y avance automático.
- Cola de esta sesión, historial de 40 temas y favoritos persistentes en este navegador.
- Migración de favoritos de la versión anterior sin borrar sus enlaces.
- Modo cine, compartir un tema, temporizador y atajos de teclado.
- Media Session para controles multimedia del sistema cuando el navegador lo admite.
- Diseño adaptable y navegación por teclado, diálogos nativos, preferencias de movimiento reducido.
- Service worker para volver a abrir la interfaz y explorar la selección sin conexión. **Los videos necesitan Internet y no se descargan para uso offline.**

## Vista previa local

Desde esta carpeta:

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

Abrí http://127.0.0.1:8000. No uses `file://`: la selección y el service worker necesitan un servidor HTTP. No hace falta instalar paquetes de Node ni hacer un build.

## Publicación en GitHub Pages

El contenido publicable está en la raíz. En GitHub: Settings → Pages → Deploy from a branch → `main` → `/ (root)`. La ruta esperada para este repositorio es https://adamiangarciadev.github.io/Radio-Anime/ . Todas las rutas de recursos son relativas y `.nojekyll` evita el procesamiento de Jekyll.

La publicación de este rediseño queda pendiente de la revisión de la vista previa por parte del propietario. No se hizo push durante la preparación.

Para una nueva versión, actualizá la versión de CSS/JS en `index.html` y los nombres correspondientes en `sw.js`. El service worker usa red primero, conserva una copia local y nunca intercepta videos ni peticiones a AnimeThemes. Una versión nueva del worker toma el control cuando se cierran las pestañas de la versión anterior.

## Configuración

`config.js` contiene la URL pública de AnimeThemes, la cantidad de resultados por página remota y la clave de favoritos anterior. No necesita claves API, secretos, cuentas ni backend propio.

`data/selection.json` contiene una selección real obtenida el 10 de septiembre de 2026. La búsqueda y la paginación consultan el proveedor en vivo; el snapshot inicial se puede renovar sin modificar la interfaz. El reproductor evita variantes duplicadas y omite entradas marcadas NSFW o spoilers.

## Disponibilidad y datos

La disponibilidad de videos, portadas y búsqueda depende de AnimeThemes, su política CORS, su límite de peticiones y los formatos compatibles con cada navegador. Ante errores, la interfaz permite reintentar o elegir otro tema; no salta indefinidamente entre videos fallidos. Las búsquedas canceladas no reemplazan resultados nuevos.

Los favoritos, el historial y el volumen se guardan en localStorage del origen actual. La vista previa local y GitHub Pages tienen almacenamientos separados; los favoritos no se sincronizan entre dispositivos. La cola y el temporizador viven únicamente en la pestaña actual. Las pestañas en segundo plano o un dispositivo suspendido pueden retrasar el temporizador; se comprueba nuevamente al volver.

Créditos de arte y tipografía en `assets/ATTRIBUTION.md`. Las obras de anime pertenecen a sus titulares; el repositorio no aloja audio ni video.
