/* Radio Anime: static browser application. No credentials or server runtime. */
(() => {
  "use strict";
  const config = window.API_CONFIG || {};
  const API = config.API_BASE_URL || "https://api.animethemes.moe";
  const FAVORITES_KEY = config.FAVORITES_STORAGE_KEY || "anime_radio_favorites";
  const LIBRARY_KEY = "radio_anime_library_v2";
  const HISTORY_KEY = "radio_anime_history_v2";
  const PREFS_KEY = "radio_anime_preferences_v2";
  const FALLBACK = "assets/rooftop.png";
  const PAGE_SIZE = Math.min(50, Math.max(1, Number(config.PAGE_SIZE) || 24));
  const $ = (id) => document.getElementById(id);
  const esc = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const normalize = (value) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const paths = {
    radio: '<path d="M3 9v6m4-11v16m5-13v10m5-15v20m4-13v6"/>',
    compass:
      '<circle cx="12" cy="12" r="9"/><path d="m16 8-2.5 5.5L8 16l2.5-5.5Z"/>',
    heart:
      '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
    history: '<path d="M3 11a9 9 0 1 1 2.7 7M3 4v7h7m2-4v5l3 2"/>',
    headphones:
      '<path d="M3 14v-3a9 9 0 0 1 18 0v3M3 13h4v8H5a2 2 0 0 1-2-2Zm18 0h-4v8h2a2 2 0 0 0 2-2Z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    keyboard:
      '<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M6 9h.1M10 9h.1M14 9h.1M18 9h.1M6 12h.1M10 12h.1M14 12h.1M18 12h.1M7 16h10"/>',
    play: '<path d="m7 4 14 8-14 8Z"/>',
    pause: '<path d="M6 4h4v16H6zm8 0h4v16h-4z"/>',
    next: '<path d="m5 5 10 7-10 7Z"/><path d="M19 5v14"/>',
    previous: '<path d="m19 5-10 7 10 7Z"/><path d="M5 5v14"/>',
    shuffle:
      '<path d="M3 6h3c5 0 7 12 12 12h3m-4-4 4 4-4 4M3 18h3c2 0 4-3 6-6s4-6 6-6h3m-4-4 4 4-4 4"/>',
    repeat:
      '<path d="m17 2 4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4m14-1v2a3 3 0 0 1-3 3H3"/>',
    expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5"/>',
    queue: '<path d="M3 5h14M3 10h14M3 15h8m3 0h8m-4-4v8"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    moon: '<path d="M20.5 13a8.5 8.5 0 0 1-9.5-9.5A8.5 8.5 0 1 0 20.5 13Z"/>',
    volume:
      '<path d="m11 4-6 5H2v6h3l6 5Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
    muted: '<path d="m11 4-6 5H2v6h3l6 5Zm5 5 6 6m0-6-6 6"/>',
    arrowDown: '<path d="M12 3v18m-6-6 6 6 6-6"/>',
    external:
      '<path d="M14 3h7v7m0-7L10 14m-1-9H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>',
    share:
      '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m9 10 6-3m-6 7 6 3"/>',
  };
  const icon = (name) =>
    `<svg viewBox="0 0 24 24" aria-hidden="true" class="${name === "heart" ? "heart-icon" : ""}">${paths[name] || paths.radio}</svg>`;
  document.querySelectorAll("[data-icon]").forEach((node) => {
    node.innerHTML = icon(node.dataset.icon);
  });
  document
    .querySelectorAll("[data-view]")
    .forEach((node) =>
      node.setAttribute(
        "aria-label",
        {
          discover: "Descubrir",
          favorites: "Favoritos",
          history: "Escuchados",
        }[node.dataset.view],
      ),
    );
  const read = (key, fallback) => {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  };
  let storageWarning = false;
  function write(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {
      if (!storageWarning) {
        toast(
          "Tu navegador no permite guardar cambios. Podés seguir escuchando.",
        );
        storageWarning = true;
      }
    }
  }
  function safeURL(value, media = false) {
    try {
      const url = new URL(value);
      return url.protocol === "https:" &&
        (!media ||
          ["v.animethemes.moe", "animethemes.moe"].includes(url.hostname))
        ? url.href
        : "";
    } catch {
      return "";
    }
  }
  const validTrack = (track) =>
    track &&
    typeof track === "object" &&
    typeof track.title === "string" &&
    typeof track.anime === "string" &&
    safeURL(track.link, true);
  const storedTracks = read(LIBRARY_KEY, []);
  const storedHistory = read(HISTORY_KEY, []);
  const storedFavorites = read(FAVORITES_KEY, []);
  const prefs = read(PREFS_KEY, {});
  const state = {
    catalog: [],
    searchResults: null,
    current: null,
    view: "discover",
    query: "",
    type: "all",
    year: "",
    sort: "selection",
    visible: 12,
    favorites: new Set(
      Array.isArray(storedFavorites)
        ? storedFavorites.filter((link) => typeof link === "string")
        : [],
    ),
    saved: new Map(
      (Array.isArray(storedTracks) ? storedTracks : [])
        .filter(validTrack)
        .map((t) => [t.link, t]),
    ),
    history: (Array.isArray(storedHistory) ? storedHistory : [])
      .filter(validTrack)
      .slice(0, 40),
    queue: [],
    backStack: [],
    shuffle: prefs?.shuffle !== false,
    repeat: false,
    loading: false,
    controller: null,
    token: 0,
    nextPage: null,
    remoteStarted: false,
    retry: null,
    sleepAt: 0,
    playToken: 0,
    hasPlayed: false,
  };
  const video = $("videoPlayer");
  video.volume = Number.isFinite(prefs?.volume)
    ? Math.min(1, Math.max(0, prefs.volume))
    : 0.7;
  $("volumeInput").value = video.volume;
  const updatePrefs = () =>
    write(PREFS_KEY, { volume: video.volume, shuffle: state.shuffle });
  const typeLabel = (type) =>
    type === "OP" ? "Opening" : type === "ED" ? "Ending" : type;
  const time = (seconds) =>
    Number.isFinite(seconds)
      ? `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`
      : "0:00";
  let toastTimer;
  function toast(message) {
    clearTimeout(toastTimer);
    $("toast").textContent = message;
    $("toast").hidden = false;
    toastTimer = setTimeout(() => {
      $("toast").hidden = true;
    }, 4000);
  }
  function status(message = "", retry = null) {
    $("statusBox").hidden = !message;
    $("statusText").textContent = message;
    $("retryButton").hidden = !retry;
    state.retry = retry;
  }
  function flatten(themes, inherited = null) {
    return themes.flatMap((theme) => {
      const anime = theme.anime || inherited || {};
      const entries = (theme.animethemeentries || []).filter(
        (entry) => !entry.nsfw && !entry.spoiler,
      );
      const entry = entries.find((e) => (e.videos || []).length) || null;
      if (!entry) return [];
      const videos = [...(entry.videos || [])].filter((v) =>
        safeURL(v.link, true),
      );
      // Prefer 720p to keep streaming practical on mobile connections.
      videos.sort(
        (a, b) =>
          Math.abs((a.resolution || 720) - 720) -
            Math.abs((b.resolution || 720) - 720) ||
          Number(b.nc) - Number(a.nc),
      );
      if (!videos.length) return [];
      const image =
        (anime.images || []).find((i) => i.facet === "Large Cover") ||
        (anime.images || [])[0];
      return [
        {
          id: String(theme.id),
          anime: anime.name || "Anime",
          title: theme.song?.title || theme.slug || "Tema",
          artist: (theme.song?.artists || [])
            .map((a) => a.name)
            .filter(Boolean)
            .join(", "),
          type: theme.type || "OP",
          slug: anime.slug || "",
          year: anime.year || "",
          link: videos[0].link,
          alternatives: videos.slice(1).map((v) => v.link),
          cover: safeURL(image?.link) || FALLBACK,
          resolution: videos[0].resolution || "",
          themeSlug: theme.slug || "",
          source: `https://animethemes.moe/anime/${encodeURIComponent(anime.slug || "")}`,
        },
      ];
    });
  }
  const unique = (tracks) => [
    ...new Map(tracks.map((track) => [track.id || track.link, track])).values(),
  ];
  function mergeCatalog(tracks) {
    state.catalog = unique([...state.catalog, ...tracks]);
    let migrated = false;
    for (const track of tracks) {
      const legacyLink = [track.link, ...(track.alternatives || [])].find(
        (link) => state.favorites.has(link),
      );
      if (legacyLink) {
        state.saved.set(legacyLink, { ...track, link: legacyLink });
        migrated = true;
      }
    }
    if (migrated) write(LIBRARY_KEY, [...state.saved.values()]);
  }
  async function fetchJSON(url, signal) {
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    if (signal?.aborted) controller.abort();
    else signal?.addEventListener("abort", onAbort, { once: true });
    const timer = setTimeout(() => controller.abort(), 18000);
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    }
  }
  function pageURL(page = 1) {
    const yearQuery = /^\d{4}$/.test(state.year);
    const url = new URL(`${API}/${yearQuery ? "anime" : "animetheme"}`);
    url.searchParams.set(
      "include",
      yearQuery
        ? "images,animethemes.song.artists,animethemes.animethemeentries.videos"
        : "anime.images,song.artists,animethemeentries.videos",
    );
    url.searchParams.set("page[size]", String(PAGE_SIZE));
    url.searchParams.set("page[number]", String(page));
    if (yearQuery) url.searchParams.set("filter[year]", state.year);
    return url.href;
  }
  function getTracks() {
    let tracks =
      state.view === "favorites"
        ? [...state.saved.values()].filter((t) => state.favorites.has(t.link))
        : state.view === "history"
          ? state.history
          : (state.searchResults ?? state.catalog);
    const query = normalize(state.query);
    tracks = tracks.filter(
      (t) =>
        (state.type === "all" || t.type === state.type) &&
        (!state.year ||
          (state.year === "classic"
            ? Number(t.year) < 2010 && Number(t.year) > 0
            : String(t.year) === state.year)) &&
        (!query ||
          (state.view === "discover" && state.searchResults !== null) ||
          normalize(`${t.anime} ${t.title} ${t.artist}`).includes(query)),
    );
    if (state.sort === "newest")
      tracks = [...tracks].sort((a, b) => Number(b.year) - Number(a.year));
    if (state.sort === "az")
      tracks = [...tracks].sort((a, b) => a.anime.localeCompare(b.anime, "es"));
    return tracks;
  }
  function coverHTML(track, lazy = true) {
    return `<img src="${esc(safeURL(track.cover) || (track.cover?.startsWith("assets/") ? track.cover : FALLBACK))}" alt="" width="160" height="170" ${lazy ? 'loading="lazy"' : ""} decoding="async">`;
  }
  function actionButton(action, track, name, label, pressed) {
    return `<button class="icon-button" data-action="${action}" data-link="${esc(track.link)}" aria-label="${esc(label)}" title="${esc(label)}" ${pressed !== undefined ? `aria-pressed="${pressed}"` : ""}>${icon(name)}</button>`;
  }
  function renderFeatured() {
    const order = [
      "chainsaw_man",
      "sousou_no_frieren",
      "shingeki_no_kyojin",
      "cowboy_bebop",
      "kimetsu_no_yaiba",
      "bocchi_the_rock",
    ];
    const chosen = order
      .map((slug) =>
        state.catalog.find((t) => t.slug === slug && t.type === "OP"),
      )
      .filter(Boolean);
    $("featuredGrid").innerHTML = chosen
      .map(
        (t) =>
          `<button class="featured-card" data-action="play" data-link="${esc(t.link)}" aria-label="Escuchar ${esc(t.title)} de ${esc(t.anime)}"><div class="cover-wrap">${coverHTML(t, false)}<span class="cover-tag">${esc(t.year)}</span><span class="cover-play">${icon("play")}</span></div><h3>${esc(t.anime)}</h3><p>${esc(t.title)}</p></button>`,
      )
      .join("");
  }
  function rowHTML(t, index, queue = false) {
    const liked = state.favorites.has(t.link);
    return `<article class="theme-row ${state.current?.link === t.link ? "current" : ""}">${queue ? "" : `<span class="row-number">${String(index + 1).padStart(2, "0")}</span>`}<button class="row-main" data-action="${queue ? "queuePlay" : "play"}" data-index="${index}" data-link="${esc(t.link)}" aria-label="Escuchar ${esc(t.title)} de ${esc(t.anime)}">${coverHTML(t)}<span class="row-copy"><span class="row-title">${esc(t.title)}</span><span class="row-subtitle">${esc(t.anime)}${t.artist ? ` · ${esc(t.artist)}` : ""}</span></span></button>${queue ? "" : `<span class="type-badge ${t.type === "OP" ? "opening" : ""}">${esc(typeLabel(t.type))}</span><span class="row-year">${esc(t.year)}</span>`}<div class="row-actions">${queue ? `<button class="icon-button" data-action="removeQueue" data-index="${index}" aria-label="Quitar ${esc(t.title)} de la cola">${icon("close")}</button>` : actionButton("favorite", t, "heart", `${liked ? "Quitar de" : "Guardar en"} favoritos: ${t.title}`, liked) + actionButton("queue", t, "plus", `Agregar a la cola: ${t.title}`)}</div></article>`;
  }
  function render() {
    const tracks = getTracks();
    $("themesList").setAttribute("aria-busy", String(state.loading));
    $("themesList").innerHTML =
      tracks
        .slice(0, state.visible)
        .map((t, i) => rowHTML(t, i))
        .join("") ||
      `<div class="empty-state"><h3>${state.view === "favorites" ? "Los temas que te quedan, quedan acá." : state.view === "history" ? "Tu recorrido empieza con un play." : "Todavía no encontramos ese tema."}</h3><p>${state.view === "favorites" ? "Tocá el corazón de una canción para guardarla en este navegador." : state.view === "history" ? "Acá vas a encontrar los últimos temas que escuchaste." : state.loading ? "Estamos buscando en AnimeThemes…" : "Probá con otro nombre o quitá los filtros para explorar la selección."}</p><button class="secondary-button" data-action="reset">Volver a descubrir</button></div>`;
    $("favoriteCount").textContent = state.favorites.size;
    const shown = Math.min(state.visible, tracks.length);
    $("resultCount").textContent =
      `${shown} de ${tracks.length} temas${state.query ? " encontrados" : " en esta selección"}`;
    const hasLocalMore = tracks.length > state.visible;
    const canRemote =
      state.view === "discover" &&
      !state.query &&
      (!state.remoteStarted || state.nextPage);
    $("loadMoreButton").hidden = !hasLocalMore && !canRemote;
    $("loadMoreButton").disabled = state.loading;
    $("loadMoreButton").innerHTML = state.loading
      ? "Buscando temas…"
      : `${hasLocalMore ? "Mostrar más" : "Explorar más temas"}${icon("arrowDown")}`;
    document.querySelectorAll("[data-filter]").forEach((b) => {
      const active = b.dataset.filter === state.type;
      b.classList.toggle("selected", active);
      b.setAttribute("aria-pressed", active);
    });
    document.querySelectorAll("[data-view]").forEach((b) => {
      const active = b.dataset.view === state.view;
      b.classList.toggle("active", active);
      if (active) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    });
    $("discoveryIntro").hidden = state.view !== "discover" || !!state.query;
    $("featuredSection").hidden = state.view !== "discover" || !!state.query;
    $("libraryTitle").textContent = state.query
      ? `Resultados para “${state.query}”`
      : state.view === "favorites"
        ? "Tu colección personal"
        : state.view === "history"
          ? "Lo que venís escuchando"
          : "Encontrá tu próximo replay";
    $("libraryDescription").textContent =
      state.view === "favorites"
        ? "Tus favoritos, guardados en este navegador."
        : state.view === "history"
          ? "Volvé a ese tema que no te podés sacar de la cabeza."
          : state.query
            ? "Anime, canciones y artistas. Una conexión lleva a otra."
            : "Explorá, guardá y dejá que un tema te lleve al siguiente.";
    $("shuffleLibrary").disabled = !tracks.length;
    updateFavorite();
  }
  function findTrack(link) {
    return [
      ...state.catalog,
      ...state.saved.values(),
      ...state.history,
      ...state.queue,
      ...(state.searchResults || []),
    ].find((t) => t.link === link);
  }
  function updateFavorite() {
    const liked = !!state.current && state.favorites.has(state.current.link);
    $("favoriteButton").setAttribute("aria-pressed", liked);
    $("favoriteButton").setAttribute(
      "aria-label",
      liked ? "Quitar favorito" : "Guardar favorito",
    );
    $("favoriteButton").disabled = !state.current;
  }
  function toggleFavorite(track) {
    if (!track) return;
    if (state.favorites.has(track.link)) {
      state.favorites.delete(track.link);
      state.saved.delete(track.link);
      toast("Tema quitado de favoritos.");
    } else {
      state.favorites.add(track.link);
      state.saved.set(track.link, track);
      toast("Guardado en tus favoritos.");
    }
    write(FAVORITES_KEY, [...state.favorites]);
    write(LIBRARY_KEY, [...state.saved.values()]);
    render();
  }
  function updatePlaying() {
    const playing = !video.paused && !video.ended;
    document.body.classList.toggle("is-playing", playing);
    $("playButton").innerHTML = icon(playing ? "pause" : "play");
    $("playButton").setAttribute(
      "aria-label",
      playing ? "Pausar" : "Reproducir",
    );
    $("videoPlay").hidden = playing;
    $("playState").textContent = playing ? "Sonando" : "En pausa";
    if ("mediaSession" in navigator)
      navigator.mediaSession.playbackState = playing ? "playing" : "paused";
  }
  function updateTrackUI() {
    const t = state.current;
    if (!t) return;
    $("studioAnime").textContent = t.anime;
    $("studioSong").textContent = t.title;
    $("studioMeta").textContent =
      `${typeLabel(t.type)} · ${t.year}${t.resolution ? ` · ${t.resolution}p` : ""}`;
    $("dockTitle").textContent = t.title;
    $("dockSubtitle").textContent = t.artist || t.anime;
    $("dockTitle").title = `${t.title} — ${t.anime}`;
    $("dockArtwork").src =
      safeURL(t.cover) || (t.cover?.startsWith("assets/") ? t.cover : FALLBACK);
    $("cinemaTitle").textContent = t.title;
    $("cinemaSubtitle").textContent =
      `${t.anime} · ${typeLabel(t.type)} · ${t.year}`;
    video.poster = $("dockArtwork").src;
    if ("mediaSession" in navigator && "MediaMetadata" in window) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: t.title,
        artist: t.artist || t.anime,
        album: t.anime,
        artwork: [{ src: new URL($("dockArtwork").src, location.href).href }],
      });
    }
    render();
  }
  function recordListening() {
    if (!state.current) return;
    state.hasPlayed = true;
    state.history = [
      state.current,
      ...state.history.filter((t) => t.link !== state.current.link),
    ].slice(0, 40);
    write(HISTORY_KEY, state.history);
    if (state.view === "history") render();
  }
  async function playCurrent() {
    if (!state.current) {
      const track = getTracks()[0] || state.catalog[0];
      if (track) selectTrack(track);
      else toast("Todavía no hay temas disponibles. Reintentá la carga.");
      return;
    }
    const token = ++state.playToken;
    $("studioMessage").textContent = "Conectando con el tema…";
    $("playState").textContent = "Cargando";
    if (!video.getAttribute("src")) video.src = state.current.link;
    try {
      await video.play();
      if (token !== state.playToken) return;
      $("studioMessage").textContent = "Dejá que la música siga.";
    } catch (error) {
      if (token !== state.playToken || error.name === "AbortError") return;
      $("studioMessage").textContent = "No se pudo iniciar. Probá otro tema.";
      toast(
        error.name === "NotAllowedError"
          ? "Tocá el botón de reproducción para iniciar el audio."
          : "Este video no está disponible. Podés elegir otro tema.",
      );
      updatePlaying();
    }
  }
  function selectTrack(track, { autoplay = true, remember = true } = {}) {
    if (!track || !safeURL(track.link, true)) return;
    if (state.current?.link === track.link) {
      if (autoplay) playCurrent();
      return;
    }
    state.playToken++;
    if (remember && state.current && state.hasPlayed)
      state.backStack.push(state.current);
    state.backStack = state.backStack.slice(-40);
    video.pause();
    video.removeAttribute("src");
    video.load();
    state.current = track;
    state.hasPlayed = false;
    $("elapsed").textContent = "0:00";
    $("duration").textContent = "0:00";
    $("seekInput").value = 0;
    $("seekInput").style.setProperty("--progress", "0%");
    $("seekInput").disabled = true;
    updateTrackUI();
    $("studioMessage").textContent = "Dale play cuando quieras.";
    if (autoplay) playCurrent();
  }
  function togglePlayback() {
    if (video.paused) playCurrent();
    else {
      state.playToken++;
      video.pause();
    }
  }
  function nextTrack(forceRandom = false) {
    if (state.queue.length && !forceRandom) {
      const next = state.queue.shift();
      renderQueue();
      selectTrack(next);
      return;
    }
    const tracks = getTracks();
    if (!tracks.length) {
      toast("No hay temas para estos filtros.");
      return;
    }
    const currentIndex = tracks.findIndex(
      (t) => t.link === state.current?.link,
    );
    let next;
    if (state.shuffle || forceRandom) {
      const candidates = tracks.filter((t) => t.link !== state.current?.link);
      const pool = candidates.length ? candidates : tracks;
      next = pool[Math.floor(Math.random() * pool.length)];
    } else next = tracks[(currentIndex + 1) % tracks.length];
    selectTrack(next);
  }
  function previousTrack() {
    if (video.currentTime > 3) {
      video.currentTime = 0;
      return;
    }
    const previous = state.backStack.pop();
    if (previous) selectTrack(previous, { remember: false });
    else if (state.current) {
      video.currentTime = 0;
      playCurrent();
    }
  }
  function renderQueue() {
    $("queueList").innerHTML = state.queue.length
      ? state.queue.map((t, i) => rowHTML(t, i, true)).join("")
      : '<div class="empty-state"><h3>Hay lugar para otro tema.</h3><p>Usá el botón + junto a una canción. Va a sonar después del tema actual.</p></div>';
    $("queueBadge").textContent = state.queue.length;
    $("queueBadge").hidden = !state.queue.length;
    $("clearQueueButton").disabled = !state.queue.length;
  }
  function cancelRequests() {
    state.controller?.abort();
    state.controller = null;
    state.token++;
    state.loading = false;
  }
  function resetView(view = "discover") {
    cancelRequests();
    state.view = view;
    state.query = "";
    state.year = "";
    state.type = "all";
    state.sort = "selection";
    state.visible = 12;
    state.searchResults = null;
    state.nextPage = null;
    state.remoteStarted = false;
    $("searchInput").value = "";
    $("yearInput").value = "";
    $("sortInput").value = "selection";
    status();
    render();
  }
  function localMatches(query) {
    const q = normalize(query);
    return state.catalog.filter((t) =>
      normalize(`${t.anime} ${t.title} ${t.artist}`).includes(q),
    );
  }
  async function searchRemote() {
    cancelRequests();
    const query = state.query;
    if (!query || state.view !== "discover") {
      state.searchResults = null;
      status();
      render();
      return;
    }
    const token = state.token;
    const controller = new AbortController();
    state.controller = controller;
    state.loading = true;
    state.searchResults = localMatches(query);
    status("Buscando en AnimeThemes…");
    render();
    try {
      const data = await fetchJSON(
        `${API}/search?q=${encodeURIComponent(query)}`,
        controller.signal,
      );
      const animeResults = (data.search?.anime || []).slice(0, 5);
      const themeResults = (data.search?.animethemes || []).slice(0, 5);
      const jobs = [
        ...animeResults.map((a) => ({ kind: "anime", id: a.slug })),
        ...themeResults.map((t) => ({ kind: "theme", id: t.id })),
      ];
      const found = [];
      let failed = 0;
      let cursor = 0;
      await Promise.all(
        Array.from({ length: Math.min(3, jobs.length) }, async () => {
          while (cursor < jobs.length && !controller.signal.aborted) {
            const job = jobs[cursor++];
            try {
              const item = await fetchJSON(
                job.kind === "anime"
                  ? `${API}/anime/${encodeURIComponent(job.id)}?include=images,animethemes.song.artists,animethemes.animethemeentries.videos`
                  : `${API}/animetheme/${encodeURIComponent(job.id)}?include=anime.images,song.artists,animethemeentries.videos`,
                controller.signal,
              );
              found.push(
                ...(job.kind === "anime"
                  ? flatten(item.anime?.animethemes || [], item.anime)
                  : flatten(item.animetheme ? [item.animetheme] : [])),
              );
            } catch {
              failed++;
            }
          }
        }),
      );
      if (token !== state.token) return;
      mergeCatalog(found);
      state.searchResults = unique([...localMatches(query), ...found]);
      status(
        failed
          ? "Parte del catálogo no respondió. Mostramos los resultados disponibles."
          : "",
        failed ? searchRemote : null,
      );
    } catch {
      if (token !== state.token) return;
      status(
        "No pudimos conectar con AnimeThemes. Mostramos las coincidencias guardadas.",
        searchRemote,
      );
    } finally {
      if (token === state.token) {
        state.loading = false;
        render();
      }
    }
  }
  async function loadMore() {
    const tracks = getTracks();
    if (tracks.length > state.visible) {
      state.visible += 24;
      render();
      return;
    }
    if (state.loading || state.query || state.view !== "discover") return;
    cancelRequests();
    const token = state.token;
    state.controller = new AbortController();
    state.loading = true;
    status("Explorando el catálogo de AnimeThemes…");
    render();
    try {
      const requestedURL = state.nextPage || pageURL();
      // Pagination links are only allowed to target the configured API origin.
      if (new URL(requestedURL).origin !== new URL(API).origin)
        throw new Error("Invalid pagination");
      const data = await fetchJSON(requestedURL, state.controller.signal);
      if (token !== state.token) return;
      mergeCatalog(
        data.anime
          ? data.anime.flatMap((a) => flatten(a.animethemes || [], a))
          : flatten(data.animethemes || []),
      );
      state.nextPage = data.links?.next || null;
      state.remoteStarted = true;
      state.visible += 24;
      status();
      if (!getTracks().length && state.nextPage)
        status(
          "Esta página no tiene temas con esos filtros. Podés explorar la siguiente.",
        );
    } catch {
      if (token === state.token)
        status(
          "AnimeThemes no respondió. Tu selección y tus favoritos siguen disponibles.",
          loadMore,
        );
    } finally {
      if (token === state.token) {
        state.loading = false;
        render();
      }
    }
  }
  function openCinema() {
    if (!state.current) return;
    const playing = !video.paused;
    // Move the same player: no second media stream or duplicate audio.
    $("cinemaStage").append(video);
    video.controls = true;
    $("cinemaDialog").showModal();
    if (playing) video.play().catch(() => {});
  }
  $("cinemaDialog").addEventListener("close", () => {
    const playing = !video.paused;
    $("videoHome").prepend(video);
    video.controls = false;
    if (playing) video.play().catch(() => {});
  });
  function showInfo(title, html) {
    $("infoTitle").textContent = title;
    $("infoContent").innerHTML = html;
    $("infoDialog").showModal();
  }
  function showAbout() {
    showInfo(
      "Hecha para escuchar.",
      '<p>Radio Anime es un proyecto independiente para descubrir openings y endings. Los metadatos, las portadas y los videos provienen de <a href="https://animethemes.moe" target="_blank" rel="noopener noreferrer">AnimeThemes</a>. Los derechos de las obras pertenecen a sus titulares.</p><p>La selección inicial está guardada para que puedas explorar sin esperar. Para reproducir videos y buscar nuevos temas necesitás conexión. La disponibilidad depende de AnimeThemes y del navegador.</p><h3>Tu colección es tuya.</h3><p>Favoritos, volumen e historial se guardan únicamente en este navegador. No necesitás una cuenta. La cola dura esta sesión.</p><p>Arte de portada original generado para Radio Anime. Tipografía Manrope, SIL Open Font License.</p><button class="secondary-button" id="infoHelp">Ver atajos y temporizador</button>',
    );
    $("infoHelp").onclick = () => {
      $("infoDialog").close();
      showHelp();
    };
  }
  function showHelp() {
    showInfo(
      "A un toque de tu música.",
      '<div class="shortcut-row"><span>Reproducir / pausar</span><kbd>Espacio</kbd></div><div class="shortcut-row"><span>Siguiente tema</span><kbd>N</kbd></div><div class="shortcut-row"><span>Guardar favorito</span><kbd>F</kbd></div><div class="shortcut-row"><span>Buscar</span><kbd>/</kbd></div><div class="shortcut-row"><span>Modo cine</span><kbd>C</kbd></div><div class="shortcut-row"><span>Cerrar panel</span><kbd>Esc</kbd></div><p>Los atajos se desactivan mientras escribís o usás un control.</p><button class="secondary-button" id="infoSleep">Temporizador de apagado</button>',
    );
    $("infoSleep").onclick = () => {
      $("infoDialog").close();
      showSleep();
    };
  }
  function showSleep() {
    const remaining = state.sleepAt
      ? Math.max(0, Math.ceil((state.sleepAt - Date.now()) / 60000))
      : 0;
    showInfo(
      "Un último tema…",
      `<p>${remaining ? `La radio se pausa en ${remaining} minutos.` : "Elegí cuándo querés que la radio se pause."}</p><div class="sleep-options">${[15, 30, 60].map((n) => `<button data-sleep="${n}">${n} minutos</button>`).join("")}<button data-sleep="0">Sin temporizador</button></div>`,
    );
  }
  function checkSleep() {
    if (state.sleepAt && Date.now() >= state.sleepAt) {
      state.sleepAt = 0;
      state.playToken++;
      video.pause();
      $("sleepButton").classList.remove("active");
      toast("Hora de descansar. La radio quedó en pausa.");
    }
  }
  let searchTimer;
  $("searchInput").addEventListener("input", () => {
    clearTimeout(searchTimer);
    cancelRequests();
    state.query = $("searchInput").value.trim();
    state.visible = 12;
    state.searchResults = null;
    status();
    render();
    searchTimer = setTimeout(searchRemote, 450);
  });
  $("yearInput").addEventListener("change", () => {
    cancelRequests();
    state.year = $("yearInput").value;
    state.nextPage = null;
    state.remoteStarted = false;
    state.visible = 12;
    status();
    render();
    if (state.query && state.view === "discover") searchRemote();
    else if (state.view === "discover" && !getTracks().length) loadMore();
  });
  $("sortInput").addEventListener("change", () => {
    state.sort = $("sortInput").value;
    render();
  });
  document.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.dataset.view) {
      clearTimeout(searchTimer);
      resetView(button.dataset.view);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    if (button.dataset.filter) {
      state.type = button.dataset.filter;
      state.visible = 12;
      render();
    }
    if (button.dataset.mix) {
      resetView();
      state.type = ["OP", "ED"].includes(button.dataset.mix)
        ? button.dataset.mix
        : "all";
      state.year = button.dataset.mix === "classic" ? "classic" : "";
      $("yearInput").value = state.year;
      render();
      $("library").scrollIntoView({ behavior: "smooth" });
    }
    if (button.dataset.close) $(button.dataset.close).close();
    if (button.dataset.sleep !== undefined) {
      const minutes = Number(button.dataset.sleep);
      state.sleepAt = minutes ? Date.now() + minutes * 60000 : 0;
      $("sleepButton").classList.toggle("active", !!minutes);
      $("infoDialog").close();
      toast(
        minutes
          ? `La radio se pausa en ${minutes} minutos.`
          : "Temporizador desactivado.",
      );
    }
    const action = button.dataset.action;
    if (!action) return;
    const track = findTrack(button.dataset.link);
    if (action === "play") selectTrack(track);
    if (action === "favorite") toggleFavorite(track);
    if (action === "queue" && track) {
      state.queue.push(track);
      renderQueue();
      toast(`En la cola: ${track.title}`);
    }
    if (action === "removeQueue") {
      state.queue.splice(Number(button.dataset.index), 1);
      renderQueue();
    }
    if (action === "queuePlay") {
      const next = state.queue.splice(Number(button.dataset.index), 1)[0];
      renderQueue();
      selectTrack(next);
    }
    if (action === "reset") resetView();
  });
  document.addEventListener(
    "error",
    (event) => {
      if (
        event.target.tagName === "IMG" &&
        !event.target.src.endsWith("/assets/rooftop.png")
      )
        event.target.src = FALLBACK;
    },
    true,
  );
  document.querySelector(".brand").addEventListener("click", (event) => {
    event.preventDefault();
    resetView();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  $("radioButton").onclick = () => nextTrack(true);
  $("shuffleLibrary").onclick = () => nextTrack(true);
  $("playButton").onclick = togglePlayback;
  $("videoPlay").onclick = togglePlayback;
  $("favoriteButton").onclick = () => toggleFavorite(state.current);
  $("nextButton").onclick = () => nextTrack();
  $("cinemaNext").onclick = () => nextTrack();
  $("previousButton").onclick = previousTrack;
  $("shuffleButton").onclick = () => {
    state.shuffle = !state.shuffle;
    $("shuffleButton").setAttribute("aria-pressed", state.shuffle);
    $("shuffleButton").classList.toggle("active", state.shuffle);
    updatePrefs();
    toast(
      state.shuffle
        ? "Reproducción aleatoria activada."
        : "Los temas van a sonar en orden.",
    );
  };
  $("repeatButton").onclick = () => {
    state.repeat = !state.repeat;
    $("repeatButton").setAttribute("aria-pressed", state.repeat);
    toast(state.repeat ? "Este tema se repite." : "Repetición desactivada.");
  };
  $("shuffleButton").setAttribute("aria-pressed", state.shuffle);
  $("shuffleButton").classList.toggle("active", state.shuffle);
  $("loadMoreButton").onclick = loadMore;
  $("retryButton").onclick = () => state.retry?.();
  $("cinemaButton").onclick = openCinema;
  $("dockArtworkButton").onclick = openCinema;
  $("queueButton").onclick = () => {
    renderQueue();
    $("queueDialog").showModal();
  };
  $("clearQueueButton").onclick = () => {
    state.queue = [];
    renderQueue();
  };
  $("aboutButton").onclick = showAbout;
  $("helpButton").onclick = showHelp;
  $("sleepButton").onclick = showSleep;
  $("footerAbout").onclick = showAbout;
  $("volumeInput").addEventListener("input", () => {
    video.volume = Number($("volumeInput").value);
    video.muted = false;
    updatePrefs();
  });
  $("muteButton").onclick = () => {
    video.muted = !video.muted;
  };
  video.addEventListener("volumechange", () => {
    $("volumeInput").value = video.volume;
    $("volumeInput").style.setProperty(
      "--progress",
      `${video.muted ? 0 : video.volume * 100}%`,
    );
    $("muteButton").innerHTML = icon(
      video.muted || !video.volume ? "muted" : "volume",
    );
    $("muteButton").setAttribute(
      "aria-label",
      video.muted ? "Activar sonido" : "Silenciar",
    );
  });
  $("volumeInput").style.setProperty("--progress", `${video.volume * 100}%`);
  $("seekInput").addEventListener("input", () => {
    if (Number.isFinite(video.duration))
      video.currentTime = (Number($("seekInput").value) / 100) * video.duration;
  });
  function updateTime() {
    const valid = Number.isFinite(video.duration) && video.duration > 0;
    const progress = valid ? (video.currentTime / video.duration) * 100 : 0;
    $("seekInput").disabled = !valid;
    $("seekInput").value = progress;
    $("seekInput").style.setProperty("--progress", `${progress}%`);
    $("seekInput").setAttribute(
      "aria-valuetext",
      `${time(video.currentTime)} de ${time(video.duration)}`,
    );
    $("elapsed").textContent = time(video.currentTime);
    $("duration").textContent = time(video.duration);
    checkSleep();
  }
  video.addEventListener("timeupdate", updateTime);
  video.addEventListener("loadedmetadata", updateTime);
  video.addEventListener("playing", () => {
    updatePlaying();
    recordListening();
    $("studioMessage").textContent = "Dejá que la música siga.";
  });
  video.addEventListener("pause", updatePlaying);
  video.addEventListener("waiting", () => {
    if (!video.paused) {
      $("playState").textContent = "Cargando";
      $("studioMessage").textContent = "Esperando el video…";
    }
  });
  video.addEventListener("ended", () => {
    if (state.repeat) {
      video.currentTime = 0;
      playCurrent();
    } else nextTrack();
  });
  video.addEventListener("error", () => {
    if (!video.getAttribute("src")) return;
    updatePlaying();
    $("playState").textContent = "No disponible";
    $("studioMessage").textContent = "Elegí otro tema para seguir.";
    toast("El proveedor no pudo reproducir este video. Probá otro tema.");
  });
  document.addEventListener("keydown", (event) => {
    if (
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.repeat ||
      event.target.closest(
        'input,textarea,select,button,a,[contenteditable="true"]',
      ) ||
      document.querySelector("dialog[open]")
    )
      return;
    const key = event.key.toLowerCase();
    if ([" ", "n", "f", "c", "/"].includes(key)) event.preventDefault();
    if (key === " ") togglePlayback();
    if (key === "n") nextTrack();
    if (key === "f") toggleFavorite(state.current);
    if (key === "c") openCinema();
    if (key === "/") $("searchInput").focus();
  });
  $("shareButton").onclick = async () => {
    if (!state.current) return;
    const url = new URL(location.href);
    url.hash = "";
    url.search = "";
    url.searchParams.set("anime", state.current.slug);
    url.searchParams.set("theme", state.current.id);
    try {
      if (navigator.share)
        await navigator.share({
          title: `${state.current.title} — Radio Anime`,
          url: url.href,
        });
      else {
        await navigator.clipboard.writeText(url.href);
        toast("Enlace del tema copiado.");
      }
    } catch (error) {
      if (error.name !== "AbortError")
        toast("No se pudo compartir. Probá desde la barra de direcciones.");
    }
  };
  if ("mediaSession" in navigator)
    for (const [action, handler] of Object.entries({
      play: playCurrent,
      pause: () => video.pause(),
      previoustrack: previousTrack,
      nexttrack: () => nextTrack(),
      seekto: (details) => {
        if (Number.isFinite(details.seekTime))
          video.currentTime = details.seekTime;
      },
    })) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {}
    }
  setInterval(checkSleep, 1000);
  document.addEventListener("visibilitychange", checkSleep);
  window.addEventListener("offline", () =>
    toast("Sin conexión. Podés explorar tus temas guardados."),
  );
  window.addEventListener("online", () => toast("Volviste a conectarte."));
  window.addEventListener("storage", (event) => {
    if (event.key === FAVORITES_KEY || event.key === LIBRARY_KEY) {
      const favs = read(FAVORITES_KEY, []);
      const saved = read(LIBRARY_KEY, []);
      state.favorites = new Set(Array.isArray(favs) ? favs : []);
      state.saved = new Map(
        (Array.isArray(saved) ? saved : [])
          .filter(validTrack)
          .map((t) => [t.link, t]),
      );
      render();
    }
  });
  for (let year = new Date().getFullYear(); year >= 1960; year--) {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;
    $("yearInput").append(option);
  }
  async function init() {
    status("Preparando tu selección…");
    try {
      const data = await fetchJSON("data/selection.json");
      const groups = (data.anime || []).map((a) =>
        flatten(a.animethemes || [], a),
      );
      const selection = [];
      for (
        let i = 0;
        i < Math.max(0, ...groups.map((group) => group.length));
        i++
      )
        for (const group of groups) if (group[i]) selection.push(group[i]);
      mergeCatalog(selection);
      // Preserve old link-only favorites even if their anime isn't in today's selection.
      for (const link of state.favorites)
        if (!state.saved.has(link) && safeURL(link, true)) {
          const title = decodeURIComponent(
            new URL(link).pathname.split("/").pop(),
          )
            .replace(/\.webm$/i, "")
            .replace(/-/g, " ");
          state.saved.set(link, {
            id: `legacy-${link}`,
            link,
            title,
            anime: "Favorito guardado",
            type: "",
            year: "",
            slug: "",
            cover: FALLBACK,
          });
        }
      write(LIBRARY_KEY, [...state.saved.values()]);
      renderFeatured();
      status();
      render();
      selectTrack(
        state.catalog.find(
          (t) => t.slug === "cowboy_bebop" && t.type === "OP",
        ) || state.catalog[0],
        { autoplay: false },
      );
    } catch {
      mergeCatalog([...state.saved.values(), ...state.history]);
      render();
      status(
        "No pudimos cargar la selección. Reintentá o explorá AnimeThemes.",
        init,
      );
    }
    const params = new URLSearchParams(location.search);
    const slug = params.get("anime");
    if (slug && /^[a-zA-Z0-9_-]{1,160}$/.test(slug)) {
      try {
        let track = state.catalog.find(
          (t) => t.slug === slug && t.id === params.get("theme"),
        );
        if (!track) {
          const data = await fetchJSON(
            `${API}/anime/${encodeURIComponent(slug)}?include=images,animethemes.song.artists,animethemes.animethemeentries.videos`,
          );
          const tracks = flatten(data.anime?.animethemes || [], data.anime);
          mergeCatalog(tracks);
          track = tracks.find((t) => t.id === params.get("theme")) || tracks[0];
        }
        if (track) {
          selectTrack(track, { autoplay: false });
          toast(`Listo para escuchar: ${track.title}`);
        } else toast("Ese tema ya no está disponible. Explorá la selección.");
      } catch {
        toast(
          "No pudimos abrir el tema compartido. Podés buscarlo por nombre.",
        );
      }
    }
  }
  if ("serviceWorker" in navigator)
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  renderQueue();
  init();
})();
