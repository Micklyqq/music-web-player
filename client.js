let currentAudio = null;
let currentTrack = null;
let isSeeking = false;
let tracks;

// Загрузка всех треков
document
  .getElementById("music-upload")
  .addEventListener("change", async function name(e) {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("track", file);

    try {
      const response = await fetch("http://localhost:5500/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Ошибка загрузки");

      loadTracks();
    } catch (error) {
      console.error("Ошибка", error);
    }
  });

async function loadTracks() {
  try {
    const response = await fetch("http://localhost:5500/tracks");
    tracks = await response.json();

    renderTracks(tracks);
  } catch (err) {
    console.error("Error loading tracks: ", err);
  }
}

document.addEventListener("DOMContentLoaded", loadTracks);
const volume = document.getElementById("volume");
volume.style.setProperty("--progress", `${volume.value}%`);
// Загрузка всех треков

function playTrack(trackName) {
  if (currentTrack === trackName) {
    if (currentAudio.paused) {
      currentAudio.play();
      return;
    } else {
      currentAudio.pause();
      return;
    }
  }

  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio.removeEventListener("timeupdate", updateProgress);
  }

  currentAudio = new Audio(`http://localhost:5500/tracks/${trackName}`);
  currentTrack = trackName;

  document.querySelector(".now-playing__title").textContent = trackName;
  document.querySelector(".now-playing__artist").textContent = tracks.find(
    (item) => item.filename === trackName
  ).metadata.artist;

  currentAudio.addEventListener("timeupdate", updateProgress);
  currentAudio.addEventListener("ended", resetPlayer);

  document.getElementById("progress").addEventListener("input", seekAudio);

  document.getElementById("volume").addEventListener("input", setVolume);

  currentAudio.play().catch((error) => {
    console.error("Playback failed: ", error);
  });
}

function updateProgress() {
  if (!isSeeking && currentAudio) {
    const progress = document.getElementById("progress");
    const progressPercent =
      (currentAudio.currentTime / currentAudio.duration) * 100;
    progress.value = progressPercent || 0;

    document.querySelector(".progress__time:first-child").textContent =
      formatTime(currentAudio.currentTime);

    const progressBar = document.getElementById("progress");
    const percent = (currentAudio.currentTime / currentAudio.duration) * 100;
    progressBar.style.setProperty("--progress", `${percent}%`);
  }
}

function seekAudio(e) {
  if (currentAudio) {
    isSeeking = true;
    const seekTime = (e.target.value / 100) * currentAudio.duration;
    currentAudio.currentTime = seekTime;

    setTimeout(() => {
      isSeeking = false;
    }, 100);
  }
}

function setVolume(e) {
  if (currentAudio) {
    currentAudio.volume = e.target.value / 100;
    const volume = document.getElementById("volume");
    volume.style.setProperty("--progress", `${volume.value}%`);
  }
}

function resetPlayer() {
  const progress = document.getElementById("progress");
  progress.value = 0;
  document.querySelector(".progress__time:first-child").textContent = "0:00";
  currentTrack = null;
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

function updatePlayButton() {
  const playButton = document.querySelector(".controls__button--play");
  if (currentAudio && !currentAudio.paused) {
    playButton.innerHTML = `<img src="assets/img/pause.png" />`;
  } else {
    playButton.innerHTML = `<img src="assets/img/play.png" />`;
  }
}

// Обработка кнопок действия
document
  .querySelector(".controls__button--play")
  .addEventListener("click", () => {
    if (currentAudio) {
      if (currentAudio.paused) {
        currentAudio.play();
      } else {
        currentAudio.pause();
      }
      updatePlayButton();
    }
  });

// Пауза на пробел
const player = document.querySelector(".player");
document.addEventListener("keydown", (e) => {
  if (
    e.code === "Space" &&
    e.target.tagName !== "INPUT" &&
    e.target.tagName !== "TEXTAREA"
  ) {
    e.preventDefault();

    if (currentAudio) {
      if (currentAudio.paused) {
        currentAudio.play();
      } else {
        currentAudio.pause();
      }
      updatePlayButton();
    }
  }
});
// Вперед
document
  .querySelector(".controls__button--next")
  .addEventListener("click", () => {
    const currentTrackIndex = tracks.findIndex(
      (item) => item.filename == currentTrack
    );
    if (currentTrackIndex === undefined) return;
    const mediaItems = document.querySelectorAll(".media__item");
    mediaItems.forEach((el) => {
      el.classList.remove("media__item--active");
    });

    if (tracks[currentTrackIndex + 1]) {
      playTrack(tracks[currentTrackIndex + 1].filename);
      mediaItems[currentTrackIndex + 1].classList.add("media__item--active");
    } else {
      playTrack(tracks[0].filename);
      mediaItems[0].classList.add("media__item--active");
    }
  });

// Назад
document
  .querySelector(".controls__button--prev")
  .addEventListener("click", () => {
    const currentTrackIndex = tracks.findIndex(
      (item) => item.filename == currentTrack
    );
    if (currentTrackIndex === undefined) return;
    const mediaItems = document.querySelectorAll(".media__item");
    mediaItems.forEach((el) => {
      el.classList.remove("media__item--active");
    });
    if (tracks[currentTrackIndex - 1]) {
      playTrack(tracks[currentTrackIndex - 1].filename);
      mediaItems[currentTrackIndex - 1].classList.add("media__item--active");
    } else {
      playTrack(tracks.at(-1).filename);
      Array.from(mediaItems).at(-1).classList.add("media__item--active");
    }
  });

// Поиск
let searchTimeout = null;
document
  .querySelector(".search__input")
  .addEventListener("input", function (e) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      searchTracks(e.target.value.toLowerCase());
    }, 300);
  });

function searchTracks(query) {
  const filtered = tracks.filter((track) => {
    const title = track.metadata.title?.toLowerCase() || "";
    const artist = track.metadata.artist?.toLowerCase() || "";
    return title.includes(query) || artist.includes(query);
  });
  renderTracks(filtered);
}

function renderTracks(tracks) {
  const mediaList = document.querySelector(".media__list");
  const existingElements = Array.from(mediaList.children);

  const elementsMap = new Map();
  existingElements.forEach((el) => {
    elementsMap.set(el.dataset.filename, el);
    el.classList.add("hidden");
  });

  tracks.forEach((track) => {
    const trackId = track.filename;

    if (elementsMap.has(trackId)) {
      const el = elementsMap.get(trackId);

      el.classList.remove("hidden");
      elementsMap.delete(trackId);
    } else {
      const trackElement = createTrackElement(track);
      mediaList.append(trackElement);
    }
  });

  setTimeout(() => {
    document.querySelectorAll(".media__item.hidden").forEach((el) => {
      el.remove();
    });
  }, 300);

  // tracks.forEach((track) => {
  // const trackElement = document.createElement("li");
  // trackElement.className = "media__item media__item--track";
  // trackElement.role = "option";
  // trackElement.tabIndex = "0";
  // trackElement.ariaSelected = "false";
  // trackElement.innerHTML = `
  //         <figure class="media__cover">
  //           <img
  //             class="media__image"
  //             src="${
  //               track.metadata.cover || "assets/img/default-album-img.png"
  //             }"
  //             alt="Обложка плейлиста 'Любимое'"
  //           />
  //         </figure>
  //         <div class="media__info">
  //           <h3 class="media__name">${track.metadata.title}</h3>
  //           <p class="media__meta">${track.metadata.artist}</p>
  //         </div>
  //         `;
  // trackElement.addEventListener("click", () => {
  //   document.querySelectorAll(".media__item").forEach((el) => {
  //     el.classList.remove("media__item--active");
  //   });
  //   trackElement.classList.add("media__item--active");
  //   playTrack(track.filename);
  //   updatePlayButton();
  // });
  //   mediaList.append(trackElement);
  // });
}

function createTrackElement(track) {
  const trackElement = document.createElement("li");
  trackElement.className = "media__item media__item--track";
  trackElement.dataset.filename = track.filename; // Уникальный идентификатор
  trackElement.role = "option";
  trackElement.tabIndex = "0";
  trackElement.ariaSelected = "false";

  trackElement.innerHTML = `
    <div class="media__content">
    <figure class="media__cover">
      <img class="media__image" 
           src="${track.metadata.cover || "assets/img/default-album-img.png"}" 
           alt="${track.metadata.title} cover">
    </figure>
  
    <div class="media__info">
      <h3 class="media__name">${track.metadata.title}</h3>
      <p class="media__meta">${track.metadata.artist}</p>
    </div>
    </div>

    <div class="media__actions media__actions--mouseover">
      <div class="media__more-actions-button">...</div>
      <div class="media__action-button media__action-button--blue media--offscreen">
      <img class="media__action-image " src="assets/img/settings.svg">
      </div>
      <div class="media__action-button media__action-button--red media--offscreen">
      <img class="media__action-image " src="assets/img/trash.svg">
      </div>
    </div>
   
  `;

  trackElement.querySelector("div").addEventListener("click", () => {
    document.querySelectorAll(".media__item").forEach((el) => {
      el.classList.remove("media__item--active");
    });
    trackElement.classList.add("media__item--active");
    playTrack(track.filename);
    updatePlayButton();
  });

  const actionsContainer = trackElement.querySelector(".media__actions");
  const removeButton = trackElement.querySelector(".media__action-button--red");

  actionsContainer.addEventListener("mouseenter", () => {
    showTrackOptions(actionsContainer);
  });

  actionsContainer.addEventListener("mouseleave", () => {
    hideTrackOptions(actionsContainer);
  });

  removeButton.addEventListener("click", () => {
    deleteTrack(track);
  });

  return trackElement;
}

// update/delete track

function showTrackOptions(container) {
  const moreButton = container.querySelector(".media__more-actions-button");
  const actionButtons = container.querySelectorAll(".media__action-button");

  moreButton.classList.add("media--offscreen");
  actionButtons.forEach((btn) => btn.classList.remove("media--offscreen"));
}

function hideTrackOptions(container) {
  const moreButton = container.querySelector(".media__more-actions-button");
  const actionButtons = container.querySelectorAll(".media__action-button");

  moreButton.classList.remove("media--offscreen");
  actionButtons.forEach((btn) => btn.classList.add("media--offscreen"));
}

async function deleteTrack(trackElement) {
  try {
    const fileName = encodeURIComponent(trackElement.filename);
    let response = await fetch(`http://localhost:5500/tracks/${fileName}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Failed to delete");
    }

    const result = await response.json();
    console.log(`File deleted: `, result);
    loadTracks();
    return result;
  } catch (error) {
    console.log("Delete failed: " + error);
    throw error;
  }
}

function openChangeModal() {}
