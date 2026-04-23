const config = window.API_CONFIG || {};
const API_BASE_URL = config.API_BASE_URL || "https://api.animethemes.moe";
const FAVORITES_KEY = config.FAVORITES_STORAGE_KEY || "anime_radio_favorites";
const PAGE_SIZE = Number(config.PAGE_SIZE || 36);
const SEARCH_ANIME_LIMIT = Number(config.SEARCH_ANIME_LIMIT || 8);
const MAX_VISIBLE_CARDS = Number(config.MAX_VISIBLE_CARDS || 24);

const state = {
  allThemes: [],
  filteredThemes: [],
  currentTheme: null,
  favorites: new Set(),
  search: "",
  year: "",
  type: "all",
  nextPageUrl: null,
  isLoading: false,
  activeSearchToken: 0
};

const elements = {
  video: document.getElementById("videoPlayer"),
  currentPlaying: document.getElementById("currentPlaying"),
  loading: document.getElementById("loading"),
  themesList: document.getElementById("themesList"),
  searchInput: document.getElementById("searchInput"),
  yearInput: document.getElementById("yearInput"),
  typeFilter: document.getElementById("typeFilter"),
  playRandomButton: document.getElementById("playRandomButton"),
  favoriteButton: document.getElementById("favoriteButton"),
  soundButton: document.getElementById("soundButton"),
  loadMoreButton: document.getElementById("loadMoreButton"),
  totalThemes: document.getElementById("totalThemes"),
  visibleThemes: document.getElementById("visibleThemes"),
  favoriteCount: document.getElementById("favoriteCount")
};

init();

async function init() {
  loadFavorites();
  bindEvents();
  await loadThemePage(buildThemePageUrl(1), { replace: true, autoplay: true });
}

function bindEvents() {
  elements.playRandomButton.addEventListener("click", playRandomTheme);
  elements.loadMoreButton.addEventListener("click", () => loadMoreThemes());

  elements.favoriteButton.addEventListener("click", () => {
    if (state.currentTheme) toggleFavorite(state.currentTheme);
  });

  elements.soundButton.addEventListener("click", () => {
    elements.video.muted = false;
    elements.video.volume = 1;
    elements.soundButton.textContent = "Sonido activado";
    elements.soundButton.classList.add("is-active");
    elements.video.play().catch(() => undefined);
  });

  elements.video.addEventListener("ended", playRandomTheme);
  elements.video.addEventListener("error", () => {
    showStatus("Ese video no se pudo reproducir. Buscando otro tema...", true);
    window.setTimeout(playRandomTheme, 900);
  });

  elements.searchInput.addEventListener("input", debounce(async (event) => {
    state.search = event.target.value.trim();
    await refreshRemoteResults();
  }, 450));

  elements.yearInput.addEventListener("input", debounce(async (event) => {
    state.year = event.target.value.trim();
    await refreshRemoteResults();
  }, 450));

  elements.typeFilter.addEventListener("change", (event) => {
    state.type = event.target.value;
    applyFilters();
  });
}

async function refreshRemoteResults() {
  const token = ++state.activeSearchToken;

  if (!state.search && !state.year) {
    await loadThemePage(buildThemePageUrl(1), { replace: true, autoplay: false });
    return;
  }

  if (state.year && !isValidYear(state.year)) {
    showStatus("Ingresa un ano valido de 4 digitos, por ejemplo 2002.", true);
    return;
  }

  const statusParts = [
    state.search && `"${state.search}"`,
    state.year && `ano ${state.year}`
  ].filter(Boolean).join(" y ");
  showStatus(`Buscando ${statusParts} en AnimeThemes...`, false);
  setLoading(true);

  try {
    let themes;

    if (state.search) {
      const searchData = await fetchJson(`${API_BASE_URL}/search?q=${encodeURIComponent(state.search)}`);
      const animeResults = searchData.search?.anime || [];
      const matchingAnime = state.year
        ? animeResults.filter((anime) => String(anime.year) === state.year)
        : animeResults;
      const animeDetails = await Promise.all(
        matchingAnime.slice(0, SEARCH_ANIME_LIMIT).map((anime) => fetchAnimeThemes(anime.slug))
      );
      themes = animeDetails.flat();
    } else {
      const data = await fetchJson(buildAnimeYearPageUrl(1));
      themes = flattenApiAnime(data.anime || []);
      state.nextPageUrl = data.links?.next || null;
    }

    if (token !== state.activeSearchToken) return;

    state.allThemes = uniqueThemes(themes);
    if (state.search) state.nextPageUrl = null;
    clearStatus();
    applyFilters();

    if (state.filteredThemes.length) {
      playTheme(state.filteredThemes[0]);
    } else {
      renderEmptyCurrentTheme();
    }
  } catch (error) {
    if (token === state.activeSearchToken) {
      showStatus(`No pudimos buscar en la API: ${error.message}`, true);
    }
  } finally {
    if (token === state.activeSearchToken) setLoading(false);
  }
}

async function loadThemePage(url, options = {}) {
  const { replace = false, autoplay = false } = options;

  if (!url || state.isLoading) return;

  showStatus("Cargando temas actualizados desde AnimeThemes...", false);
  setLoading(true);

  try {
    const data = await fetchJson(url);
    const themes = data.anime
      ? flattenApiAnime(data.anime)
      : flattenApiThemes(data.animethemes || []);

    state.allThemes = replace ? uniqueThemes(themes) : uniqueThemes([...state.allThemes, ...themes]);
    state.nextPageUrl = data.links?.next || null;
    clearStatus();
    applyFilters();

    if (autoplay && state.filteredThemes.length) {
      playRandomTheme();
    }
  } catch (error) {
    showStatus(`No pudimos cargar temas desde la API: ${error.message}`, true);
  } finally {
    setLoading(false);
  }
}

function loadMoreThemes() {
  if (state.search) {
    showStatus("La busqueda remota ya trajo los primeros resultados. Borra la busqueda para paginar la biblioteca completa.", false);
    return;
  }

  loadThemePage(state.nextPageUrl);
}

async function fetchAnimeThemes(slug) {
  if (!slug) return [];

  const url = `${API_BASE_URL}/anime/${encodeURIComponent(slug)}?include=animethemes.animethemeentries.videos`;
  const data = await fetchJson(url);
  return flattenApiThemes(data.anime?.animethemes || [], data.anime);
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

function buildThemePageUrl(pageNumber) {
  const url = new URL(`${API_BASE_URL}/animetheme`);
  url.searchParams.set("include", "anime,animethemeentries.videos");
  url.searchParams.set("page[size]", String(PAGE_SIZE));
  url.searchParams.set("page[number]", String(pageNumber));
  return url.toString();
}

function buildAnimeYearPageUrl(pageNumber) {
  const url = new URL(`${API_BASE_URL}/anime`);
  url.searchParams.set("filter[year]", state.year);
  url.searchParams.set("include", "animethemes.animethemeentries.videos");
  url.searchParams.set("page[size]", String(PAGE_SIZE));
  url.searchParams.set("page[number]", String(pageNumber));
  return url.toString();
}

function flattenApiAnime(apiAnime) {
  return apiAnime.flatMap((anime) => flattenApiThemes(anime.animethemes || [], anime));
}

function flattenApiThemes(apiThemes, inheritedAnime = null) {
  return apiThemes.flatMap((theme) => {
    const anime = theme.anime || inheritedAnime || {};
    const entries = theme.animethemeentries || [];

    return entries.flatMap((entry) => {
      const videos = entry.videos || [];

      return videos.map((video) => ({
        id: `${theme.id}-${entry.id}-${video.id}`,
        anime: anime.name || "Anime desconocido",
        title: theme.slug || "Tema sin titulo",
        type: theme.type || "Desconocido",
        link: video.link,
        slug: anime.slug || "",
        year: anime.year || "?",
        season: anime.season || "Temporada desconocida",
        format: anime.media_format || "Formato desconocido",
        synopsis: anime.synopsis || "Sin sinopsis disponible.",
        episodes: entry.episodes || "",
        version: entry.version || "",
        resolution: video.resolution ? `${video.resolution}p` : "",
        tags: video.tags || video.source || ""
      }));
    });
  }).filter((theme) => theme.link);
}

function applyFilters() {
  const query = state.search.toLowerCase();

  state.filteredThemes = state.allThemes.filter((theme) => {
    const matchesType = state.type === "all"
      || (state.type === "favorites" && state.favorites.has(theme.link))
      || theme.type.toUpperCase().startsWith(state.type);

    const searchableText = `${theme.anime} ${theme.title} ${theme.type} ${theme.year}`.toLowerCase();
    const matchesSearch = !query || searchableText.includes(query);
    const matchesYear = !state.year || String(theme.year) === state.year;
    return matchesType && matchesSearch && matchesYear;
  });

  updateStats();
  renderThemeCards();
  updateFavoriteButton();
}

function playRandomTheme() {
  if (!state.filteredThemes.length) {
    renderEmptyCurrentTheme();
    return;
  }

  const nextTheme = getRandomTheme(state.currentTheme?.link);
  playTheme(nextTheme);
}

function getRandomTheme(excludeLink) {
  const candidates = state.filteredThemes.filter((theme) => theme.link !== excludeLink);
  const source = candidates.length ? candidates : state.filteredThemes;
  return source[Math.floor(Math.random() * source.length)];
}

function playTheme(theme) {
  state.currentTheme = theme;
  elements.video.src = theme.link;
  clearStatus();
  elements.video.play().catch(() => {
    showStatus("Presiona play o activa el sonido para iniciar la reproduccion.", false);
  });

  renderCurrentTheme();
  updateFavoriteButton();
}

function renderCurrentTheme() {
  const theme = state.currentTheme;
  elements.currentPlaying.replaceChildren();

  const title = document.createElement("h2");
  title.textContent = formatThemeTitle(theme);

  const metaList = document.createElement("dl");
  addMeta(metaList, "Tipo", formatType(theme.type));
  addMeta(metaList, "Ano", String(theme.year));
  addMeta(metaList, "Temporada", theme.season);
  addMeta(metaList, "Formato", theme.format);

  const extra = [theme.episodes && `Eps. ${theme.episodes}`, theme.version && `Version ${theme.version}`, theme.resolution, theme.tags]
    .filter(Boolean)
    .join(" | ");

  const quality = document.createElement("p");
  quality.className = "theme-meta";
  quality.textContent = extra || "Video oficial de AnimeThemes";

  const synopsis = document.createElement("p");
  synopsis.className = "synopsis";
  synopsis.textContent = compactText(theme.synopsis, 320);

  elements.currentPlaying.append(title, metaList, quality, synopsis);
}

function renderEmptyCurrentTheme() {
  elements.currentPlaying.replaceChildren();
  const message = document.createElement("p");
  message.className = "placeholder";
  message.textContent = "No hay temas para los filtros actuales.";
  elements.currentPlaying.append(message);
}

function addMeta(container, label, value) {
  const wrapper = document.createElement("div");
  const term = document.createElement("dt");
  const description = document.createElement("dd");

  term.textContent = label;
  description.textContent = value || "?";
  wrapper.append(term, description);
  container.append(wrapper);
}

function renderThemeCards() {
  elements.themesList.replaceChildren();

  if (!state.filteredThemes.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No encontramos temas con esos filtros.";
    elements.themesList.append(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  state.filteredThemes.slice(0, MAX_VISIBLE_CARDS).forEach((theme) => {
    const card = document.createElement("article");
    card.className = "theme-card";

    const title = document.createElement("h3");
    title.textContent = formatThemeTitle(theme);

    const meta = document.createElement("p");
    meta.className = "theme-meta";
    meta.textContent = `${formatType(theme.type)} | ${theme.year} | ${theme.format} ${theme.resolution ? `| ${theme.resolution}` : ""}`;

    const playButton = document.createElement("button");
    playButton.type = "button";
    playButton.textContent = "Reproducir";
    playButton.addEventListener("click", () => playTheme(theme));

    card.append(title, meta, playButton);
    fragment.append(card);
  });

  elements.themesList.append(fragment);
}

function toggleFavorite(theme) {
  if (state.favorites.has(theme.link)) {
    state.favorites.delete(theme.link);
  } else {
    state.favorites.add(theme.link);
  }

  saveFavorites();
  updateStats();
  updateFavoriteButton();

  if (state.type === "favorites") {
    applyFilters();
  }
}

function updateFavoriteButton() {
  const isFavorite = state.currentTheme && state.favorites.has(state.currentTheme.link);
  elements.favoriteButton.textContent = isFavorite ? "Quitar favorito" : "Guardar favorito";
  elements.favoriteButton.setAttribute("aria-pressed", String(Boolean(isFavorite)));
  elements.favoriteButton.classList.toggle("is-active", Boolean(isFavorite));
}

function updateStats() {
  elements.totalThemes.textContent = state.allThemes.length.toLocaleString("es-AR");
  elements.visibleThemes.textContent = state.filteredThemes.length.toLocaleString("es-AR");
  elements.favoriteCount.textContent = state.favorites.size.toLocaleString("es-AR");
  elements.loadMoreButton.disabled = state.isLoading || Boolean(state.search) || !state.nextPageUrl;
}

function uniqueThemes(themes) {
  const byLink = new Map();
  themes.forEach((theme) => {
    if (!byLink.has(theme.link)) {
      byLink.set(theme.link, theme);
    }
  });
  return [...byLink.values()];
}

function loadFavorites() {
  try {
    const storedFavorites = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
    state.favorites = new Set(Array.isArray(storedFavorites) ? storedFavorites : []);
  } catch {
    state.favorites = new Set();
  }
}

function saveFavorites() {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...state.favorites]));
}

function setLoading(isLoading) {
  state.isLoading = isLoading;
  elements.loadMoreButton.disabled = isLoading || Boolean(state.search) || !state.nextPageUrl;
}

function showStatus(message, isError) {
  elements.loading.hidden = false;
  elements.loading.textContent = message;
  elements.loading.classList.toggle("error", Boolean(isError));
}

function clearStatus() {
  elements.loading.hidden = true;
  elements.loading.textContent = "";
  elements.loading.classList.remove("error");
}

function formatThemeTitle(theme) {
  return `${theme.anime} - ${theme.title}`;
}

function formatType(type) {
  const normalizedType = type.toUpperCase();

  if (normalizedType.startsWith("OP")) return "Opening";
  if (normalizedType.startsWith("ED")) return "Ending";
  return type;
}

function compactText(text, maxLength) {
  const cleanText = String(text).replace(/\s+/g, " ").trim();
  return cleanText.length > maxLength ? `${cleanText.slice(0, maxLength - 1)}...` : cleanText;
}

function debounce(callback, delay) {
  let timeoutId;

  return (...args) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => callback(...args), delay);
  };
}

function isValidYear(year) {
  return /^\d{4}$/.test(year);
}
