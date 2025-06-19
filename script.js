const player = document.getElementById('player');
const animeTitle = document.getElementById('anime-title');
let playlist = [];
let index = 0;

async function fetchThemes() {
  try {
    const res = await fetch("https://api.animethemes.moe/v1/anime?include=themes.animethemes.song");
    const json = await res.json();

    playlist = json.data.flatMap(anime => {
      return anime.relationships.themes?.data.map(theme => {
        const title = anime.attributes.name || anime.id;
        const audioUrl = theme.attributes?.mirrors?.[0]?.audio?.['ogg']?.url;
        return audioUrl ? { title, url: audioUrl } : null;
      }).filter(Boolean);
    }).filter(Boolean);

    loadTrack(index);
  } catch (e) {
    animeTitle.textContent = "Error cargando temas.";
    console.error(e);
  }
}

function loadTrack(i) {
  const current = playlist[i];
  if (!current) return;
  player.src = current.url;
  animeTitle.textContent = `Reproduciendo: ${current.title}`;
  player.play();
}

document.getElementById('next').onclick = () => {
  index = (index + 1) % playlist.length;
  loadTrack(index);
};

document.getElementById('prev').onclick = () => {
  index = (index - 1 + playlist.length) % playlist.length;
  loadTrack(index);
};

player.addEventListener('ended', () => {
  index = (index + 1) % playlist.length;
  loadTrack(index);
});

fetchThemes();