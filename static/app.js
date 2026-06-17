const searchInput = document.querySelector("#search");
const composer = document.querySelector("#composer");
const searchField = document.querySelector("#search-field");
const resultsEl = document.querySelector("#results");
const selectedChip = document.querySelector("#selected-chip");
const createBtn = document.querySelector("#create");
const limitPicker = document.querySelector("#limit-picker");
const limitNumber = document.querySelector("#limit-number");
const playlistEl = document.querySelector("#playlist");
const statusEl = document.querySelector("#status");

let selectedSong = null;
let searchTimer = null;
let searchRequest = null;
let playlistUrl = null;
let selectedLimit = 15;
const limitOptions = [5, 15, 25];

function setStatus(text) {
  statusEl.textContent = text || "";
}

function clearPlaylist() {
  playlistEl.innerHTML = "";
  playlistUrl = null;
}

function setButtonState(state) {
  createBtn.classList.remove("is-loading", "is-ready");
  createBtn.hidden = !selectedSong;
  createBtn.disabled = !selectedSong || state === "loading";

  const text = createBtn.querySelector(".button-text");
  if (state === "loading") {
    createBtn.classList.add("is-loading");
    text.textContent = "Making...";
  } else if (state === "ready") {
    createBtn.classList.add("is-ready");
    text.textContent = "Open playlist";
  } else {
    text.textContent = "Make playlist";
  }
}

function renderSelected(song) {
  selectedSong = song;
  composer.classList.toggle("has-selection", Boolean(song));
  searchField.classList.toggle("has-selection", Boolean(song));
  selectedChip.hidden = !song;
  selectedChip.innerHTML = song
    ? `
      ${song.thumbnail ? `<img src="${song.thumbnail}" alt="">` : ""}
      <span>
        <strong>${song.title || "Untitled"}</strong>
        <small>${[song.artists, song.duration].filter(Boolean).join(" · ")}</small>
      </span>
      <button type="button" aria-label="Clear song">×</button>
    `
    : "";
  setButtonState("idle");
}

function renderResults(results) {
  resultsEl.innerHTML = "";

  if (!results.length) {
    resultsEl.hidden = true;
    return;
  }

  for (const song of results) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "result";
    button.innerHTML = `
      ${song.thumbnail ? `<img src="${song.thumbnail}" alt="">` : ""}
      <span>
        <strong>${song.title || "Untitled"}</strong>
        <small>${[song.artists, song.duration].filter(Boolean).join(" · ")}</small>
      </span>
    `;
    button.addEventListener("click", () => {
      searchInput.value = "";
      searchInput.placeholder = "";
      renderSelected(song);
      resultsEl.hidden = true;
      clearPlaylist();
      setStatus("");
    });
    resultsEl.append(button);
  }

  resultsEl.hidden = false;
}

function clearSelected() {
  renderSelected(null);
  searchInput.placeholder = "Search a song";
  searchInput.focus();
  clearPlaylist();
  setStatus("");
}

async function searchSongs(query) {
  if (searchRequest) searchRequest.abort();
  searchRequest = new AbortController();

  const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
    signal: searchRequest.signal,
  });
  if (!response.ok) throw new Error("Search failed");
  return response.json();
}

searchInput.addEventListener("input", () => {
  const query = searchInput.value.trim();
  if (selectedSong) renderSelected(null);
  clearPlaylist();

  window.clearTimeout(searchTimer);
  if (query.length < 2) {
    renderResults([]);
    setStatus("");
    return;
  }

  searchTimer = window.setTimeout(async () => {
    try {
      setStatus("");
      const data = await searchSongs(query);
      renderResults(data.results || []);
      setStatus(data.results?.length ? "" : "No songs found.");
    } catch (error) {
      if (error.name !== "AbortError") setStatus("Search failed.");
    }
  }, 300);
});

searchField.addEventListener("click", () => {
  searchInput.focus();
});

selectedChip.addEventListener("click", (event) => {
  const clearButton = event.target.closest("button");
  if (clearButton) clearSelected();
});

limitPicker.addEventListener("click", (event) => {
  const currentIndex = limitOptions.indexOf(selectedLimit);
  const nextLimit = limitOptions[(currentIndex + 1) % limitOptions.length];
  const direction = nextLimit > selectedLimit ? "up" : "down";
  selectedLimit = nextLimit;

  limitNumber.textContent = String(selectedLimit);
  limitNumber.classList.remove("roll-up", "roll-down");
  limitNumber.offsetHeight;
  limitNumber.classList.add(direction === "up" ? "roll-up" : "roll-down");
  limitNumber.addEventListener("animationend", () => {
    limitNumber.classList.remove("roll-up", "roll-down");
  }, { once: true });

  clearPlaylist();
  setButtonState("idle");
  setStatus("");
});

createBtn.addEventListener("click", async () => {
  if (playlistUrl) {
    window.open(playlistUrl, "_blank", "noreferrer");
    return;
  }

  if (!selectedSong) return;

  clearPlaylist();
  setButtonState("loading");
  setStatus("");

  try {
    const response = await fetch("/api/playlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        videoId: selectedSong.videoId,
        limit: selectedLimit,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Playlist failed");

    playlistUrl = data.url;
    setButtonState("ready");
  } catch (error) {
    setButtonState("idle");
    setStatus(error.message);
  }
});

document.addEventListener("click", (event) => {
  if (!resultsEl.contains(event.target) && event.target !== searchInput) {
    resultsEl.hidden = true;
  }
});
