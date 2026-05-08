const SRC = chrome.runtime.getURL('sounds/jazz-sound-2.mp3');
const MAX_VOL = 0.25;
const FADE_MS = 2000;
const STEP_MS = 50;

let audio = null;
let fadeTimer = null;

function getAudio() {
  if (!audio) {
    audio = new Audio(SRC);
    audio.loop = true;
    audio.volume = 0;
  }
  return audio;
}

function clearFade() {
  if (fadeTimer) { clearInterval(fadeTimer); fadeTimer = null; }
}

export function breakMusicStart() {
  clearFade();
  const a = getAudio();
  a.volume = 0;
  a.play().catch(() => {});

  const step = MAX_VOL / (FADE_MS / STEP_MS);
  fadeTimer = setInterval(() => {
    a.volume = Math.min(MAX_VOL, a.volume + step);
    if (a.volume >= MAX_VOL) clearFade();
  }, STEP_MS);
}

export function breakMusicStop() {
  if (!audio || audio.paused) return;
  clearFade();

  const step = audio.volume / (FADE_MS / STEP_MS);
  fadeTimer = setInterval(() => {
    audio.volume = Math.max(0, audio.volume - step);
    if (audio.volume <= 0) {
      clearFade();
      audio.pause();
    }
  }, STEP_MS);
}
