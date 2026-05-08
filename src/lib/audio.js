// Send messages to the offscreen document. The offscreen document is created
// on demand by the service worker (see src/background/index.js).

export function startBreakMusic() {
  chrome.runtime.sendMessage({ type: 'ENSURE_OFFSCREEN' }).catch(() => {});
  // Tiny delay to let the SW spawn the offscreen doc if needed.
  setTimeout(() => {
    chrome.runtime.sendMessage({ type: 'BREAK_MUSIC_START' }).catch(() => {});
  }, 250);
}

export function stopBreakMusic() {
  chrome.runtime.sendMessage({ type: 'BREAK_MUSIC_STOP' }).catch(() => {});
}

export function setBreakMusicVolume(volume) {
  chrome.runtime.sendMessage({ type: 'BREAK_MUSIC_VOLUME', volume }).catch(() => {});
}
