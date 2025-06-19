// Elementos del DOM
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const themeList = document.getElementById('themeList');
const audioPlayer = document.getElementById('audioPlayer');
const currentTheme = document.getElementById('currentTheme');
const favoritesList = document.getElementById('favoritesList');

// Configuración
const API_CONFIG = {
    BASE_URL: 'https://api.animethemes.moe',
    FAVORITES_STORAGE_KEY: 'anime_radio_favorites'
};

// Estado de la aplicación
let currentAudioUrl = null;
let isPlaying = false;
let favorites = JSON.parse(localStorage.getItem(API_CONFIG.FAVORITES_STORAGE_KEY) || '[]');

// Inicializar

    setupEventListeners();
});

// Configurar event listeners
function setupEventListeners() {
    searchButton.addEventListener('click', searchThemes);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchThemes();
        }
    });

    audioPlayer.addEventListener('play', () => { isPlaying = true; });
    audioPlayer.addEventListener('pause', () => { isPlaying = false; });
}

// Buscar temas
async function searchThemes() {
    const query = searchInput.value.trim();
    if (!query) {
        showError('Por favor, ingresa un nombre de anime para buscar');
        return;
    }

    try {
        showLoading();
        const response = await fetch(`${API_CONFIG.BASE_URL}/anime?filter[search]=${encodeURIComponent(query)}&include=animethemes.animethemeentries.videos`);
        if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
        const data = await response.json();
        if (data && data.data && data.data.length > 0) {
            displayThemes(data);
        } else {
            themeList.innerHTML = '<p>No se encontraron resultados.</p>';
        }
    } catch (error) {
        console.error('Error al buscar temas:', error);
        showError('Hubo un error al buscar los temas. Inténtalo de nuevo más tarde.');
    } finally {
        hideLoading();
    }
}

function displayThemes(data) {
    themeList.innerHTML = '';

    data.data.forEach(anime => {
        const animeTitle = anime.attributes.name;
        const themes = anime.relationships.animethemes?.data || [];

        if (themes.length === 0) return;

        themes.forEach(theme => {
            const themeObj = data.included.find(t => t.id === theme.id && t.type === 'animetheme');
            if (!themeObj || !themeObj.relationships.animethemeentries?.data) return;

            themeObj.relationships.animethemeentries.data.forEach(entry => {
                const entryObj = data.included.find(e => e.id === entry.id && e.type === 'animethemeentry');
                const video = data.included.find(v => v.id === entryObj.relationships.videos.data[0]?.id && v.type === 'video');
                const audioUrl = video?.attributes.link;

                if (audioUrl) {
                    const id = video.id;
                    const title = themeObj.attributes?.title || 'Sin título';
                    const type = themeObj.attributes?.type || 'Desconocido';

                    const html = `
                        <div class="theme-item" data-theme-id="${id}">
                            <h3>${animeTitle}</h3>
                            <p>${title}</p>
                            <p>Tipo: ${type}</p>
                            <button onclick="playTheme('${audioUrl}', '${animeTitle}', '${title}')">Reproducir</button>
                            <button onclick="toggleFavorite('${id}', '${animeTitle}', '${title}', '${audioUrl}')">
                                ${isFavorite(id) ? '❤️' : '♡'}
                            </button>
                        </div>
                    `;
                    themeList.innerHTML += html;
                }
            });
        });
    });
}

function playTheme(audioUrl, anime, title) {
    if (audioUrl && audioUrl !== currentAudioUrl) {
        audioPlayer.src = audioUrl;
        currentAudioUrl = audioUrl;
    }
    if (isPlaying) {
        audioPlayer.pause();
    } else {
        audioPlayer.play();
    }
    currentTheme.textContent = `${anime} - ${title}`;
}

function isFavorite(themeId) {
    return favorites.some(fav => fav.id === themeId);
}

function toggleFavorite(themeId, anime, title, audioUrl) {
    const index = favorites.findIndex(fav => fav.id === themeId);
    if (index === -1) {
        favorites.push({ id: themeId, anime, title, audio_url: audioUrl });
    } else {
        favorites.splice(index, 1);
    }
    localStorage.setItem(API_CONFIG.FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
    loadFavorites();
}

function loadFavorites() {
    if (favorites.length === 0) {
        favoritesList.innerHTML = '<p>No tienes temas favoritos.</p>';
        return;
    }
    favoritesList.innerHTML = favorites.map(fav => `
        <div class="favorite-item">
            <h3>${fav.anime}</h3>
            <p>${fav.title}</p>
            <button class="remove-favorite" onclick="removeFavorite('${fav.id}')">✖</button>
            <button onclick="playTheme('${fav.audio_url}', '${fav.anime}', '${fav.title}')">Reproducir</button>
        </div>
    `).join('');
}

function removeFavorite(themeId) {
    favorites = favorites.filter(fav => fav.id !== themeId);
    localStorage.setItem(API_CONFIG.FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
    loadFavorites();
}

function showLoading() {
    themeList.innerHTML = '<div class="loading">Buscando temas...</div>';
}
function hideLoading() {}
function showError(message) {
    themeList.innerHTML = `<div class="error">Error: ${message}</div>`;
}

// Al cargar, iniciar con un tema aleatorio de la API
async function playRandomTheme() {
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/anime?page[limit]=1&page[offset]=${Math.floor(Math.random() * 1000)}&include=animethemes.animethemeentries.videos`);
        const data = await response.json();
        if (data && data.data && data.data.length > 0) {
            displayThemes(data);
            const anime = data.data[0];
            const animeTitle = anime.attributes.name;
            const theme = anime.relationships.animethemes?.data[0];
            if (!theme) return;
            const themeObj = data.included.find(t => t.id === theme.id && t.type === 'animetheme');
            const entryId = themeObj.relationships.animethemeentries?.data[0]?.id;
            const entryObj = data.included.find(e => e.id === entryId && e.type === 'animethemeentry');
            const videoId = entryObj?.relationships?.videos?.data[0]?.id;
            const video = data.included.find(v => v.id === videoId && v.type === 'video');
            const audioUrl = video?.attributes.link;
            const title = themeObj.attributes.title || 'Sin título';
            if (audioUrl) {
                playTheme(audioUrl, animeTitle, title);
            }
        }
    } catch (err) {
        console.error("Error al cargar tema aleatorio:", err);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadFavorites();
    setupEventListeners();
    playRandomTheme();
});
