document.getElementById('btnBack').addEventListener('click', () => {
  window.location.href = chrome.runtime.getURL('popup.html');
});

function applyTheme(theme) {
  document.body.classList.remove('dark', 'crystal', 'notion', 'paper');
  if (theme === 'dark')    document.body.classList.add('dark');
  if (theme === 'crystal') document.body.classList.add('crystal');
  if (theme === 'notion')  document.body.classList.add('notion');
  if (theme === 'paper')   document.body.classList.add('paper');

  document.querySelectorAll('input[name="themeChoice"]').forEach(r => {
    r.checked = (r.value === (theme || 'light'));
  });

  document.getElementById('crystalHueSection').style.display =
    theme === 'crystal' ? 'block' : 'none';
}

// ── Crystal Hue Wheel ──────────────────────────────────────────────────────
const hueCanvas  = document.getElementById('hueWheel');
const huePreview = document.getElementById('crystalHuePreview');
const hueValueEl = document.getElementById('crystalHueValue');
let currentHue   = 160;
let draggingHue  = false;

function drawHueWheel(canvas, hue) {
  const ctx = canvas.getContext('2d');
  const cx  = canvas.width  / 2;
  const cy  = canvas.height / 2;
  const outerR = cx - 3;
  const innerR = outerR * 0.50;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 360; i++) {
    const a0 = ((i - 90 - 0.7) * Math.PI) / 180;
    const a1 = ((i - 90 + 0.7) * Math.PI) / 180;
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, a0, a1);
    ctx.arc(cx, cy, innerR, a1, a0, true);
    ctx.closePath();
    ctx.fillStyle = `hsl(${i}, 80%, 55%)`;
    ctx.fill();
  }

  const selRad = ((hue - 90) * Math.PI) / 180;
  const dotR   = (outerR + innerR) / 2;
  const dx     = cx + Math.cos(selRad) * dotR;
  const dy     = cy + Math.sin(selRad) * dotR;

  ctx.beginPath();
  ctx.arc(dx, dy, 8, 0, 2 * Math.PI);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.22)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(dx, dy, 5, 0, 2 * Math.PI);
  ctx.fillStyle = `hsl(${hue}, 80%, 55%)`;
  ctx.fill();
}

function hueFromEvent(canvas, e) {
  const rect    = canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  const x       = clientX - rect.left  - canvas.width  / 2;
  const y       = clientY - rect.top   - canvas.height / 2;
  const angle   = Math.atan2(y, x) * 180 / Math.PI + 90;
  return ((angle % 360) + 360) % 360;
}

function applyHue(hue) {
  currentHue = Math.round(hue);
  document.documentElement.style.setProperty('--crystal-hue', currentHue);
  drawHueWheel(hueCanvas, currentHue);
  huePreview.style.background = `hsl(${currentHue}, 63%, 52%)`;
  hueValueEl.textContent = `${currentHue}°`;
  const dot = document.querySelector('.theme-preview--crystal .tp-dot');
  if (dot) dot.style.background = `hsl(${currentHue}, 63%, 52%)`;
}

function saveHue() {
  chrome.storage.local.set({ crystalHue: currentHue });
  showToast();
}

hueCanvas.addEventListener('mousedown', e => {
  draggingHue = true;
  applyHue(hueFromEvent(hueCanvas, e));
});
document.addEventListener('mousemove', e => {
  if (draggingHue) applyHue(hueFromEvent(hueCanvas, e));
});
document.addEventListener('mouseup', () => {
  if (draggingHue) { draggingHue = false; saveHue(); }
});
hueCanvas.addEventListener('touchstart', e => {
  e.preventDefault();
  applyHue(hueFromEvent(hueCanvas, e));
}, { passive: false });
hueCanvas.addEventListener('touchmove', e => {
  e.preventDefault();
  applyHue(hueFromEvent(hueCanvas, e));
}, { passive: false });
hueCanvas.addEventListener('touchend', saveHue);

// ──────────────────────────────────────────────────────────────────────────

// Load current settings and apply theme
chrome.storage.local.get(['uiMode', 'autoMode', 'theme', 'crystalHue', 'durations'], data => {
  const theme = data.theme || 'light';
  applyTheme(theme);

  currentHue = data.crystalHue ?? 160;
  document.documentElement.style.setProperty('--crystal-hue', currentHue);
  drawHueWheel(hueCanvas, currentHue);
  huePreview.style.background = `hsl(${currentHue}, 63%, 52%)`;
  hueValueEl.textContent = `${currentHue}°`;
  const dot = document.querySelector('.theme-preview--crystal .tp-dot');
  if (dot) dot.style.background = `hsl(${currentHue}, 63%, 52%)`;

  const mode = data.uiMode || 'popup';
  const radio = document.querySelector(`input[name="uiMode"][value="${mode}"]`);
  if (radio) radio.checked = true;
  highlightSelected(mode);

  document.getElementById('autoMode').checked = !!data.autoMode;

  if (data.durations) {
    applyDurationsToInputs(data.durations);
  }
});

// Theme selection
document.querySelectorAll('input[name="themeChoice"]').forEach(radio => {
  radio.addEventListener('change', () => {
    applyTheme(radio.value);
    chrome.storage.local.set({ theme: radio.value });
    showToast();
  });
});

// UI mode change
document.querySelectorAll('input[name="uiMode"]').forEach(radio => {
  radio.addEventListener('change', () => {
    chrome.storage.local.set({ uiMode: radio.value });
    highlightSelected(radio.value);
    showToast();
  });
});

// Auto-mode change
document.getElementById('autoMode').addEventListener('change', e => {
  chrome.storage.local.set({ autoMode: e.target.checked });
  showToast();
});

function applyDurationsToInputs(d) {
  const toSecs = v => (d._v === 2 ? v : v * 60);
  const pomSecs   = toSecs(d.pomodoro ?? 25);
  const shortSecs = toSecs(d.short    ?? 5);
  const longSecs  = toSecs(d.long     ?? 15);
  document.getElementById('durPomM').value   = Math.floor(pomSecs / 60);
  document.getElementById('durPomS').value   = pomSecs % 60;
  document.getElementById('durShortM').value = Math.floor(shortSecs / 60);
  document.getElementById('durShortS').value = shortSecs % 60;
  document.getElementById('durLongM').value  = Math.floor(longSecs / 60);
  document.getElementById('durLongS').value  = longSecs % 60;
}

function saveDurations() {
  const pomSecs   = parseInt(document.getElementById('durPomM').value || '0') * 60
                  + parseInt(document.getElementById('durPomS').value || '0');
  const shortSecs = parseInt(document.getElementById('durShortM').value || '0') * 60
                  + parseInt(document.getElementById('durShortS').value || '0');
  const longSecs  = parseInt(document.getElementById('durLongM').value || '0') * 60
                  + parseInt(document.getElementById('durLongS').value || '0');
  chrome.storage.local.set({ durations: {
    _v: 2,
    pomodoro: Math.max(1, pomSecs),
    short:    Math.max(1, shortSecs),
    long:     Math.max(1, longSecs),
  }});
  showToast();
}

['durPomM', 'durPomS', 'durShortM', 'durShortS', 'durLongM', 'durLongS'].forEach(id => {
  document.getElementById(id).addEventListener('change', saveDurations);
});

function highlightSelected(value) {
  document.querySelectorAll('.mode-item').forEach(el => {
    el.classList.toggle('active', el.dataset.value === value);
  });
}

function showToast() {
  const toast = document.getElementById('savedToast');
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 1600);
}
