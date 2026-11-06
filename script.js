/**
 * A MAGICAL BIRTHDAY SURPRISE 💜🌙
 * Interactive Vanilla JavaScript Engine
 * Features:
 *  - Procedural Web Audio API sound synthesizer (boop, fanfare, clicks, ambient moonlit chimes)
 *  - Canvas particle starfield & moonlit ambient sparkles
 *  - Physics-based celebratory confetti & floating hearts system
 *  - Dynamic multi-screen state transitions (Nose Boop -> Photos -> Videos -> Cake Surprise)
 *  - 6-slot photo memories carousel with local upload, replace, batch upload, auto-play, touch swipe
 *  - 3-slot responsive video memories with local file preview, play/pause synchronization
 *  - Interactive Chocolate Cake with candle blowout, celebratory reveal, relighting & personalization
 */

// ==========================================
// 0. SECRET ACCESS KEY CONFIGURATION 🔐
// ==========================================
// Anyone opening the website must enter this key to unlock the surprise.
// You can easily change this secret key at any time by editing the accessKey value below.
const SECRET_ACCESS_CONFIG = {
  // -------------------------------------------------------------
  // SET YOUR SECRET ACCESS KEY HERE:
  // -------------------------------------------------------------
  accessKey: "[I WILL SET MY SECRET KEY HERE]",

  // Alternate keys also accepted for smooth testing (case-insensitive):
  alternateKeys: [
    "buggaluuu",
    "buggaluu",
    "happy birthday"
  ],

  // Session storage key used for session persistence
  sessionStorageKey: "birthday_surprise_access_unlocked"
};

function isAccessUnlocked() {
  try {
    return sessionStorage.getItem(SECRET_ACCESS_CONFIG.sessionStorageKey) === "true";
  } catch (e) {
    return false;
  }
}

function validateSecretKey(enteredKey) {
  if (!enteredKey || typeof enteredKey !== "string") return false;
  const cleanInput = enteredKey.trim().toLowerCase();
  if (!cleanInput) return false;

  const primaryKey = (SECRET_ACCESS_CONFIG.accessKey || "").trim().toLowerCase();

  // 1. Direct match with primary key
  if (cleanInput === primaryKey) return true;

  // 2. Match without outer brackets if user enters without brackets e.g. "I WILL SET MY SECRET KEY HERE"
  const unbracketedPrimary = primaryKey.replace(/^\[+|\]+$/g, "").trim();
  if (unbracketedPrimary && cleanInput === unbracketedPrimary) return true;

  // 3. Match alternate keys
  if (Array.isArray(SECRET_ACCESS_CONFIG.alternateKeys)) {
    for (const alt of SECRET_ACCESS_CONFIG.alternateKeys) {
      if (alt && alt.trim().toLowerCase() === cleanInput) {
        return true;
      }
    }
  }

  return false;
}

// ==========================================
// 1. STATE MANAGEMENT & LOCAL STORAGE
// ==========================================

const DEFAULT_CONFIG = {
  recipientName: "Buggaluuu",
  birthdayMessage: "Happy Birthday, 🌌 ✨ Like bioluminescent waves that turn the darkest oceans into a sea of stars, you have a beautiful way of making ordinary moments glow with magic. 🌊 🪼 May your life always shine with the kind of light that doesn't need the sun to be beautiful. 🌌 Adi anta ChatGPT gaadi sodhi ye, pichi dokku wastuu, chethaa, worstuuu, pandii! 😂 Inni tittulu birthday roju evaru ninnu titti undaru! 🤗 😋 😋 Ponile, anyways Happie 20th! ✌️ 🐱",
  photoCaptions: [
    "Muheheheheheheheheeee",
    "Our favorite little adventure together 🌙",
    "Your warmest smile in the golden light 💛",
    "A quiet little moment together ☕",
    "Dancing beneath the stars 🌙",
    "Your happiness, captured in time 💫"
  ],
  videoCaptions: [
    { title: "Geetha", note: "A moment I can replay a thousand times." },
    { title: "Likki", note: "The funniest, most unscripted smile." },
    { title: "Koushik", note: "Pure warmth and nostalgia." }
  ]
};

const LEGACY_VIDEO_TITLES = [
  "A Favourite Memory 💫",
  "A Little Chaos 🤭",
  "A Moment to Remember 🌟"
];

// Load saved config or fall back to defaults
let appConfig = loadSavedConfig();

function loadSavedConfig() {
  try {
    const saved = localStorage.getItem("magical_birthday_config");
    if (saved) {
      const mergedConfig = { ...DEFAULT_CONFIG, ...JSON.parse(saved) };

      // Ensure locked recipient name and birthday wish cannot be overridden
      mergedConfig.recipientName = DEFAULT_CONFIG.recipientName;
      mergedConfig.birthdayMessage = DEFAULT_CONFIG.birthdayMessage;

      // Update previously saved default video titles without touching custom titles.
      if (Array.isArray(mergedConfig.videoCaptions)) {
        mergedConfig.videoCaptions = mergedConfig.videoCaptions.map((video, index) => {
          const updatedTitle = DEFAULT_CONFIG.videoCaptions[index]?.title;
          if (video && updatedTitle && video.title === LEGACY_VIDEO_TITLES[index]) {
            return { ...video, title: updatedTitle };
          }
          return video;
        });
      }

      return mergedConfig;
    }
  } catch (e) {
    console.warn("Storage access restricted or empty", e);
  }
  return { ...DEFAULT_CONFIG };
}

function saveConfig() {
  try {
    localStorage.setItem("magical_birthday_config", JSON.stringify(appConfig));
  } catch (e) {
    console.warn("Failed to save config to localStorage", e);
  }
}

// Current active screen: 0 (Boop), 1 (Photos), 2 (Videos), 3 (Cake)
let currentScreenIndex = 0;
const TOTAL_SCREENS = 4;
let highestReachedScreen = 0;

// The birthday song is unlocked ONLY after the cake surprise is revealed on the final screen
let birthdaySongUnlocked = false;

function isCakeSurpriseActive() {
  return currentScreenIndex === 3 && birthdaySongUnlocked;
}

// Slideshow state
let currentPhotoSlide = 0;
const TOTAL_PHOTO_SLOTS = 6;
let isSlideshowPlaying = false;
let slideshowTimer = null;
let slideshowProgressTimer = null;
let slideshowProgressPercent = 0;
const SLIDESHOW_INTERVAL = 3000; // 3 seconds per slide

// Stored blob URLs to prevent memory leaks
const objectUrlRegistry = new Set();

function registerObjectUrl(url) {
  objectUrlRegistry.add(url);
  return url;
}

window.addEventListener("beforeunload", () => {
  objectUrlRegistry.forEach(url => URL.revokeObjectURL(url));
});

// ==========================================
// 1B. INDEXEDDB PERMANENT MEDIA STORAGE 🗄️
// Stores uploaded photo & video Blobs permanently across browser sessions.
// ==========================================

class MediaStorage {
  constructor() {
    this.dbName = "MagicalBirthdayMediaDB";
    this.dbVersion = 1;
    this.storeName = "media_blobs";
    this.db = null;
    this.initPromise = null;
  }

  // Open / initialize IndexedDB
  async init() {
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;

    if (typeof window === "undefined" || !("indexedDB" in window)) {
      console.warn("IndexedDB is not supported in this browser environment.");
      return null;
    }

    this.initPromise = new Promise((resolve) => {
      try {
        const request = window.indexedDB.open(this.dbName, this.dbVersion);

        request.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            const store = db.createObjectStore(this.storeName, { keyPath: "id" });
            store.createIndex("by_type", "mediaType", { unique: false });
            store.createIndex("by_slot", "slotIndex", { unique: false });
          }
        };

        request.onsuccess = (e) => {
          this.db = e.target.result;
          this.db.onversionchange = () => {
            if (this.db) {
              this.db.close();
              this.db = null;
            }
          };
          resolve(this.db);
        };

        request.onerror = (e) => {
          console.error("IndexedDB open error:", e.target.error);
          resolve(null);
        };

        request.onblocked = () => {
          console.warn("IndexedDB open blocked by another open tab.");
        };
      } catch (err) {
        console.error("Failed to initialize IndexedDB:", err);
        resolve(null);
      }
    });

    return this.initPromise;
  }

  // Save an uploaded media file (Blob) with full metadata
  async saveMedia(mediaType, slotIndex, file) {
    const db = await this.init();
    if (!db || !file) return null;

    const id = `${mediaType}_${slotIndex}`;
    const record = {
      id: id,
      mediaType: mediaType, // "photo" or "video"
      slotIndex: Number(slotIndex),
      blob: file, // Store raw binary Blob directly (NO Base64 conversion!)
      fileName: file.name || `${mediaType}_${slotIndex}`,
      fileType: file.type || (mediaType === "photo" ? "image/jpeg" : "video/mp4"),
      fileSize: file.size || 0,
      timestamp: Date.now()
    };

    return new Promise((resolve) => {
      try {
        const tx = db.transaction([this.storeName], "readwrite");
        const store = tx.objectStore(this.storeName);
        const req = store.put(record);

        req.onsuccess = () => {
          resolve(record);
        };

        req.onerror = (e) => {
          const err = e.target.error;
          if (err && err.name === "QuotaExceededError") {
            showToast("Storage quota exceeded! Please use smaller media files.", "⚠️");
          } else {
            console.error("Error saving media to IndexedDB:", err);
          }
          resolve(null);
        };
      } catch (err) {
        console.error("Transaction error saving media to IndexedDB:", err);
        resolve(null);
      }
    });
  }

  // Get a specific media item by type and slot
  async getMedia(mediaType, slotIndex) {
    const db = await this.init();
    if (!db) return null;

    const id = `${mediaType}_${slotIndex}`;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction([this.storeName], "readonly");
        const store = tx.objectStore(this.storeName);
        const req = store.get(id);

        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      } catch (err) {
        console.error("Transaction error getting media from IndexedDB:", err);
        resolve(null);
      }
    });
  }

  // Retrieve all stored media items
  async getAllMedia() {
    const db = await this.init();
    if (!db) return [];

    return new Promise((resolve) => {
      try {
        const tx = db.transaction([this.storeName], "readonly");
        const store = tx.objectStore(this.storeName);
        const req = store.getAll();

        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      } catch (err) {
        console.error("Transaction error getting all media from IndexedDB:", err);
        resolve([]);
      }
    });
  }

  // Delete a specific media item by type and slot (preserves all other items)
  async deleteMedia(mediaType, slotIndex) {
    const db = await this.init();
    if (!db) return false;

    const id = `${mediaType}_${slotIndex}`;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction([this.storeName], "readwrite");
        const store = tx.objectStore(this.storeName);
        const req = store.delete(id);

        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch (err) {
        console.error("Transaction error deleting media from IndexedDB:", err);
        resolve(false);
      }
    });
  }
}

const mediaStorage = new MediaStorage();

// ==========================================
// 1C. STATIC MEDIA DEFINITIONS & PERSISTENCE 📸🎬
// Bundled static photos & videos for permanent Vercel deployment
// ==========================================

const DEFAULT_PHOTOS = [
  { slot: 0, url: "assets/photos/muhehehheheeh.jpeg", caption: "Muheheheheheheheheeee" },
  { slot: 1, url: "assets/photos/jadal .jpeg", caption: "Our favorite little adventure together 🌙" },
  { slot: 2, url: "assets/photos/pandi.jpeg", caption: "Your warmest smile in the golden light 💛" },
  { slot: 3, url: "assets/photos/face.jpeg", caption: "A quiet little moment together ☕" },
  { slot: 4, url: "assets/photos/3 monkies.jpeg", caption: "Dancing beneath the stars 🌙" },
  { slot: 5, url: "assets/photos/ss.jpeg", caption: "Your happiness, captured in time 💫" }
];

const DEFAULT_VIDEOS = [
  { slot: 0, url: "assets/videos/g video.mp4", title: "Geetha", note: "A moment I can replay a thousand times." },
  { slot: 1, url: "assets/videos/lk video.mp4", title: "Likki", note: "The funniest, most unscripted smile." },
  { slot: 2, url: "assets/videos/kittu.mp4", title: "Koushik", note: "Pure warmth and nostalgia." }
];

// Retrieve and render all media items across all devices on Vercel deployment
async function loadPersistedMedia() {
  const photoCards = document.querySelectorAll(".photo-card");
  const videoCards = document.querySelectorAll(".video-card");

  // 1. Ensure static default photos are loaded into all slots
  DEFAULT_PHOTOS.forEach(p => {
    const card = photoCards[p.slot];
    if (card) {
      const img = card.querySelector(".photo-img");
      const placeholder = card.querySelector(".photo-placeholder");
      const removeBtn = card.querySelector(".remove-photo-btn");
      const captionText = card.querySelector(".photo-caption-text");

      if (img && (!img.getAttribute("src") || img.getAttribute("src") === "")) {
        img.src = p.url;
      }
      if (img) img.style.display = "block";
      if (placeholder) placeholder.style.display = "none";
      if (removeBtn) removeBtn.style.display = "inline-block";
      if (captionText && (!appConfig.photoCaptions || !appConfig.photoCaptions[p.slot])) {
        captionText.textContent = p.caption;
      }
    }
  });

  // 2. Ensure static default videos are loaded into all slots
  DEFAULT_VIDEOS.forEach(v => {
    const card = videoCards[v.slot];
    if (card) {
      const video = card.querySelector(".video-element");
      const container = card.querySelector(".video-player-container");
      const thumbnailOverlay = card.querySelector(".video-thumbnail-placeholder");
      const replaceBtn = card.querySelector(".video-replace-btn");

      if (video) {
        const sourceEl = video.querySelector("source");
        if (!sourceEl && (!video.src || video.src === window.location.href)) {
          video.src = v.url;
        }
        video.preload = "none";
        video.controls = false;
        video.style.display = "none";
      }
      if (container) container.classList.remove("is-playing");
      if (thumbnailOverlay) thumbnailOverlay.style.display = "flex";
      if (replaceBtn) replaceBtn.style.display = "inline-flex";
    }
  });

  // 3. Check local IndexedDB in case the owner made any custom replacements in browser
  try {
    const localRecords = await mediaStorage.getAllMedia();
    if (localRecords && localRecords.length > 0) {
      localRecords.forEach(record => {
        if (!record || !record.blob) return;

        if (record.mediaType === "photo") {
          const card = photoCards[record.slotIndex];
          if (card) {
            const img = card.querySelector(".photo-img");
            const placeholder = card.querySelector(".photo-placeholder");
            const removeBtn = card.querySelector(".remove-photo-btn");

            const freshUrl = registerObjectUrl(URL.createObjectURL(record.blob));
            if (img) {
              img.src = freshUrl;
              img.style.display = "block";
            }
            if (placeholder) placeholder.style.display = "none";
            if (removeBtn) removeBtn.style.display = "inline-block";
          }
        } else if (record.mediaType === "video") {
          const card = videoCards[record.slotIndex];
          if (card) {
            const video = card.querySelector(".video-element");
            const container = card.querySelector(".video-player-container");
            const thumbnailOverlay = card.querySelector(".video-thumbnail-placeholder");
            const replaceBtn = card.querySelector(".video-replace-btn");

            const freshUrl = registerObjectUrl(URL.createObjectURL(record.blob));
            if (video) {
              video.src = freshUrl;
              video.preload = "none";
              video.controls = false;
              video.style.display = "none";
            }
            if (container) container.classList.remove("is-playing");
            if (thumbnailOverlay) thumbnailOverlay.style.display = "flex";
            if (replaceBtn) replaceBtn.style.display = "inline-flex";
          }
        }
      });
    }
  } catch (err) {
    console.warn("IndexedDB check:", err);
  }
}

// ==========================================
// 2. AUDIO & LOCKED BIRTHDAY SONG 🎵
// The background song is permanently locked to the special birthday track
// ==========================================

class SoundEngine {
  constructor() {
    this.audioCtx = null;
    this.isMuted = false;

    // Background song audio element (locked to assets/song.aac & assets/song.mp3)
    this.songAudio = null;
    this.songLoaded = true;
    this.songName = "Special Birthday Song 🎶";
    this.wasPlayingBeforeVideo = false;
    this.isPlaying = false;
  }

  setupAudioElement() {
    if (this.songAudio) return;

    const existing = document.getElementById("bg-music-audio");
    this.songAudio = existing || new Audio("assets/song.aac");
    this.songAudio.loop = true;
    this.songAudio.preload = "auto";

    // Synchronize HTML5 Audio events with UI
    this.songAudio.addEventListener("play", () => {
      this.isPlaying = true;
      updateSoundUI();
    });

    this.songAudio.addEventListener("pause", () => {
      if (!this.wasPlayingBeforeVideo) {
        this.isPlaying = false;
        updateSoundUI();
      }
    });

    this.songAudio.addEventListener("ended", () => {
      this.isPlaying = false;
      updateSoundUI();
    });
  }

  init() {
    this.setupAudioElement();
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  loadInitialMusic() {
    this.setupAudioElement();
    updateSoundUI();
  }

  toggleMusic() {
    this.init();
    if (!birthdaySongUnlocked) {
      showToast("Music unlocks with the final cake surprise! 🎂✨", "🌙");
      return;
    }
    if (this.songAudio.paused) {
      this.startMusic();
      showToast("Music Playing 🎵", "🎶");
    } else {
      this.pauseMusic();
      showToast("Music Paused ⏸️", "🌙");
    }
  }

  startMusic() {
    // Background music is strictly reserved for the final birthday cake surprise (candle blowout)
    if (!birthdaySongUnlocked) {
      return;
    }
    this.init();
    this.isMuted = false;

    if (!this.songAudio) return;

    // Reset playback position to 0:00 before every new playback
    try {
      this.songAudio.currentTime = 0;
    } catch (err) {
      console.warn("Could not reset audio currentTime:", err);
    }

    const playPromise = this.songAudio.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        this.isPlaying = true;
        updateSoundUI();
      }).catch(err => {
        console.warn("Autoplay needs user interaction first or was interrupted:", err);
      });
    }
  }

  pauseMusic() {
    if (this.songAudio) {
      this.songAudio.pause();
    }
    this.isPlaying = false;
    updateSoundUI();
  }

  stopMusic() {
    if (this.songAudio) {
      this.songAudio.pause();
      try {
        this.songAudio.currentTime = 0;
      } catch (err) {
        console.warn("Could not reset audio currentTime:", err);
      }
    }
    this.isPlaying = false;
    this.wasPlayingBeforeVideo = false;
    updateSoundUI();
  }

  // Gracefully duck background music when a memory video plays
  pauseForVideo() {
    if (this.isPlaying && this.songAudio) {
      this.wasPlayingBeforeVideo = true;
      this.songAudio.pause();
      updateSoundUI();
    }
  }

  resumeAfterVideo() {
    if (this.wasPlayingBeforeVideo && this.songAudio && birthdaySongUnlocked) {
      this.wasPlayingBeforeVideo = false;
      this.startMusic();
    }
  }

  // Cute, bubbly boop sound!
  playBoop() {
    if (this.isMuted) return;
    this.init();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // Sweet pitch-rising pop oscillator
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(740, now + 0.12);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);

    // Harmonic chime sparkle
    const chime = ctx.createOscillator();
    const chimeGain = ctx.createGain();
    chime.type = "triangle";
    chime.frequency.setValueAtTime(1180, now + 0.05);
    chime.frequency.exponentialRampToValueAtTime(1480, now + 0.25);

    chimeGain.gain.setValueAtTime(0, now);
    chimeGain.gain.setValueAtTime(0.18, now + 0.05);
    chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    chime.connect(chimeGain);
    chimeGain.connect(ctx.destination);

    chime.start(now + 0.05);
    chime.stop(now + 0.38);
  }

  // Soft wind whoosh for blowing out the candles
  playBlow() {
    if (this.isMuted) return;
    this.init();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const duration = 0.55;

    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(500, now);
    filter.frequency.exponentialRampToValueAtTime(1700, now + duration);
    filter.Q.value = 0.7;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.32, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + duration);
  }

  // Triumphant Happy Birthday fanfare chord arpeggio
  playBirthdayFanfare() {
    if (this.isMuted) return;
    this.init();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    const notes = [523.25, 659.25, 783.99, 987.77, 1046.50, 1567.98];

    notes.forEach((freq, idx) => {
      const startTime = now + idx * 0.12;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = idx % 2 === 0 ? "triangle" : "sine";
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.28, startTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 1.25);
    });
  }

  // Subtle glassy click for UI elements
  playClick() {
    if (this.isMuted) return;
    this.init();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(900, now);
    osc.frequency.exponentialRampToValueAtTime(450, now + 0.06);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  // Magical celestial chime for unlocking the Secret Access Key
  playUnlockSound() {
    if (this.isMuted) return;
    this.init();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 arpeggio

    notes.forEach((freq, idx) => {
      const startTime = now + idx * 0.085;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.01, startTime + 0.35);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.65);
    });
  }

  // Gentle soft error buzz for incorrect key attempt
  playErrorSound() {
    if (this.isMuted) return;
    this.init();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.linearRampToValueAtTime(110, now + 0.18);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  // Gentle procedural ambient moonlit chord arpeggiator
  startProceduralAmbient() {
    if (!this.audioCtx) this.init();
    if (!this.audioCtx) return;
    this.ambientPlaying = true;
    this.isMuted = false;

    // Moonlit progression: Fmaj7 -> G -> Em7 -> Am
    const chordProgressions = [
      [349.23, 440.00, 523.25, 659.25], // Fmaj7
      [392.00, 493.88, 587.33, 783.99], // G
      [329.63, 392.00, 493.88, 587.33], // Em7
      [440.00, 523.25, 659.25, 880.00]  // Am
    ];

    let chordIdx = 0;
    let noteIdx = 0;

    const playNextNote = () => {
      if (!this.ambientPlaying || this.isMuted || !this.audioCtx) return;

      const currentChord = chordProgressions[chordIdx];
      const freq = currentChord[noteIdx];
      const now = this.audioCtx.currentTime;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.09, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 1.9);

      noteIdx++;
      if (noteIdx >= currentChord.length) {
        noteIdx = 0;
        chordIdx = (chordIdx + 1) % chordProgressions.length;
      }
    };

    if (!this.ambientInterval) {
      playNextNote();
      this.ambientInterval = setInterval(playNextNote, 750);
    }
  }

  stopProceduralAmbient() {
    if (this.ambientInterval) {
      clearInterval(this.ambientInterval);
      this.ambientInterval = null;
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.pauseMusic();
    }
    updateSoundUI();
    showToast(this.isMuted ? "Sound Muted 🔇" : "Sound Enabled 🔊");
  }
}

const soundEngine = new SoundEngine();

function updateSoundUI() {
  const soundBtn = document.getElementById("toggle-sound-btn");
  const waveIcon = document.getElementById("sound-wave-indicator");
  const soundLabel = document.getElementById("sound-btn-label");

  if (!soundBtn) return;

  if (soundEngine.isMuted) {
    soundBtn.classList.remove("active");
    if (waveIcon) waveIcon.classList.add("muted");
    if (soundLabel) soundLabel.textContent = "Music: Off";
  } else if (soundEngine.isPlaying) {
    soundBtn.classList.add("active");
    if (waveIcon) waveIcon.classList.remove("muted");
    if (soundLabel) soundLabel.textContent = "Music: On 🎵";
  } else {
    soundBtn.classList.remove("active");
    if (waveIcon) waveIcon.classList.add("muted");
    if (soundLabel) soundLabel.textContent = "Music: Off";
  }
}

// ==========================================
// 3. CANVAS 1: ATMOSPHERIC PARTICLES & STARS ✨
// ==========================================

const particlesCanvas = document.getElementById("particles-canvas");
const pCtx = particlesCanvas ? particlesCanvas.getContext("2d") : null;

let stars = [];
let floatingParticles = [];
let canvasWidth = window.innerWidth;
let canvasHeight = window.innerHeight;

function initStarfield() {
  if (!particlesCanvas || !pCtx) return;

  canvasWidth = particlesCanvas.width = window.innerWidth;
  canvasHeight = particlesCanvas.height = window.innerHeight;

  stars = [];
  const starCount = Math.floor((canvasWidth * canvasHeight) / 12000);

  for (let i = 0; i < starCount; i++) {
    stars.push({
      x: Math.random() * canvasWidth,
      y: Math.random() * (canvasHeight * 0.54), // Keep the stars above the ocean horizon
      radius: Math.random() * 1.5 + 0.4,
      alpha: Math.random() * 0.8 + 0.2,
      twinkleSpeed: Math.random() * 0.02 + 0.008,
      twinkleDir: Math.random() > 0.5 ? 1 : -1,
      color: Math.random() > 0.4 ? "#eefaff" : (Math.random() > 0.5 ? "#b9ebff" : "#9cc7ff")
    });
  }

  floatingParticles = [];
  const particleCount = 28;
  for (let i = 0; i < particleCount; i++) {
    floatingParticles.push(createAmbientParticle(true));
  }
}

function createAmbientParticle(randomY = false) {
  return {
    x: Math.random() * canvasWidth,
    y: randomY ? Math.random() * canvasHeight : canvasHeight + 20,
    radius: Math.random() * 3 + 1.2,
    speedY: -(Math.random() * 0.6 + 0.25),
    speedX: (Math.random() - 0.5) * 0.4,
    alpha: Math.random() * 0.5 + 0.2,
    color: Math.random() > 0.5 ? "rgba(122, 232, 255, " : "rgba(162, 205, 255, ",
    pulse: Math.random() * Math.PI,
    pulseSpeed: Math.random() * 0.03 + 0.01
  };
}

function renderAtmosphericCanvas() {
  if (!pCtx) return;

  pCtx.clearRect(0, 0, canvasWidth, canvasHeight);

  // 1. Render Stars
  stars.forEach(star => {
    star.alpha += star.twinkleSpeed * star.twinkleDir;
    if (star.alpha > 0.95) {
      star.alpha = 0.95;
      star.twinkleDir = -1;
    } else if (star.alpha < 0.15) {
      star.alpha = 0.15;
      star.twinkleDir = 1;
    }

    pCtx.save();
    pCtx.globalAlpha = star.alpha;
    pCtx.fillStyle = star.color;
    pCtx.beginPath();
    pCtx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    pCtx.fill();
    pCtx.restore();
  });

  // 2. Render Floating Twilight Particles
  for (let i = 0; i < floatingParticles.length; i++) {
    const p = floatingParticles[i];
    p.y += p.speedY;
    p.x += p.speedX;
    p.pulse += p.pulseSpeed;

    const currentAlpha = p.alpha * (0.6 + 0.4 * Math.sin(p.pulse));

    pCtx.save();
    pCtx.fillStyle = `${p.color}${Math.max(0, currentAlpha)})`;
    pCtx.shadowColor = "rgba(90, 220, 255, 0.85)";
    pCtx.shadowBlur = 8;
    pCtx.beginPath();
    pCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    pCtx.fill();
    pCtx.restore();

    if (p.y < -30 || p.x < -30 || p.x > canvasWidth + 30) {
      floatingParticles[i] = createAmbientParticle(false);
    }
  }

  requestAnimationFrame(renderAtmosphericCanvas);
}

window.addEventListener("resize", () => {
  initStarfield();
  if (confettiCanvas) {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  }
});

// ==========================================
// 4. CANVAS 2: CELEBRATORY CONFETTI ENGINE 🎊
// ==========================================

const confettiCanvas = document.getElementById("confetti-canvas");
const cCtx = confettiCanvas ? confettiCanvas.getContext("2d") : null;

let activeCelebrationParticles = [];
let confettiAnimationId = null;

const CONFETTI_PALETTE = [
  "#f04e6c", "#ff7a6b", "#ffa580", "#ffd8b0",
  "#ff8eb5", "#ffffff", "#ffe8d6", "#dc395d", "#ffbe9f"
];

function triggerCelebrationBurst() {
  if (!confettiCanvas || !cCtx) return;

  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;

  activeCelebrationParticles = [];

  const count = 180;
  for (let i = 0; i < count; i++) {
    const isHeart = Math.random() < 0.25;
    const isStar = Math.random() < 0.15;

    activeCelebrationParticles.push({
      x: window.innerWidth * 0.5 + (Math.random() - 0.5) * 120,
      y: window.innerHeight * 0.65 + (Math.random() - 0.5) * 80,
      vx: (Math.random() - 0.5) * 22,
      vy: -(Math.random() * 18 + 10),
      gravity: 0.38,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 12,
      size: Math.random() * 12 + 8,
      color: CONFETTI_PALETTE[Math.floor(Math.random() * CONFETTI_PALETTE.length)],
      alpha: 1,
      type: isHeart ? "heart" : (isStar ? "star" : "ribbon"),
      decay: Math.random() * 0.005 + 0.003
    });
  }

  if (confettiAnimationId) {
    cancelAnimationFrame(confettiAnimationId);
  }
  renderConfettiFrame();
}

function renderConfettiFrame() {
  if (!cCtx) return;
  cCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

  for (let i = activeCelebrationParticles.length - 1; i >= 0; i--) {
    const p = activeCelebrationParticles[i];

    p.x += p.vx;
    p.y += p.vy;
    p.vy += p.gravity;
    p.vx *= 0.985;
    p.rotation += p.rotationSpeed;
    p.alpha -= p.decay;

    if (p.alpha <= 0 || p.y > confettiCanvas.height + 50) {
      activeCelebrationParticles.splice(i, 1);
      continue;
    }

    cCtx.save();
    cCtx.translate(p.x, p.y);
    cCtx.rotate((p.rotation * Math.PI) / 180);
    cCtx.globalAlpha = Math.max(0, p.alpha);

    if (p.type === "ribbon") {
      cCtx.fillStyle = p.color;
      cCtx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    } else if (p.type === "heart") {
      cCtx.fillStyle = p.color;
      drawHeartShape(cCtx, 0, 0, p.size);
    } else if (p.type === "star") {
      cCtx.fillStyle = p.color;
      drawStarShape(cCtx, 0, 0, 5, p.size * 0.7, p.size * 0.35);
    }

    cCtx.restore();
  }

  if (activeCelebrationParticles.length > 0) {
    confettiAnimationId = requestAnimationFrame(renderConfettiFrame);
  } else {
    cCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  }
}

function drawHeartShape(ctx, x, y, size) {
  const d = size * 0.5;
  ctx.beginPath();
  ctx.moveTo(x, y + d * 0.4);
  ctx.bezierCurveTo(x, y, x - d, y, x - d, y + d * 0.4);
  ctx.bezierCurveTo(x - d, y + d * 0.9, x, y + d * 1.3, x, y + d * 1.5);
  ctx.bezierCurveTo(x, y + d * 1.3, x + d, y + d * 0.9, x + d, y + d * 0.4);
  ctx.bezierCurveTo(x + d, y, x, y, x, y + d * 0.4);
  ctx.fill();
}

function drawStarShape(ctx, cx, cy, spikes, outerRadius, innerRadius) {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fill();
}

// ==========================================
// 5. SCREEN NAVIGATION & PROGRESS TRACKER
// ==========================================

const screens = [
  document.getElementById("screen-boop"),
  document.getElementById("screen-photos"),
  document.getElementById("screen-videos"),
  document.getElementById("screen-cake")
];

function navigateTo(targetIndex) {
  if (!isAccessUnlocked()) {
    return;
  }
  if (targetIndex < 0 || targetIndex >= TOTAL_SCREENS || targetIndex === currentScreenIndex) {
    return;
  }

  soundEngine.playClick();

  const prevScreen = screens[currentScreenIndex];
  const nextScreen = screens[targetIndex];

  if (!prevScreen || !nextScreen) return;

  // Manage exit class
  prevScreen.classList.remove("active");
  if (targetIndex > currentScreenIndex) {
    prevScreen.classList.add("exit-prev");
  } else {
    prevScreen.classList.remove("exit-prev");
  }

  setTimeout(() => {
    prevScreen.classList.remove("exit-prev");
  }, 750);

  // Activate next screen
  nextScreen.classList.add("active");
  currentScreenIndex = targetIndex;

  if (targetIndex > highestReachedScreen) {
    highestReachedScreen = targetIndex;
  }

  updateProgressTracker();
  window.scrollTo({ top: 0, behavior: "smooth" });

  // Pause slideshow if moving away from photo screen
  if (currentScreenIndex !== 1 && isSlideshowPlaying) {
    toggleSlideshowPlayback(false);
  }

  // Pause all running videos if moving away from video screen
  if (currentScreenIndex !== 2) {
    pauseAllVideos();
  }

  // Refresh 3D Cake canvas viewport when entering Screen 4
  if (targetIndex === 3 && window.Cake3D) {
    setTimeout(() => {
      window.Cake3D.resize();
    }, 80);
  }

  // Background music is strictly reserved for the final cake surprise.
  // Keep music completely OFF during intermediate screens (0, 1, 2) or before candle blowout.
  if (currentScreenIndex !== 3 || !birthdaySongUnlocked) {
    soundEngine.stopMusic();
  } else if (birthdaySongUnlocked && !soundEngine.isMuted && !soundEngine.isPlaying) {
    soundEngine.startMusic();
  }
}

function updateProgressTracker() {
  const indicators = document.querySelectorAll(".step-indicator");
  indicators.forEach((indicator, idx) => {
    indicator.classList.remove("active", "completed");
    if (idx === currentScreenIndex) {
      indicator.classList.add("active");
    } else if (idx < currentScreenIndex || idx <= highestReachedScreen) {
      indicator.classList.add("completed");
    }
  });
}

// Setup progress indicators click
document.querySelectorAll(".step-indicator").forEach(btn => {
  btn.addEventListener("click", () => {
    const targetIdx = parseInt(btn.dataset.stepIndex, 10);
    // Allow jumping to already reached screens or previous screens
    if (targetIdx <= highestReachedScreen + 1) {
      navigateTo(targetIdx);
    } else {
      showToast("Unlock this step by continuing the journey! ✨");
    }
  });
});

// Setup next/prev action buttons across all screens
document.querySelectorAll("[data-nav-target]").forEach(btn => {
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    const target = parseInt(btn.getAttribute("data-nav-target"), 10);
    navigateTo(target);
  });
});

// Keyboard navigation support
window.addEventListener("keydown", (e) => {
  if (!isAccessUnlocked()) return;
  if (document.querySelector(".modal-overlay.open")) return;
  if (document.activeElement && (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA")) return;

  if (e.key === "ArrowRight") {
    if (currentScreenIndex === 1) {
      nextPhotoSlide();
    } else if (currentScreenIndex < highestReachedScreen) {
      navigateTo(currentScreenIndex + 1);
    }
  } else if (e.key === "ArrowLeft") {
    if (currentScreenIndex === 1) {
      prevPhotoSlide();
    } else if (currentScreenIndex > 0) {
      navigateTo(currentScreenIndex - 1);
    }
  }
});

// ==========================================
// 6. SCREEN 1: NOSE BOOP SURPRISE 👃💗
// ==========================================

const characterStage = document.getElementById("character-stage");
const noseTriggerBtn = document.getElementById("nose-trigger-btn");

if (noseTriggerBtn && characterStage) {
  const executeBoop = (event) => {
    if (!isAccessUnlocked()) return;
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    // Play cute sound
    soundEngine.playBoop();

    // Trigger playful face reaction
    characterStage.classList.remove("booped");
    // Force reflow
    void characterStage.offsetWidth;
    characterStage.classList.add("booped");

    // Cute squish on the nose itself
    noseTriggerBtn.classList.remove("squished");
    void noseTriggerBtn.offsetWidth;
    noseTriggerBtn.classList.add("squished");
    setTimeout(() => noseTriggerBtn.classList.remove("squished"), 540);

    // Spawn expanding ripple effect
    spawnBoopRipple(characterStage);

    // Spawn tiny magical sparkles around the nose
    spawnBoopSparkles(characterStage);

    showToast("boop!", "✨");

    // Smoothly advance to photo memories after pleasant interaction delay
    setTimeout(() => {
      navigateTo(1);
    }, 780);
  };

  noseTriggerBtn.addEventListener("click", executeBoop);
  characterStage.addEventListener("click", (e) => {
    // If clicked anywhere near the character card, boop!
    executeBoop(e);
  });

  noseTriggerBtn.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      executeBoop(e);
    }
  });

  // Interactive 3D Cursor Parallax Tilt for the floating moon-character
  const characterCard = characterStage.querySelector(".character-card");
  if (characterCard) {
    let targetTiltX = 0;
    let targetTiltY = 0;
    let currentTiltX = 0;
    let currentTiltY = 0;
    let tiltRaf = null;

    const updateCharacterTilt = () => {
      currentTiltX += (targetTiltX - currentTiltX) * 0.12;
      currentTiltY += (targetTiltY - currentTiltY) * 0.12;

      characterCard.style.transform = `perspective(1000px) rotateX(${currentTiltX.toFixed(2)}deg) rotateY(${currentTiltY.toFixed(2)}deg) translateZ(12px)`;

      if (Math.abs(targetTiltX - currentTiltX) > 0.05 || Math.abs(targetTiltY - currentTiltY) > 0.05) {
        tiltRaf = requestAnimationFrame(updateCharacterTilt);
      } else {
        tiltRaf = null;
      }
    };

    window.addEventListener("mousemove", (e) => {
      if (currentScreenIndex !== 0) return;
      const rect = characterStage.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = (e.clientX - centerX) / (window.innerWidth * 0.5);
      const dy = (e.clientY - centerY) / (window.innerHeight * 0.5);

      // Smooth 3D tilt up to ±14 degrees
      targetTiltX = Math.max(-14, Math.min(14, -dy * 14));
      targetTiltY = Math.max(-14, Math.min(14, dx * 14));

      if (!tiltRaf) {
        tiltRaf = requestAnimationFrame(updateCharacterTilt);
      }
    }, { passive: true });

    characterStage.addEventListener("mouseleave", () => {
      targetTiltX = 0;
      targetTiltY = 0;
      if (!tiltRaf) {
        tiltRaf = requestAnimationFrame(updateCharacterTilt);
      }
    });
  }
}

function spawnBoopRipple(container) {
  const ripple = document.createElement("div");
  ripple.className = "boop-ripple";
  ripple.style.left = "50%";
  ripple.style.top = "50%";
  container.appendChild(ripple);

  setTimeout(() => ripple.remove(), 900);
}

function spawnBoopSparkles(container) {
  const sparkleGlyphs = ["✦", "✧", "✦", "·"];
  for (let i = 0; i < 9; i++) {
    const sparkle = document.createElement("span");
    sparkle.className = "boop-sparkle";
    sparkle.textContent = sparkleGlyphs[Math.floor(Math.random() * sparkleGlyphs.length)];

    const angle = (Math.PI * 2 * i) / 9 + (Math.random() - 0.5) * 0.5;
    const distance = Math.random() * 48 + 24;
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance - 5;
    const rot = (Math.random() - 0.5) * 70;

    sparkle.style.left = "50%";
    sparkle.style.top = "54%";
    sparkle.style.fontSize = `${0.65 + Math.random() * 0.55}rem`;
    sparkle.style.setProperty("--tx", `${tx}px`);
    sparkle.style.setProperty("--ty", `${ty}px`);
    sparkle.style.setProperty("--rot", `${rot}deg`);

    container.appendChild(sparkle);
    setTimeout(() => sparkle.remove(), 1050);
  }
}

// ==========================================
// 7. SCREEN 2: PHOTO MEMORIES PAGE 📸
// ==========================================

const carouselTrack = document.getElementById("photo-carousel-track");
const carouselDotsContainer = document.getElementById("photo-carousel-dots");
const slideshowToggleBtn = document.getElementById("slideshow-toggle-btn");
const batchUploadInput = document.getElementById("batch-photo-input");
const progressFill = document.getElementById("slideshow-progress-fill");

// Populate carousel dots
if (carouselDotsContainer) {
  carouselDotsContainer.innerHTML = "";
  for (let i = 0; i < TOTAL_PHOTO_SLOTS; i++) {
    const dot = document.createElement("button");
    dot.className = `carousel-dot ${i === 0 ? "active" : ""}`;
    dot.setAttribute("aria-label", `Slide ${i + 1}`);
    dot.addEventListener("click", () => goToPhotoSlide(i));
    carouselDotsContainer.appendChild(dot);
  }
}

function goToPhotoSlide(index) {
  if (index < 0) index = TOTAL_PHOTO_SLOTS - 1;
  if (index >= TOTAL_PHOTO_SLOTS) index = 0;

  currentPhotoSlide = index;

  if (carouselTrack) {
    const cardWidth = 320 + 28; // width + gap
    const containerWidth = carouselTrack.parentElement.offsetWidth;
    const centerOffset = (containerWidth - 320) / 2;
    const offset = -(index * cardWidth) + Math.max(0, centerOffset);

    // Apply horizontal transform on desktop, smooth scroll on mobile
    if (window.innerWidth > 992) {
      carouselTrack.style.transform = `translateX(${offset}px)`;
    } else {
      const cards = carouselTrack.querySelectorAll(".photo-card");
      if (cards[index]) {
        cards[index].scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    }
  }

  // Update active slide state
  const cards = document.querySelectorAll(".photo-card");
  cards.forEach((card, idx) => {
    card.classList.toggle("is-active-slide", idx === index);
  });

  // Update dots
  const dots = document.querySelectorAll(".carousel-dot");
  dots.forEach((dot, idx) => {
    dot.classList.toggle("active", idx === index);
  });

  // Reset progress bar on manual slide change
  if (isSlideshowPlaying) {
    slideshowProgressPercent = 0;
    if (progressFill) progressFill.style.width = "0%";
  }
}

function nextPhotoSlide() {
  soundEngine.playClick();
  goToPhotoSlide(currentPhotoSlide + 1);
}

function prevPhotoSlide() {
  soundEngine.playClick();
  goToPhotoSlide(currentPhotoSlide - 1);
}

document.getElementById("carousel-next-btn")?.addEventListener("click", nextPhotoSlide);
document.getElementById("carousel-prev-btn")?.addEventListener("click", prevPhotoSlide);

// Auto-play slideshow functionality
function toggleSlideshowPlayback(forceState = null) {
  if (forceState !== null) {
    isSlideshowPlaying = forceState;
  } else {
    isSlideshowPlaying = !isSlideshowPlaying;
  }

  if (isSlideshowPlaying) {
    startSlideshowTimer();
    if (slideshowToggleBtn) {
      slideshowToggleBtn.innerHTML = `<span>⏸️</span> Pause Slideshow`;
    }
    showToast("Slideshow Playing ▶️", "📸");
  } else {
    stopSlideshowTimer();
    if (slideshowToggleBtn) {
      slideshowToggleBtn.innerHTML = `<span>▶️</span> Auto Play`;
    }
  }
}

slideshowToggleBtn?.addEventListener("click", () => toggleSlideshowPlayback());

function startSlideshowTimer() {
  stopSlideshowTimer();
  slideshowProgressPercent = 0;

  const updateInterval = 50;
  const step = (updateInterval / SLIDESHOW_INTERVAL) * 100;

  slideshowProgressTimer = setInterval(() => {
    slideshowProgressPercent += step;
    if (progressFill) {
      progressFill.style.width = `${Math.min(100, slideshowProgressPercent)}%`;
    }

    if (slideshowProgressPercent >= 100) {
      slideshowProgressPercent = 0;
      nextPhotoSlide();
    }
  }, updateInterval);
}

function stopSlideshowTimer() {
  if (slideshowProgressTimer) {
    clearInterval(slideshowProgressTimer);
    slideshowProgressTimer = null;
  }
  if (progressFill) {
    progressFill.style.width = "0%";
  }
}

// Touch swipe support for mobile
let touchStartX = 0;
let touchEndX = 0;

carouselTrack?.addEventListener("touchstart", (e) => {
  touchStartX = e.changedTouches[0].screenX;
}, { passive: true });

carouselTrack?.addEventListener("touchend", (e) => {
  touchEndX = e.changedTouches[0].screenX;
  handleSwipeGesture();
}, { passive: true });

function handleSwipeGesture() {
  const threshold = 40;
  if (touchEndX < touchStartX - threshold) {
    nextPhotoSlide();
  } else if (touchEndX > touchStartX + threshold) {
    prevPhotoSlide();
  }
}

// Setup photo uploads & caption editing for all 6 slots
function initPhotoSlots() {
  const cards = document.querySelectorAll(".photo-card");

  cards.forEach((card, index) => {
    const fileInput = card.querySelector(".photo-file-input");
    const frame = card.querySelector(".photo-frame");
    const imgElement = card.querySelector(".photo-img");
    const placeholder = card.querySelector(".photo-placeholder");
    const removeBtn = card.querySelector(".remove-photo-btn");
    const captionText = card.querySelector(".photo-caption-text");
    const captionInput = card.querySelector(".photo-caption-input");
    const editIcon = card.querySelector(".edit-caption-icon");

    // Load saved caption if available
    if (appConfig.photoCaptions && appConfig.photoCaptions[index] && captionText) {
      captionText.textContent = appConfig.photoCaptions[index];
      if (captionInput) captionInput.value = appConfig.photoCaptions[index];
    }

    // Trigger file dialog
    card.querySelectorAll(".trigger-upload-btn").forEach(btn => {
      btn.addEventListener("click", () => fileInput?.click());
    });

    // File selected handler
    fileInput?.addEventListener("change", async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        showToast("Please select a valid image file (PNG, JPG, WebP) 📸", "⚠️");
        return;
      }

      // Save to IndexedDB permanently as local Blob backup
      await mediaStorage.saveMedia("photo", index, file);

      const imageUrl = registerObjectUrl(URL.createObjectURL(file));
      imgElement.src = imageUrl;
      imgElement.style.display = "block";
      if (placeholder) placeholder.style.display = "none";
      if (removeBtn) removeBtn.style.display = "inline-block";

      soundEngine.playClick();
      showToast(`Photo #${index + 1} updated! 💖`, "📸");
    });

    // Remove photo handler
    removeBtn?.addEventListener("click", async (e) => {
      e.stopPropagation();

      // Delete from IndexedDB permanently
      await mediaStorage.deleteMedia("photo", index);

      imgElement.src = "";
      imgElement.style.display = "none";
      if (placeholder) placeholder.style.display = "flex";
      if (removeBtn) removeBtn.style.display = "none";
      if (fileInput) fileInput.value = "";
      showToast(`Photo #${index + 1} reset to placeholder`);
    });

    // Caption inline editing
    const startEditing = () => {
      captionText.style.display = "none";
      captionInput.style.display = "block";
      captionInput.value = captionText.textContent;
      captionInput.focus();
      captionInput.select();
    };

    const finishEditing = () => {
      const newText = captionInput.value.trim() || `Moment #${index + 1}`;
      captionText.textContent = newText;
      captionInput.style.display = "none";
      captionText.style.display = "block";

      if (!appConfig.photoCaptions) appConfig.photoCaptions = [];
      appConfig.photoCaptions[index] = newText;
      saveConfig();
    };

    captionText?.addEventListener("click", startEditing);
    editIcon?.addEventListener("click", startEditing);
    captionInput?.addEventListener("blur", finishEditing);
    captionInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        finishEditing();
      } else if (e.key === "Escape") {
        captionInput.style.display = "none";
        captionText.style.display = "block";
      }
    });
  });
}

// Batch upload button handler (Add Photos)
batchUploadInput?.addEventListener("change", async (e) => {
  const files = Array.from(e.target.files).filter(f => f.type.startsWith("image/"));
  if (files.length === 0) {
    showToast("No valid image files found.", "⚠️");
    return;
  }

  const cards = document.querySelectorAll(".photo-card");
  let loadedCount = 0;

  for (let idx = 0; idx < Math.min(files.length, TOTAL_PHOTO_SLOTS); idx++) {
    const file = files[idx];
    const card = cards[idx];
    if (card) {
      const img = card.querySelector(".photo-img");
      const placeholder = card.querySelector(".photo-placeholder");
      const removeBtn = card.querySelector(".remove-photo-btn");

      // Save to IndexedDB permanently as local Blob backup
      await mediaStorage.saveMedia("photo", idx, file);

      const imageUrl = registerObjectUrl(URL.createObjectURL(file));
      img.src = imageUrl;
      img.style.display = "block";
      if (placeholder) placeholder.style.display = "none";
      if (removeBtn) removeBtn.style.display = "inline-block";
      loadedCount++;
    }
  }

  soundEngine.playClick();
  showToast(`Loaded ${loadedCount} photos into memories! ✨`, "📸");
});

// ==========================================
// 8. SCREEN 3: VIDEO MEMORIES PAGE 🎬
// ==========================================

function initVideoSlots() {
  const videoCards = document.querySelectorAll(".video-card");

  videoCards.forEach((card, index) => {
    const fileInput = card.querySelector(".video-file-input");
    const video = card.querySelector(".video-element");
    const container = card.querySelector(".video-player-container");
    const thumbnailOverlay = card.querySelector(".video-thumbnail-placeholder");
    const thumbnailClipName = card.querySelector(".thumbnail-clip-name");
    const replaceBtn = card.querySelector(".video-replace-btn");
    const titleEl = card.querySelector(".video-title-editable");
    const noteEl = card.querySelector(".video-caption-label");

    // Load saved captions from appConfig
    if (appConfig.videoCaptions && appConfig.videoCaptions[index]) {
      const savedTitle = appConfig.videoCaptions[index].title;
      const savedNote = appConfig.videoCaptions[index].note;
      if (titleEl && savedTitle) titleEl.textContent = savedTitle;
      if (thumbnailClipName && savedTitle) thumbnailClipName.textContent = savedTitle;
      if (noteEl && savedNote) noteEl.textContent = savedNote;
    }

    // Determine if video currently has a playable source
    function hasVideoSource() {
      if (!video) return false;
      const src = video.currentSrc || video.src;
      if (src && src.trim() !== "" && src !== window.location.href) {
        return true;
      }
      const sourceEl = video.querySelector("source");
      return Boolean(sourceEl && sourceEl.src && sourceEl.src.trim() !== "");
    }

    // 1. Initial State (Before Clicking Play):
    // - Hide actual video element & video frames
    // - Hide all native controls (timeline, volume, duration, fullscreen)
    // - Show the premium thumbnail placeholder with circular Play button
    if (video) {
      video.controls = false;
      video.style.display = "none";
      try {
        video.currentTime = 0;
      } catch (e) {}
    }

    if (container) {
      container.classList.remove("is-playing");
    }

    if (thumbnailOverlay) {
      thumbnailOverlay.style.display = "flex";
    }

    if (replaceBtn) {
      replaceBtn.style.display = "inline-flex";
    }

    // 2. Start Video Playback (After Clicking Play):
    // - Replaces thumbnail placeholder with the actual video
    // - Starts playing from 0:00
    // - Shows native video controls only after playback starts
    function startPlayback() {
      if (!video) return;

      if (!hasVideoSource()) {
        fileInput?.click();
        return;
      }

      // Pause any other video card currently playing
      pauseOtherVideos(video);

      // Duck background music
      soundEngine.pauseForVideo();

      // Reset playback position to 0:00
      try {
        video.currentTime = 0;
      } catch (e) {}

      // Reveal actual video element and hide thumbnail placeholder
      if (container) {
        container.classList.add("is-playing");
      }
      video.style.display = "block";
      if (thumbnailOverlay) {
        thumbnailOverlay.style.display = "none";
      }

      // Enable native controls only after playback starts
      video.controls = true;

      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.warn("Video play interrupted or requires user interaction:", err);
        });
      }
    }

    // 3. Stop Playback & Return to Thumbnail (After Video Ends / Reset):
    // - Shows video thumbnail/placeholder again
    // - Hides native controls
    // - Resets video playback position to 0:00
    function stopPlaybackAndShowThumbnail() {
      if (!video) return;

      video.pause();
      try {
        video.currentTime = 0;
      } catch (e) {}

      // Hide native controls
      video.controls = false;

      // Hide video element and show thumbnail placeholder
      video.style.display = "none";
      if (container) {
        container.classList.remove("is-playing");
      }
      if (thumbnailOverlay) {
        thumbnailOverlay.style.display = "flex";
      }

      // Resume background music if applicable
      soundEngine.resumeAfterVideo();
    }

    // Play button & thumbnail click interaction
    thumbnailOverlay?.addEventListener("click", () => {
      startPlayback();
    });

    thumbnailOverlay?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        startPlayback();
      }
    });

    // When video ends naturally:
    // - Show the video thumbnail/placeholder again
    // - Hide the native controls
    // - Clicking Play again restarts the video from 0:00
    video?.addEventListener("ended", () => {
      stopPlaybackAndShowThumbnail();
    });

    // Synchronize play & pause events
    video?.addEventListener("play", () => {
      pauseOtherVideos(video);
      soundEngine.pauseForVideo();
      if (container) container.classList.add("is-playing");
      video.style.display = "block";
      if (thumbnailOverlay) thumbnailOverlay.style.display = "none";
      video.controls = true;
    });

    video?.addEventListener("pause", () => {
      soundEngine.resumeAfterVideo();
    });

    // File Input change handler (Upload / Replace)
    fileInput?.addEventListener("change", async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      if (!file.type.startsWith("video/")) {
        showToast("Please select a valid video file (MP4, WebM, MOV) 🎬", "⚠️");
        return;
      }

      // Stop any current playback on this card
      stopPlaybackAndShowThumbnail();

      // Save to IndexedDB permanently as raw Blob with metadata
      await mediaStorage.saveMedia("video", index, file);

      const videoUrl = registerObjectUrl(URL.createObjectURL(file));
      video.src = videoUrl;
      video.preload = "none";
      video.controls = false;
      video.style.display = "none";

      if (container) container.classList.remove("is-playing");
      if (thumbnailOverlay) thumbnailOverlay.style.display = "flex";
      if (replaceBtn) replaceBtn.style.display = "inline-flex";

      soundEngine.playClick();
      showToast(`Clip #${index + 1} ready! Click Play to watch. 🎞️`, "🎬");
    });

    replaceBtn?.addEventListener("click", () => {
      fileInput?.click();
    });

    // Editable video title and note
    titleEl?.addEventListener("click", () => {
      const current = titleEl.textContent;
      const updated = prompt("Edit video title:", current);
      if (updated !== null && updated.trim() !== "") {
        const val = updated.trim();
        titleEl.textContent = val;
        if (thumbnailClipName) thumbnailClipName.textContent = val;
        if (!appConfig.videoCaptions) appConfig.videoCaptions = [];
        if (!appConfig.videoCaptions[index]) appConfig.videoCaptions[index] = {};
        appConfig.videoCaptions[index].title = val;
        saveConfig();
      }
    });

    noteEl?.addEventListener("click", () => {
      const current = noteEl.textContent;
      const updated = prompt("Edit video note / caption:", current);
      if (updated !== null && updated.trim() !== "") {
        const val = updated.trim();
        noteEl.textContent = val;
        if (!appConfig.videoCaptions) appConfig.videoCaptions = [];
        if (!appConfig.videoCaptions[index]) appConfig.videoCaptions[index] = {};
        appConfig.videoCaptions[index].note = val;
        saveConfig();
      }
    });
  });
}

function pauseAllVideos() {
  document.querySelectorAll(".video-element").forEach(v => {
    if (!v.paused) v.pause();
  });
}

function pauseOtherVideos(currentVideo) {
  document.querySelectorAll(".video-element").forEach(v => {
    if (v !== currentVideo && !v.paused) {
      v.pause();
    }
  });
}

// Batch video upload handler (Add Videos)
const batchVideoInput = document.getElementById("batch-video-input");
batchVideoInput?.addEventListener("change", async (e) => {
  const files = Array.from(e.target.files).filter(f => f.type.startsWith("video/"));
  if (files.length === 0) {
    showToast("No valid video files found (MP4, WebM, MOV) 🎬", "⚠️");
    return;
  }

  const videoCards = document.querySelectorAll(".video-card");
  let loadedCount = 0;

  for (let idx = 0; idx < Math.min(files.length, videoCards.length); idx++) {
    const file = files[idx];
    const card = videoCards[idx];
    if (card) {
      const video = card.querySelector(".video-element");
      const container = card.querySelector(".video-player-container");
      const thumbnailOverlay = card.querySelector(".video-thumbnail-placeholder");
      const replaceBtn = card.querySelector(".video-replace-btn");

      if (video) {
        video.pause();
        try { video.currentTime = 0; } catch (err) {}
      }

      // Save to IndexedDB permanently as raw Blob with metadata
      await mediaStorage.saveMedia("video", idx, file);

      const videoUrl = registerObjectUrl(URL.createObjectURL(file));
      if (video) {
        video.src = videoUrl;
        video.preload = "none";
        video.controls = false;
        video.style.display = "none";
      }
      if (container) container.classList.remove("is-playing");
      if (thumbnailOverlay) thumbnailOverlay.style.display = "flex";
      if (replaceBtn) replaceBtn.style.display = "inline-flex";
      loadedCount++;
    }
  }

  soundEngine.playClick();
  showToast(`Saved & loaded ${loadedCount} video clips! 🎞️`, "🎬");
});

// ==========================================
// 9. SCREEN 4: CHOCOLATE CAKE BIRTHDAY SURPRISE 🍫🎂
// ==========================================

const cakeBox = document.getElementById("cake-interactive-box");
const cakeTapPrompt = document.getElementById("cake-tap-prompt");
const blowCandlesBtn = document.getElementById("blow-candles-btn");
const micBlowBtn = document.getElementById("mic-blow-btn");
const micBtnIcon = document.getElementById("mic-btn-icon");
const micBtnText = document.getElementById("mic-btn-text");
const birthdayRevealPanel = document.getElementById("birthday-reveal-panel");
const recipientNameDisplay = document.getElementById("recipient-name-display");
const emotionalMessageDisplay = document.getElementById("emotional-message-display");
const replayCelebrationBtn = document.getElementById("replay-celebration-btn");

let cakeBlownOut = false;

function hideCakeControls() {
  if (cakeTapPrompt) {
    cakeTapPrompt.style.opacity = "0";
    setTimeout(() => (cakeTapPrompt.style.display = "none"), 500);
  }
  const toolbar = document.querySelector(".cake-controls-toolbar");
  if (toolbar) {
    toolbar.classList.add("hidden");
  }
  blowCandlesBtn?.classList.add("hidden");
}

function showCakeControls() {
  if (cakeTapPrompt) {
    cakeTapPrompt.style.display = "inline-flex";
    setTimeout(() => {
      cakeTapPrompt.style.opacity = "1";
    }, 50);
  }
  const toolbar = document.querySelector(".cake-controls-toolbar");
  if (toolbar) {
    toolbar.classList.remove("hidden");
  }
  blowCandlesBtn?.classList.remove("hidden");
}

function applyConfigToUI() {
  if (recipientNameDisplay) {
    recipientNameDisplay.textContent = `To ${appConfig.recipientName}`;
  }
  if (emotionalMessageDisplay) {
    emotionalMessageDisplay.textContent = appConfig.birthdayMessage;
  }
}

// Master Candle Blow & Celebration Handler
function triggerBlowCandles() {
  if (cakeBlownOut) {
    // Re-trigger celebratory effects if already blown out
    soundEngine.playBirthdayFanfare();
    triggerCelebrationBurst();
    return;
  }

  // 1. Play soft realistic wind whoosh sound
  soundEngine.playBlow();

  // 2. Trigger realistic 3D flame bending, incandescent ember wicks & rising smoke trails
  if (window.Cake3D) {
    window.Cake3D.blowCandles();
  }

  // 3. Hide prompt & blow toolbar immediately
  hideCakeControls();

  // 4. Once flames extinguish and smoke starts rising, trigger birthday fanfare & song
  setTimeout(() => {
    cakeBlownOut = true;
    birthdaySongUnlocked = true;

    // Play triumphant celebratory fanfare
    soundEngine.playBirthdayFanfare();

    // Launch celebratory confetti & floating hearts
    triggerCelebrationBurst();

    // Smoothly reveal the grand birthday message panel
    birthdayRevealPanel?.classList.add("revealed");

    // Start playing the locked birthday song!
    if (!soundEngine.isMuted) {
      soundEngine.startMusic();
    }

    showToast("HAPPY BIRTHDAY! 🎂💖✨", "🎉");
  }, 480);
}

if (cakeBox) {
  cakeBox.addEventListener("click", () => {
    triggerBlowCandles();
  });
  cakeBox.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      triggerBlowCandles();
    }
  });

  blowCandlesBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    triggerBlowCandles();
  });
}

// Microphone Breath Blow Detection
if (micBlowBtn) {
  micBlowBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    soundEngine.playClick();
    if (!window.Cake3D) return;

    if (window.Cake3D.micActive) {
      window.Cake3D.stopMicDetection();
      micBlowBtn.classList.remove("listening");
      if (micBtnText) micBtnText.textContent = "Blow with Mic";
      showToast("Microphone breath detection paused 🎙️");
      return;
    }

    showToast("Blow gently against your microphone! 💨🎙️");
    if (micBtnText) micBtnText.textContent = "Listening... 💨";
    micBlowBtn.classList.add("listening");

    const started = await window.Cake3D.startMicDetection(() => {
      triggerBlowCandles();
      micBlowBtn.classList.remove("listening");
      if (micBtnText) micBtnText.textContent = "Blow with Mic";
    });

    if (!started) {
      micBlowBtn.classList.remove("listening");
      if (micBtnText) micBtnText.textContent = "Blow with Mic";
      showToast("Mic access unavailable. Tap the cake or button to blow! ✨");
    }
  });
}

// Replay Birthday Celebration Button
replayCelebrationBtn?.addEventListener("click", () => {
  soundEngine.playClick();
  cakeBlownOut = false;

  // Song locks again until the cake surprise is revealed once more
  birthdaySongUnlocked = false;
  soundEngine.stopMusic();

  // Relight 3D candles & reignite flames
  if (window.Cake3D) {
    window.Cake3D.relightCandles();
  }

  // Show prompt & blow controls again
  showCakeControls();

  // Hide reveal panel
  birthdayRevealPanel?.classList.remove("revealed");

  showToast("Candles relit! Make a wish and blow them again 🎂✨");
});

// ==========================================
// 10. SAVED WISHES (PERMANENTLY LOCKED) 💜
// ==========================================
// Personalization customization options have been permanently removed.
// Wishes are locked to Buggaluuu with the designated birthday message.

// ==========================================
// 11. TOAST NOTIFICATION SYSTEM 🍞
// ==========================================

const toastContainer = document.getElementById("toast-container");

function showToast(message, icon = "✨") {
  if (!toastContainer) return;

  const toast = document.createElement("div");
  toast.className = "toast-message";
  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = "opacity 0.4s ease, transform 0.4s ease";
    toast.style.opacity = "0";
    toast.style.transform = "translateY(15px) scale(0.9)";
    setTimeout(() => toast.remove(), 400);
  }, 3200);
}

// ==========================================
// 11b. SECRET ACCESS KEY GATE CONTROLLER 🔐
// ==========================================

function spawnLockParticles(container) {
  if (!container) return;
  const particleSymbols = ["✨", "💜", "💫", "❤️", "🌙", "🌟", "💖", "✨"];
  const total = 18;

  for (let i = 0; i < total; i++) {
    const p = document.createElement("span");
    p.className = "lock-particle";
    p.textContent = particleSymbols[i % particleSymbols.length];
    
    const angle = (Math.PI * 2 * i) / total + (Math.random() * 0.4 - 0.2);
    const dist = 75 + Math.random() * 85;
    const tx = Math.cos(angle) * dist;
    const ty = Math.sin(angle) * dist - 25;

    p.style.setProperty("--tx", `${tx}px`);
    p.style.setProperty("--ty", `${ty}px`);
    p.style.left = "50%";
    p.style.top = "20%";
    p.style.fontSize = `${14 + Math.random() * 12}px`;
    p.style.animationDelay = `${Math.random() * 0.12}s`;

    container.appendChild(p);

    setTimeout(() => {
      p.remove();
    }, 1400);
  }
}

function initSecretLockScreen() {
  const lockScreen = document.getElementById("secret-lock-screen");
  const lockForm = document.getElementById("secret-lock-form");
  const keyInput = document.getElementById("secret-key-input");
  const eyeBtn = document.getElementById("toggle-key-visibility-btn");
  const eyeIcon = document.getElementById("eye-icon");
  const unlockBtn = document.getElementById("unlock-secret-btn");
  const feedbackEl = document.getElementById("lock-feedback");
  const cardEl = document.getElementById("lock-modal-card");
  const shackleEl = document.getElementById("lock-shackle");
  const inputGroup = document.getElementById("lock-input-group");

  if (!lockScreen) return;

  // 1. Session check: if already unlocked in this session, skip lock screen
  if (isAccessUnlocked()) {
    lockScreen.style.display = "none";
    document.body.classList.remove("is-locked");
    return;
  }

  // 2. Otherwise lock the site and present the Secret Access Key screen
  document.body.classList.add("is-locked");
  lockScreen.style.display = "flex";

  // Auto-focus input smoothly
  setTimeout(() => {
    keyInput?.focus();
  }, 350);

  // 3. Toggle key visibility (password <-> text)
  eyeBtn?.addEventListener("click", () => {
    if (!keyInput) return;
    if (keyInput.type === "password") {
      keyInput.type = "text";
      if (eyeIcon) eyeIcon.textContent = "🙈";
      eyeBtn.title = "Hide secret key";
    } else {
      keyInput.type = "password";
      if (eyeIcon) eyeIcon.textContent = "👁️";
      eyeBtn.title = "Show secret key";
    }
    keyInput.focus();
  });

  // 4. Handle Unlock Submission
  const handleUnlockAttempt = (e) => {
    if (e) e.preventDefault();
    const enteredVal = keyInput?.value || "";

    if (validateSecretKey(enteredVal)) {
      // SUCCESS!
      if (keyInput) keyInput.disabled = true;
      if (unlockBtn) unlockBtn.disabled = true;

      // Play soft celestial unlock chime
      if (window.soundEngine) {
        soundEngine.playUnlockSound();
      }

      // Display "Access Granted ❤️"
      if (feedbackEl) {
        feedbackEl.className = "lock-feedback success";
        feedbackEl.innerHTML = '<span class="feedback-icon">🔓</span> Access Granted ❤️';
      }

      // Lock shackle opens smoothly
      if (shackleEl) {
        shackleEl.classList.add("unlocked-shackle");
      }

      // Card glows with bioluminescent burst
      if (cardEl) {
        cardEl.classList.add("unlock-success");
      }

      // Spawn floating sparkles & hearts
      spawnLockParticles(cardEl);

      // Save to sessionStorage so same-session refreshes stay unlocked
      try {
        sessionStorage.setItem(SECRET_ACCESS_CONFIG.sessionStorageKey, "true");
      } catch (err) {
        console.warn("sessionStorage save failed:", err);
      }

      // Smoothly transition to the Boop It page
      setTimeout(() => {
        lockScreen.classList.add("fade-out");
        document.body.classList.remove("is-locked");

        setTimeout(() => {
          lockScreen.style.display = "none";
          // Focus the nose trigger for the user to enjoy the first interaction!
          const noseBtn = document.getElementById("nose-trigger-btn");
          noseBtn?.focus();
        }, 750);
      }, 900);

    } else {
      // INCORRECT KEY
      if (window.soundEngine) {
        soundEngine.playErrorSound();
      }

      if (feedbackEl) {
        feedbackEl.className = "lock-feedback error";
        feedbackEl.textContent = "Oops! That's not the magic key. Try again ❤️";
      }

      if (inputGroup) {
        inputGroup.classList.add("input-error");
        setTimeout(() => inputGroup.classList.remove("input-error"), 900);
      }

      if (cardEl) {
        cardEl.classList.remove("shake");
        void cardEl.offsetWidth; // Force CSS reflow to retrigger animation
        cardEl.classList.add("shake");
        setTimeout(() => cardEl.classList.remove("shake"), 650);
      }

      keyInput?.focus();
      keyInput?.select();
    }
  };

  lockForm?.addEventListener("submit", handleUnlockAttempt);
}

// ==========================================
// 12. INITIALIZATION ON DOM READY
// ==========================================

document.addEventListener("DOMContentLoaded", async () => {
  // Initialize Secret Access Key lock gate first
  initSecretLockScreen();

  initStarfield();
  renderAtmosphericCanvas();
  initPhotoSlots();
  initVideoSlots();

  // Retrieve & render all media items (Static defaults + local IndexedDB)
  await loadPersistedMedia();

  applyConfigToUI();
  updateProgressTracker();
  goToPhotoSlide(0);

  // Initialize Realistic 3D Birthday Cake Engine
  if (window.Cake3D) {
    window.Cake3D.init("cake-3d-viewport", "cake-3d-canvas");
  }

  // Sound toggle button in header
  const soundBtn = document.getElementById("toggle-sound-btn");
  soundBtn?.addEventListener("click", () => {
    soundEngine.toggleMusic();
  });

  // Load custom song from IndexedDB or local assets on startup
  soundEngine.loadInitialMusic();

  // Log friendly customization guide in console for developers
  console.log(
    "%c💜 A Magical Birthday Surprise Website 🌙%c\n\n" +
    "Welcome to this magical birthday experience!\n" +
    "- Recipient name & message are locked and saved to Buggaluuu.\n" +
    "- Photos & videos are bundled as static assets for permanent Vercel deployment.\n" +
    "- Audio effects and ambient moonlit music are procedurally synthesized via Web Audio API.\n" +
    "- Built with pure HTML, CSS, and vanilla JS.",
    "color: #7ddcff; font-size: 1.3rem; font-weight: bold;",
    "color: #a7c9da; font-size: 0.95rem;"
  );
});
