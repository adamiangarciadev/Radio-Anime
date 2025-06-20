let allThemes = [];
const THEME_TYPE = "OP"; // Cambiar a "ED" para endings, o "" para todos
let currentTheme = null;
let nextTheme = null;
let preloadedVideo = null;

const videoPlayer = document.getElementById('videoPlayer');
const currentPlaying = document.getElementById('currentPlaying');
const loadingElement = document.getElementById('loading');

fetch('anime_themes_by_year_full.json')
  .then(response => response.json())
  .then(data => {
    allThemes = data;
    loadingElement.style.display = 'none';
    playRandomTheme();
  })
  .catch(error => {
    loadingElement.textContent = 'Error al cargar los temas.';
    loadingElement.style.color = '#ff6b6b';
  });

function getRandomTheme(excludeLink) {
  const filteredThemes = THEME_TYPE
    ? allThemes.filter(t => t.Tipo && t.Tipo.toUpperCase().startsWith(THEME_TYPE))
    : allThemes;
  if (filteredThemes.length === 0) return null;

  let theme;
  do {
    theme = allThemes[Math.floor(Math.random() * allThemes.length)];
  } while (theme.Link === excludeLink);
  return theme;
}

function prepareNextTheme() {
  nextTheme = getRandomTheme(currentTheme?.Link);
  preloadedVideo = document.createElement('video');
  preloadedVideo.src = nextTheme.Link;
  preloadedVideo.preload = 'auto';
}

async function playRandomTheme() {
  if (!allThemes.length) return;

  if (nextTheme && preloadedVideo) {
    currentTheme = nextTheme;
    videoPlayer.src = preloadedVideo.src;
    nextTheme = null;
    preloadedVideo = null;
  } else {
    currentTheme = getRandomTheme(currentTheme?.Link);
    videoPlayer.src = currentTheme.Link;
  }

  videoPlayer.play();
  renderCurrentThemeInfo();
  prepareNextTheme();
}

async function renderCurrentThemeInfo() {
  const t = currentTheme;
  const slug = t.Slug || t.slug || t.Anime.toLowerCase().replace(/\s+/g, '-');
  currentPlaying.innerHTML = `<strong>🎵 ${t.Anime}${t.Título && t.Título !== "Sin título" ? ' - ' + t.Título : ''}</strong><br>
      <em>🎧 Tipo: ${t.Tipo || "Desconocido"}</em>`;
  try {
    const response = await fetch(`https://api.animethemes.moe/anime/${slug}`);
    const data = await response.json();
    const animeData = data.anime;
    const formattedName = animeData.slug.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    currentPlaying.innerHTML += `
      <br><small>
        🗓️ ${animeData.year || "?"} | 📺 ${animeData.media_format || "?"} | 🌸 ${animeData.season || "?"}<br>
        🎬 Anime: ${formattedName}<br><br>
        📝 <em>${animeData.synopsis || 'Sin sinopsis disponible'}</em>
      </small>
    `;
  } catch (error) {
    console.error('Error al obtener detalles del anime:', error);
  }
}
  const t = currentTheme;
  currentPlaying.innerHTML = `<strong>🎵 ${t.Anime} - ${t.Título}</strong><br>`;
  const slug = t.Slug || t.slug || t.Anime.toLowerCase().replace(/\s+/g, '-');

  try {
    const response = await fetch(`https://api.animethemes.moe/anime/${slug}`);
    const data = await response.json();
    const animeData = data.anime;
    currentPlaying.innerHTML += `
      <br><small>
        🗓️ ${animeData.year || "?"} | 📺 ${animeData.media_format || "?"} | 🌸 ${animeData.season || "?"}<br>
        🆔 ${animeData.id} | Slug: <code>${animeData.slug}</code><br>
        📅 Creado: ${animeData.created_at?.split("T")[0]} | Actualizado: ${animeData.updated_at?.split("T")[0]}<br><br>
        📝 <em>${animeData.synopsis || 'Sin sinopsis disponible'}</em>
      </small>
    `;
  } catch (error) {
    console.error('Error al obtener detalles del anime:', error);
  }
}

videoPlayer.addEventListener('ended', playRandomTheme);

videoPlayer.addEventListener('timeupdate', () => {
  if (videoPlayer.duration && videoPlayer.currentTime > (videoPlayer.duration - 10)) {
    if (!nextTheme && !preloadedVideo) {
      prepareNextTheme();
    }
  }
});

function habilitarSonidoAlInteraccion() {
  function activarSonido() {
    videoPlayer.muted = false;
    videoPlayer.volume = 1.0;
    videoPlayer.play();
    document.removeEventListener('click', activarSonido);
  }
  document.addEventListener('click', activarSonido);
}

habilitarSonidoAlInteraccion();
