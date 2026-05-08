const ALARM_NAME = 'focusTimer';

// ── UI Mode ───────────────────────────────────────────────────

function applyUiMode(mode) {
  if (mode === 'popup') {
    chrome.action.setPopup({ popup: 'popup.html' });
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});
  } else if (mode === 'sidebar') {
    chrome.action.setPopup({ popup: '' });
    // Chrome opens the side panel automatically on action click
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
  }
}

async function initUiMode() {
  const { uiMode } = await chrome.storage.local.get('uiMode');
  applyUiMode(uiMode || 'popup');
}

chrome.runtime.onInstalled.addListener(initUiMode);
chrome.runtime.onStartup.addListener(initUiMode);
// Also apply on every service worker wake-up (covers manual extension reload)
initUiMode();

// Re-apply immediately when the setting changes (e.g. from settings page)
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== 'local') return;

  if (changes.uiMode) {
    applyUiMode(changes.uiMode.newValue || 'popup');
  }

  if (changes.pendingStart?.newValue) {
    const { uiMode } = await chrome.storage.local.get('uiMode');
    // Delay lets the alarm window close before openPopup is called —
    // openPopup fails if a non-toolbar popup window is still focused.
    setTimeout(() => {
      if (uiMode === 'sidebar') {
        chrome.windows.getLastFocused({}, win => {
          if (win?.id) chrome.sidePanel.open({ windowId: win.id }).catch(() => {});
        });
      } else {
        chrome.action.openPopup().catch(() => {});
      }
    }, 300);
  }
});

// ── Alarm (Pomodoro завершён) ─────────────────────────────────

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM_NAME) return;

  const { timerState } = await chrome.storage.local.get('timerState');
  const mode = timerState?.mode || 'pomodoro';

  chrome.storage.local.set({ timerState: { isRunning: false, mode, secondsLeft: 0 } });

  if (mode === 'pomodoro') {
    chrome.windows.getLastFocused({ populate: false }, (win) => {
      const width  = Math.round(win.width  * 0.82);
      const height = Math.round(win.height * 0.88);
      const left   = win.left + Math.round((win.width  - width)  / 2);
      const top    = win.top  + Math.round((win.height - height) / 2);
      const rect   = { width, height, left: Math.max(0, left), top: Math.max(0, top) };

      chrome.windows.create({
        url: chrome.runtime.getURL('alarm.html'),
        type: 'popup',
        ...rect,
        focused: true,
      }, alarmWin => {
        chrome.storage.local.set({ alarmWindowId: alarmWin.id, alarmWindowRect: rect });
      });
    });
  }
});
