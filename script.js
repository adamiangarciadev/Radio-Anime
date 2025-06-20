
let allThemes = [];
const themesList = document.getElementById('themesList');
const videoPlayer = document.getElementById('videoPlayer');
const currentPlaying = document.getElementById('currentPlaying');

fetch('anime_themes_by_year.json')
  .then(response => response.json())
  .then(data => {
    allThemes = data;
    playRandomTheme();
  });

function playRandomTheme() {
  if (allThemes.length === 0) return;

  const theme = allThemes[Math.floor(Math.random() * allThemes.length)];
  videoPlayer.src = theme.Link;
  currentPlaying.textContent = "🎵 Reproduciendo: " + theme.Anime + " - " + theme.Título;

  themesList.innerHTML = allThemes.map(item => `
    <div class="theme-card">
      <h3>${item.Anime}</h3>
      <p>${item.Título} (${item.Tipo})</p>
      <button onclick="playVideo('${item.Link}', '${item.Anime} - ${item.Título}')">Reproducir</button>
      <a href="${item.Link}" target="_blank"><button>Descargar</button></a>
    </div>
  `).join('');
}

function playVideo(url, title) {
  videoPlayer.src = url;
  currentPlaying.textContent = "🎵 Reproduciendo: " + title;
}
