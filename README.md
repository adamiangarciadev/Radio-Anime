# Radio Anime

Radio Anime es una aplicacion web estatica para reproducir openings y endings de anime usando la API oficial de AnimeThemes en vivo.

## Funciones

- Reproduccion aleatoria de temas desde AnimeThemes.
- Busqueda remota por anime usando la API.
- Filtro por openings, endings o favoritos.
- Favoritos persistidos en el navegador con `localStorage`.
- UI responsive sin dependencias externas.
- Manejo de errores de carga y videos no reproducibles.
- Paginado remoto para cargar mas temas sin mantener un JSON local.

## Estructura

```text
Radio-Anime/
├── index.html
├── style.css
├── script.js
└── config.js
```

## Uso local

Por restricciones del navegador, conviene abrir el proyecto con un servidor local en vez de hacer doble click sobre `index.html`.

```bash
python -m http.server 8000
```

Despues abrir `http://localhost:8000`.

## Configuracion

Los valores principales estan en `config.js`:

- `API_BASE_URL`: URL base de AnimeThemes.
- `PAGE_SIZE`: cantidad de temas por pagina remota.
- `SEARCH_ANIME_LIMIT`: cantidad maxima de animes detallados por busqueda.
- `MAX_VISIBLE_CARDS`: cantidad maxima de tarjetas renderizadas.
- `FAVORITES_STORAGE_KEY`: clave usada para favoritos en `localStorage`.
