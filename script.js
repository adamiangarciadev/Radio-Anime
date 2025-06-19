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
let currentThemeId = null;
let favorites = JSON.parse(localStorage.getItem(API_CONFIG.FAVORITES_STORAGE_KEY) || '[]');

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    loadFavorites();
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
    
    // Actualizar estado de reproducción
    audioPlayer.addEventListener('play', () => {
        isPlaying = true;
    });
    
    audioPlayer.addEventListener('pause', () => {
        isPlaying = false;
    });
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
        
        // Endpoint de búsqueda (ajustar según la API real)
        // Nota: Este endpoint es hipotético, puede que la API real use otra ruta
        const response = await fetch(`${API_CONFIG.BASE_URL}/search?query=${encodeURIComponent(query)}`);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Ajustar según la estructura real de la API
        if (data && data.data) {
            // Asumiendo que data.data es un array de recursos
            displayThemes(data.data);
        } else {
            themeList.innerHTML = '<p>No se encontraron resultados para tu búsqueda.</p>';
        }
    } catch (error) {
        console.error('Error al buscar temas:', error);
        showError('Hubo un error al buscar los temas. Inténtalo de nuevo más tarde.');
    } finally {
        hideLoading();
    }
}

// Mostrar temas en la interfaz
function displayThemes(themes) {
    themeList.innerHTML = themes.map(theme => {
        // Extraer información del tema (ajustar según la estructura real)
        const attributes = theme.attributes || {};
        const id = theme.id || '';
        const anime = attributes.anime || 'Sin nombre';
        const title = attributes.title || 'Sin título';
        const type = attributes.type || 'Desconocido';
        
        // Construir URL de audio (ajustar según la API)
        // Nota: Este formato es hipotético, puede que la API use otro
        const audioUrl = `${API_CONFIG.BASE_URL}/audio/${id}`;
        
        return `
            <div class="theme-item" data-theme-id="${id}">
                <h3>${anime}</h3>
                <p>${title}</p>
                <p>Tipo: ${type}</p>
                <button onclick="playTheme('${audioUrl}')">Reproducir</button>
                <button onclick="toggleFavorite('${id}', '${anime}', '${title}', '${audioUrl}')">
                    ${isFavorite(id) ? '❤️' : '♡'}
                </button>
            </div>
        `;
    }).join('');
}

// Reproducir un tema
function playTheme(audioUrl) {
    if (audioUrl && audioUrl !== currentAudioUrl) {
        audioPlayer.src = audioUrl;
        currentAudioUrl = audioUrl;
    }
    
    if (isPlaying) {
        audioPlayer.pause();
    } else {
        audioPlayer.play();
    }
    
    // Actualizar el texto de "Reproduciendo"
    const themeElement = document.querySelector(`.theme-item[data-theme-id="${currentThemeId}"]`);
    if (themeElement) {
        const anime = themeElement.querySelector('h3').textContent;
        const title = themeElement.querySelector('p').textContent;
        currentTheme.textContent = `${anime} - ${title}`;
    }
}

// Verificar si un tema está en favoritos
function isFavorite(themeId) {
    return favorites.some(fav => fav.id === themeId);
}

// Agregar/eliminar de favoritos
function toggleFavorite(themeId, anime, title, audioUrl) {
    const themeIndex = favorites.findIndex(fav => fav.id === themeId);
    
    if (themeIndex === -1) {
        // Agregar a favoritos
        favorites.push({ id: themeId, anime, title, audio_url: audioUrl });
    } else {
        // Eliminar de favoritos
        favorites.splice(themeIndex, 1);
    }
    
    // Guardar en localStorage
    localStorage.setItem(API_CONFIG.FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
    
    // Actualizar UI
    loadFavorites();
    
    // Actualizar botón en la lista de temas
    const themeElement = document.querySelector(`.theme-item[data-theme-id="${themeId}"]`);
    if (themeElement) {
        const favButton = themeElement.querySelector('button:last-child');
        favButton.textContent = isFavorite(themeId) ? '❤️' : '♡';
    }
}

// Cargar favoritos
function loadFavorites() {
    if (favorites.length === 0) {
        favoritesList.innerHTML = '<p>No tienes temas favoritos.</p>';
        return;
    }
    
    favoritesList.innerHTML = favorites.map(favorite => `
        <div class="favorite-item">
            <h3>${favorite.anime || 'Sin nombre'}</h3>
            <p>${favorite.title || 'Sin título'}</p>
            <button class="remove-favorite" onclick="removeFavorite('${favorite.id}')">✖</button>
            <button onclick="playTheme('${favorite.audio_url}')">Reproducir</button>
        </div>
    `).join('');
}

// Eliminar de favoritos
function removeFavorite(themeId) {
    favorites = favorites.filter(fav => fav.id !== themeId);
    localStorage.setItem(API_CONFIG.FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
    loadFavorites();
}

// Mostrar/ocultar loading
function showLoading() {
    themeList.innerHTML = '<div class="loading">Buscando temas...</div>';
}

function hideLoading() {
    // El contenido se actualiza en displayThemes
}

// Mostrar error
function showError(message) {
    themeList.innerHTML = `<div class="error">Error: ${message}</div>`;
}