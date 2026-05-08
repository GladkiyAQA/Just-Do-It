import { storage } from './storage.js';

const btnTheme = document.getElementById('btnTheme');
const THEMES = ['light', 'dark', 'crystal', 'notion', 'paper'];
const ICONS  = { light: '🌙', dark: '☀️', crystal: '🌿', notion: '📋', paper: '📝' };

export function applyCrystalHue(hue) {
  document.documentElement.style.setProperty('--crystal-hue', hue ?? 160);
}

export function applyTheme(theme) {
  document.body.classList.remove('dark', 'crystal', 'notion', 'paper');
  if (theme === 'dark')    document.body.classList.add('dark');
  if (theme === 'crystal') document.body.classList.add('crystal');
  if (theme === 'notion')  document.body.classList.add('notion');
  if (theme === 'paper')   document.body.classList.add('paper');
  btnTheme.textContent = ICONS[theme] ?? '🌙';
}

export function initTheme() {
  btnTheme.addEventListener('click', () => {
    const current = document.body.classList.contains('dark')    ? 'dark'
                  : document.body.classList.contains('crystal') ? 'crystal'
                  : document.body.classList.contains('notion')  ? 'notion'
                  : document.body.classList.contains('paper')   ? 'paper'
                  : 'light';
    const next = THEMES[(THEMES.indexOf(current) + 1) % THEMES.length];
    applyTheme(next);
    storage.saveTheme(next);
  });
}
