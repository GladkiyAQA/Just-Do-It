// Service worker — no DOM, no React. Pure event glue.
// Alarm name kept in sync with src/lib/timer.js.

const ALARM_NAME = 'pomodoroAlarm';
const POPUP_PATH = 'src/popup/index.html';
const ALARM_PATH = 'src/alarm/index.html';
const OFFSCREEN_PATH = 'src/offscreen/index.html';

const DEFAULT_DURATIONS = { _v: 2, pomodoro: 25 * 60, short: 5 * 60, long: 15 * 60 };
function normalizeDurations(d) {
  if (!d) return { ...DEFAULT_DURATIONS };
  if (d._v === 2) return d;
  return {
    _v: 2,
    pomodoro: (d.pomodoro ?? 25) * 60,
    short:    (d.short    ?? 5)  * 60,
    long:     (d.long     ?? 15) * 60,
  };
}

async function startPomodoroFromSW() {
  const { durations } = await chrome.storage.local.get('durations');
  const dur = normalizeDurations(durations);
  const seconds = dur.pomodoro;
  const endTime = Date.now() + seconds * 1000;
  await chrome.storage.local.set({
    timerState: { mode: 'pomodoro', isRunning: true, endTime, secondsLeft: seconds },
  });
  chrome.alarms.create(ALARM_NAME, { when: endTime });
}

let offscreenReady = false;

async function ensureOffscreen() {
  const url = chrome.runtime.getURL(OFFSCREEN_PATH);
  const has = await chrome.offscreen.hasDocument().catch(() => false);
  if (has) {
    offscreenReady = true;
    return;
  }
  try {
    await chrome.offscreen.createDocument({
      url,
      reasons: ['AUDIO_PLAYBACK'],
      justification: 'Воспроизведение звука уведомлений и фоновой музыки на перерыве',
    });
    // Give the document time to register its onMessage listener.
    await new Promise((r) => setTimeout(r, 250));
    offscreenReady = true;
  } catch (e) {
    // Race: already exists.
    offscreenReady = true;
  }
}

async function playBell() {
  await ensureOffscreen();
  for (let i = 0; i < 3; i++) {
    try {
      await chrome.runtime.sendMessage({ type: 'PLAY_BELL' });
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 150));
    }
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'ENSURE_OFFSCREEN') {
    ensureOffscreen().then(() => sendResponse({ ok: true })).catch(() => sendResponse({ ok: false }));
    return true;
  }
  if (msg?.type === 'FOCUS_ALARM_IF_EXISTS') {
    focusAlarmIfExists().then((focused) => sendResponse({ focused })).catch(() => sendResponse({ focused: false }));
    return true;
  }
});

async function focusAlarmIfExists() {
  const { alarmWindowId } = await chrome.storage.local.get('alarmWindowId');
  if (!alarmWindowId) return false;
  try {
    const win = await chrome.windows.get(alarmWindowId, { populate: true });
    // Verify this is really our alarm popup — Chrome reuses window IDs across
    // sessions, so a stale id might point to an unrelated browser window.
    const isAlarm =
      (win?.type === 'popup' || win?.type === 'normal') &&
      win.tabs?.some((t) => (t.url || '').includes('/src/alarm/index.html'));
    if (!isAlarm) {
      await chrome.storage.local.remove('alarmWindowId');
      return false;
    }
    await chrome.windows.update(alarmWindowId, { focused: true, drawAttention: true });
    return true;
  } catch {
    await chrome.storage.local.remove('alarmWindowId');
    return false;
  }
}

// Clean up the stored alarm window id when it gets closed.
chrome.windows.onRemoved.addListener(async (closedId) => {
  const { alarmWindowId, popupWindowId } = await chrome.storage.local.get([
    'alarmWindowId', 'popupWindowId',
  ]);
  const patch = {};
  if (alarmWindowId === closedId) patch.alarmWindowId = undefined;
  if (popupWindowId === closedId) patch.popupWindowId = undefined;
  if (Object.keys(patch).length) {
    const removeKeys = Object.keys(patch);
    await chrome.storage.local.remove(removeKeys);
  }
});

function applyUiMode(mode) {
  if (mode === 'sidebar') {
    chrome.action.setPopup({ popup: '' });
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
  } else {
    chrome.action.setPopup({ popup: POPUP_PATH });
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});
  }
}

async function initUiMode() {
  const { uiMode } = await chrome.storage.local.get('uiMode');
  applyUiMode(uiMode || 'popup');
}

chrome.runtime.onInstalled.addListener(initUiMode);
chrome.runtime.onStartup.addListener(initUiMode);
initUiMode();

// On SW wake-up, drop any stale window ids — they may point to unrelated
// windows after a browser restart.
(async () => {
  const { alarmWindowId, popupWindowId } = await chrome.storage.local.get([
    'alarmWindowId', 'popupWindowId',
  ]);
  const toRemove = [];
  for (const [key, id] of [['alarmWindowId', alarmWindowId], ['popupWindowId', popupWindowId]]) {
    if (!id) continue;
    try {
      await chrome.windows.get(id);
    } catch {
      toRemove.push(key);
    }
  }
  if (toRemove.length) chrome.storage.local.remove(toRemove);
})();

chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== 'local') return;

  if (changes.uiMode) applyUiMode(changes.uiMode.newValue || 'popup');

  if (changes.pendingStart?.newValue) {
    // Clear the flag so it doesn't fire twice.
    await chrome.storage.local.remove('pendingStart');
    // Start the next Pomodoro right here in the SW — works even if the popup
    // never opens (Chrome forbids openPopup() without a user gesture).
    await startPomodoroFromSW();
    // Give the alarm window a moment to fully close so focus returns to the
    // browser window. Without this delay openPopup() refuses.
    setTimeout(() => surfacePopupWindow(), 500);
  }
});

async function surfacePopupWindow() {
  const { uiMode } = await chrome.storage.local.get('uiMode');
  if (uiMode === 'sidebar') {
    const win = await new Promise((res) => chrome.windows.getLastFocused({}, res));
    if (win?.id) chrome.sidePanel.open({ windowId: win.id }).catch(() => {});
    return;
  }

  // Find a regular browser window and focus it first — chrome.action.openPopup
  // refuses to open over a non-normal window (e.g. the alarm popup that just
  // closed) and needs a focused normal window to attach to.
  const wins = await new Promise((res) => chrome.windows.getAll({}, res));
  const normalWin =
    wins.find((w) => w.type === 'normal' && w.focused) ||
    wins.find((w) => w.type === 'normal');
  if (!normalWin) return;

  await new Promise((res) =>
    chrome.windows.update(normalWin.id, { focused: true }, () => res()),
  );

  // Try opening; retry a few times since timing varies after window focus shift.
  for (let i = 0; i < 5; i++) {
    try {
      await chrome.action.openPopup({ windowId: normalWin.id });
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM_NAME) return;

  const { timerState } = await chrome.storage.local.get('timerState');
  const mode = timerState?.mode || 'pomodoro';

  await chrome.storage.local.set({
    timerState: { isRunning: false, mode, secondsLeft: 0, endTime: null },
  });

  // Bell on every timer end (work or break).
  await playBell();

  // Increment pomodoro counter for today on every successful work session,
  // plus the per-task counter if there's an active task.
  if (mode === 'pomodoro') {
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const { pomodoroCounts, currentTaskIndex, tasks } =
      await chrome.storage.local.get(['pomodoroCounts', 'currentTaskIndex', 'tasks']);
    const counts = pomodoroCounts || {};
    counts[today] = (counts[today] || 0) + 1;
    const patch = { pomodoroCounts: counts };
    if (Array.isArray(tasks) && Number.isInteger(currentTaskIndex) && currentTaskIndex >= 0 && currentTaskIndex < tasks.length) {
      const updated = tasks.map((t, i) =>
        i === currentTaskIndex ? { ...t, pomodoroCount: (t.pomodoroCount || 0) + 1 } : t,
      );
      patch.tasks = updated;
    }
    await chrome.storage.local.set(patch);
  }

  if (mode !== 'pomodoro') return;

  const { alarmWindowMode } = await chrome.storage.local.get('alarmWindowMode');
  const useFullscreen = (alarmWindowMode || 'fullscreen') === 'fullscreen';

  if (useFullscreen) {
    // macOS workaround: state:'fullscreen' on type:'popup' produces only
    // maximized; type:'normal' enters native Spaces fullscreen reliably.
    chrome.windows.create({
      url: chrome.runtime.getURL(ALARM_PATH),
      type: 'normal',
      state: 'fullscreen',
      focused: true,
    }, (alarmWin) => {
      if (alarmWin?.id) {
        chrome.storage.local.set({ alarmWindowId: alarmWin.id });
        setTimeout(() => {
          chrome.windows.update(alarmWin.id, { state: 'fullscreen' }).catch(() => {});
        }, 100);
      }
    });
  } else {
    // Compact: a centered popup window — non-intrusive but large enough for
    // the timer/buttons to feel comfortable. Sized as 75% of the parent
    // window, capped at sensible bounds so it works on any monitor.
    chrome.windows.getLastFocused({ populate: false }, (parent) => {
      const pw = parent?.width  ?? 1280;
      const ph = parent?.height ??  800;
      const W = Math.min(1200, Math.max(900, Math.round(pw * 0.75)));
      const H = Math.min(900,  Math.max(720, Math.round(ph * 0.80)));
      const left = (parent?.left ?? 0) + Math.max(0, Math.round((pw - W) / 2));
      const top  = (parent?.top  ?? 0) + Math.max(0, Math.round((ph - H) / 2));
      chrome.windows.create({
        url: chrome.runtime.getURL(ALARM_PATH),
        type: 'popup',
        width: W,
        height: H,
        left,
        top,
        focused: true,
      }, (alarmWin) => {
        if (alarmWin?.id) chrome.storage.local.set({ alarmWindowId: alarmWin.id });
      });
    });
  }
});
