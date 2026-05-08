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

function musicStart() {
  clearFade();
  const a = getAudio();
  if (a.paused) a.play().catch(() => {});
  a.volume = 0;
  const step = MAX_VOL / (FADE_MS / STEP_MS);
  fadeTimer = setInterval(() => {
    a.volume = Math.min(MAX_VOL, a.volume + step);
    if (a.volume >= MAX_VOL) clearFade();
  }, STEP_MS);
}

function musicStop() {
  if (!audio) return;
  clearFade();
  const step = MAX_VOL / (FADE_MS / STEP_MS);
  fadeTimer = setInterval(() => {
    audio.volume = Math.max(0, audio.volume - step);
    if (audio.volume <= 0) clearFade();
  }, STEP_MS);
}

chrome.runtime.onMessage.addListener(msg => {
  if (msg.type === 'BREAK_MUSIC_START') musicStart();
  if (msg.type === 'BREAK_MUSIC_STOP')  musicStop();
});
