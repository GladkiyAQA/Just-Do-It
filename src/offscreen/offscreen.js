// Audio playback for the break (legal jazz radio / custom URL / uploaded mp3)
// + alarm bell. Runs in an offscreen document since the SW cannot play audio.

import { MUSIC_PRESETS, DEFAULT_MUSIC } from '../lib/musicSources.js';
import { loadMusicFile } from '../lib/musicDB.js';

const BELL_SRC = chrome.runtime.getURL('sounds/opening-bell.mp3');
const FADE_MS = 1500;
const STEP_MS = 50;

let audio = null;
let currentSrc = null;
let currentBlobUrl = null;
let fadeTimer = null;
let bell = null;

function clearFade() {
  if (fadeTimer) { clearInterval(fadeTimer); fadeTimer = null; }
}

function resolveSrc(music) {
  if (music.source === 'preset') {
    const p = MUSIC_PRESETS.find((x) => x.id === music.presetId);
    return p?.url || null;
  }
  if (music.source === 'url') {
    return music.customUrl?.trim() || null;
  }
  return null; // 'file' resolved separately via IndexedDB
}

async function getStream(music) {
  if (music.source === 'file') {
    const blob = await loadMusicFile();
    if (!blob) return null;
    if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);
    currentBlobUrl = URL.createObjectURL(blob);
    return currentBlobUrl;
  }
  return resolveSrc(music);
}

async function musicStart() {
  const data = await chrome.storage.local.get(['music', 'musicLastTime']);
  const music = { ...DEFAULT_MUSIC, ...(data.music || {}) };
  if (!music.enabled) return;

  const src = await getStream(music);
  if (!src) return;

  // If the source changed, rebuild the audio element.
  if (!audio || currentSrc !== src) {
    if (audio) {
      try { audio.pause(); } catch {}
    }
    audio = new Audio(src);
    audio.loop = music.source === 'file'; // loop user files; streams just keep going
    audio.volume = 0;
    currentSrc = src;
    // Resume from saved position only for files (radio streams ignore currentTime).
    if (music.source === 'file' && data.musicLastTime) {
      audio.addEventListener(
        'loadedmetadata',
        () => {
          try { audio.currentTime = data.musicLastTime || 0; } catch {}
        },
        { once: true },
      );
    }
  }

  clearFade();
  try { await audio.play(); } catch {}

  const target = Math.max(0, Math.min(1, music.volume ?? 0.35));
  const start = audio.volume;
  const step = (target - start) / (FADE_MS / STEP_MS);
  fadeTimer = setInterval(() => {
    const next = audio.volume + step;
    audio.volume =
      step >= 0 ? Math.min(target, next) : Math.max(target, next);
    if (Math.abs(audio.volume - target) < 0.01) {
      audio.volume = target;
      clearFade();
    }
  }, STEP_MS);
}

async function musicStop() {
  if (!audio) return;
  clearFade();
  // Save current position for files (so next break resumes there).
  try {
    if (audio.src && currentBlobUrl && audio.src.startsWith('blob:')) {
      await chrome.storage.local.set({ musicLastTime: audio.currentTime || 0 });
    }
  } catch {}
  const start = audio.volume;
  const step = start / (FADE_MS / STEP_MS);
  fadeTimer = setInterval(() => {
    audio.volume = Math.max(0, audio.volume - step);
    if (audio.volume <= 0.01) {
      audio.volume = 0;
      try { audio.pause(); } catch {}
      clearFade();
    }
  }, STEP_MS);
}

async function musicSetVolume(v) {
  if (!audio) return;
  audio.volume = Math.max(0, Math.min(1, Number(v) || 0));
}

async function playBellOnce() {
  if (!bell) {
    bell = new Audio(BELL_SRC);
  }
  try {
    const { music } = await chrome.storage.local.get('music');
    const volume = music?.volume ?? 0.35;
    bell.volume = Math.max(0, Math.min(1, volume));
    bell.currentTime = 0;
    bell.play().catch(() => {});
  } catch {}
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'BREAK_MUSIC_START')   musicStart();
  if (msg.type === 'BREAK_MUSIC_STOP')    musicStop();
  if (msg.type === 'BREAK_MUSIC_VOLUME')  musicSetVolume(msg.volume);
  if (msg.type === 'PLAY_BELL')           playBellOnce();
});
