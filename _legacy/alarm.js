const WORK_PHRASES = [
  'Ты отлично поработал! 🎉',
  'Настоящий фокус — это сила!',
  'Отличная работа, продолжай!',
  'Ещё один Pomodoro позади 💪',
  'Концентрация — ключ к успеху!',
  'Продуктивность в деле!',
  'Ты заслужил этот отдых 😌',
];

let BREAK_DURATION = 5 * 60;

let breakInterval = null;

// ── Offscreen audio ──────────────────────────────────────────

async function ensureOffscreen() {
  const contexts = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
  if (contexts.length > 0) return;
  await chrome.offscreen.createDocument({
    url: chrome.runtime.getURL('offscreen.html'),
    reasons: ['AUDIO_PLAYBACK'],
    justification: 'Break music playback',
  });
}

async function musicSend(type) {
  await ensureOffscreen();
  chrome.runtime.sendMessage({ type }).catch(() => {});
}

// ── Helpers ──────────────────────────────────────────────────

function pickPhrase() {
  return WORK_PHRASES[Math.floor(Math.random() * WORK_PHRASES.length)];
}

function formatTime(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function switchState(hideId, showId) {
  const hideEl = document.getElementById(hideId);
  const showEl = document.getElementById(showId);
  hideEl.classList.add('hidden');
  showEl.classList.remove('hidden');
  showEl.classList.add('enter');
  showEl.addEventListener('animationend', () => showEl.classList.remove('enter'), { once: true });
}

function clearBreakState() {
  chrome.storage.local.remove(['breakActive', 'breakEndTime', 'alarmWindowId', 'alarmWindowRect']);
}

// ── Break timer ───────────────────────────────────────────────

function runBreakTick(endTime) {
  clearInterval(breakInterval);
  const display = document.getElementById('breakTimerDisplay');
  breakInterval = setInterval(() => {
    const secsLeft = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
    display.textContent = formatTime(secsLeft);
    if (secsLeft <= 0) {
      clearInterval(breakInterval);
      clearBreakState();
      musicSend('BREAK_MUSIC_STOP');
      // Auto-mode: skip the "Новый Pomodoro" screen and start immediately
      chrome.storage.local.get('autoMode', ({ autoMode }) => {
        if (autoMode) {
          chrome.storage.local.set({ pendingStart: true }, () => window.close());
        } else {
          switchState('stateBreak', 'stateBreakDone');
        }
      });
    }
  }, 1000);
}

function startBreak() {
  const endTime = Date.now() + BREAK_DURATION * 1000;
  chrome.storage.local.set({ breakActive: true, breakEndTime: endTime });
  document.getElementById('breakTimerDisplay').textContent = formatTime(BREAK_DURATION);
  switchState('stateWorkDone', 'stateBreak');
  musicSend('BREAK_MUSIC_START');
  runBreakTick(endTime);
}

function resumeBreak(endTime) {
  const secsLeft = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
  document.getElementById('breakTimerDisplay').textContent = formatTime(secsLeft);
  switchState('stateWorkDone', 'stateBreak');
  musicSend('BREAK_MUSIC_START');
  runBreakTick(endTime);
}

function skipBreak() {
  clearInterval(breakInterval);
  clearBreakState();
  musicSend('BREAK_MUSIC_STOP');
  switchState('stateBreak', 'stateBreakDone');
}

// ── Init ──────────────────────────────────────────────────────

function init() {
  chrome.storage.local.get(['theme', 'breakActive', 'breakEndTime', 'durations', 'autoMode'], data => {
    document.body.classList.remove('dark', 'crystal');
    if (data.theme === 'dark')    document.body.classList.add('dark');
    if (data.theme === 'crystal') document.body.classList.add('crystal');
    const dur = data.durations;
    BREAK_DURATION = dur?._v === 2 ? (dur.short ?? 300) : (dur?.short ?? 5) * 60;
    document.getElementById('workPhrase').textContent = pickPhrase();

    document.getElementById('btnStartBreak').addEventListener('click', startBreak);
    document.getElementById('btnContinue').addEventListener('click', () => {
      chrome.storage.local.set({ pendingStart: true }, () => window.close());
    });
    document.getElementById('btnClose1').addEventListener('click', () => window.close());
    document.getElementById('btnSkipBreak').addEventListener('click', skipBreak);
    document.getElementById('btnNewPomodoro').addEventListener('click', () => {
      chrome.storage.local.set({ pendingStart: true }, () => window.close());
    });
    document.getElementById('btnClose2').addEventListener('click', () => window.close());

    if (data.breakActive && data.breakEndTime > Date.now()) {
      resumeBreak(data.breakEndTime);
    } else if (data.breakActive) {
      clearBreakState();
    } else if (data.autoMode) {
      startBreak();
    }
  });
}

init();
