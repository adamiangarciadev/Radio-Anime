
let allThemes = [];
const yearSelect = document.getElementById('yearSelect');
const themesList = document.getElementById('themesList');
const videoPlayer = document.getElementById('videoPlayer');
const currentPlaying = document.getElementById('currentPlaying');

fetch('anime_themes_by_year.json')
  .then(response => response.json())
  .then(data => {
    allThemes = data;
    populateYearOptions();
    showThemesByYear(new Date().getFullYear());
  });

function populateYearOptions() {
  const years = [...new Set(allThemes.map(item => item['Año']))].sort((a, b) => a - b);
  yearSelect.innerHTML = years.map(year => 
    `<option value="${year}">${year}</option>`
  ).join('');
  yearSelect.value = new Date().getFullYear();
  yearSelect.addEventListener('change', () => {
    showThemesByYear(parseInt(yearSelect.value));
  });
}

function showThemesByYear(year) {
  const filtered = allThemes.filter(item => item['Año'] === year);
  themesList.innerHTML = filtered.map(item => `
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
