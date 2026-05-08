// Direct in-page music player for the break audio. Used both by the alarm
// window (during the actual break) and the settings preview button.

import { MUSIC_PRESETS, DEFAULT_MUSIC } from './musicSources.js';
import { loadMusicFile } from './musicDB.js';
import { storage } from './storage.js';

const FADE_MS = 1200;
const STEP_MS = 50;

export async function resolveMusicSrc(music) {
  const m = { ...DEFAULT_MUSIC, ...(music || {}) };
  if (!m.enabled) return null;
  if (m.source === 'preset') {
    const p = MUSIC_PRESETS.find((x) => x.id === m.presetId);
    return p?.url || null;
  }
  if (m.source === 'url') {
    return m.customUrl?.trim() || null;
  }
  if (m.source === 'file') {
    const blob = await loadMusicFile();
    if (!blob) return null;
    return URL.createObjectURL(blob);
  }
  return null;
}

export class MusicPlayer {
  constructor() {
    this.audio = null;
    this.fadeTimer = null;
    this.objectUrl = null;
  }
  _clearFade() {
    if (this.fadeTimer) { clearInterval(this.fadeTimer); this.fadeTimer = null; }
  }
  setVolume(v) {
    if (this.audio) this.audio.volume = Math.max(0, Math.min(1, Number(v) || 0));
  }
  async start(music) {
    const src = await resolveMusicSrc(music);
    if (!src) return { ok: false, reason: 'no-source' };

    this._clearFade();
    if (this.audio && this.audio.src !== src) {
      try { this.audio.pause(); } catch {}
      if (this.objectUrl) { URL.revokeObjectURL(this.objectUrl); this.objectUrl = null; }
      this.audio = null;
    }

    if (!this.audio) {
      this.audio = new Audio(src);
      this.audio.crossOrigin = 'anonymous';
      this.audio.loop = music.source === 'file';
      this.audio.volume = 0;
      if (src.startsWith('blob:')) this.objectUrl = src;
      // For files, resume from saved position.
      if (music.source === 'file') {
        const { musicLastTime } = await storage.get(['musicLastTime']);
        if (musicLastTime) {
          this.audio.addEventListener(
            'loadedmetadata',
            () => { try { this.audio.currentTime = musicLastTime; } catch {} },
            { once: true },
          );
        }
      }
    }

    try {
      await this.audio.play();
    } catch (e) {
      return { ok: false, reason: 'play-rejected', error: String(e) };
    }

    const target = Math.max(0, Math.min(1, music.volume ?? 0.35));
    const start = this.audio.volume;
    const step = (target - start) / (FADE_MS / STEP_MS);
    this.fadeTimer = setInterval(() => {
      if (!this.audio) { this._clearFade(); return; }
      const next = this.audio.volume + step;
      this.audio.volume = step >= 0 ? Math.min(target, next) : Math.max(target, next);
      if (Math.abs(this.audio.volume - target) < 0.01) {
        this.audio.volume = target;
        this._clearFade();
      }
    }, STEP_MS);

    return { ok: true };
  }
  async stop({ savePosition = false } = {}) {
    if (!this.audio) return;
    this._clearFade();
    if (savePosition && this.objectUrl) {
      try {
        await storage.set({ musicLastTime: this.audio.currentTime || 0 });
      } catch {}
    }
    const audio = this.audio;
    const start = audio.volume;
    const step = start / (FADE_MS / STEP_MS);
    this.fadeTimer = setInterval(() => {
      audio.volume = Math.max(0, audio.volume - step);
      if (audio.volume <= 0.01) {
        audio.volume = 0;
        try { audio.pause(); } catch {}
        this._clearFade();
      }
    }, STEP_MS);
  }
  destroy() {
    this._clearFade();
    if (this.audio) {
      try { this.audio.pause(); } catch {}
      this.audio = null;
    }
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }
}
