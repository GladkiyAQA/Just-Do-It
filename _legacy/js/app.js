import { state, todayStr } from './state.js';
import { storage } from './storage.js';
import { initTimer, applyDurations, updateDisplay, restoreTimerState, autoStart } from './timer.js';
import { initTasks, renderTasks } from './tasks.js';
import { initCalendar, renderCalendar } from './calendar.js';
import { initTheme, applyTheme, applyCrystalHue } from './theme.js';
import { initImport } from './import.js';
import { initNavigation, switchTab } from './navigation.js';

initTimer();
initTasks();
initNavigation();
initTheme();
initImport();

document.getElementById('btnAppSettings').addEventListener('click', () => {
  // Navigate within the current context (popup / sidebar / new tab)
  window.location.href = chrome.runtime.getURL('settings.html');
});
initCalendar(() => {
  switchTab('tabTasks');
  renderCalendar();
  renderTasks();
});

storage.load(data => {
  state.tasks = (data.tasks || []).map(t => ({
    ...t,
    subtasks: t.subtasks || [],
    date: t.date || todayStr(),
  }));
  state.currentTaskIndex = data.currentTaskIndex ?? -1;
  if (data.crystalHue !== undefined) applyCrystalHue(data.crystalHue);
  applyTheme(data.theme || 'light');
  if (data.durations) applyDurations(data.durations);
  restoreTimerState(data.timerState || null);
  if (data.pendingStart) {
    chrome.storage.local.remove('pendingStart');
    autoStart();
  }
  renderTasks();
  renderCalendar();
});

// Если попап уже открыт когда пользователь нажимает Continue/New Pomodoro в алерте
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.pendingStart?.newValue) {
    chrome.storage.local.remove('pendingStart');
    autoStart();
  }
});

updateDisplay();

// Если перерыв был активен когда аларм-окно закрылось — вернуть его при открытии popup
chrome.storage.local.get(['breakActive', 'breakEndTime', 'alarmWindowId', 'alarmWindowRect'], data => {
  if (!data.breakActive || !data.breakEndTime || data.breakEndTime <= Date.now()) return;

  const openAlarm = rect => chrome.windows.create(
    { url: chrome.runtime.getURL('alarm.html'), type: 'popup', focused: true, ...(rect || {}) },
    win => chrome.storage.local.set({ alarmWindowId: win.id })
  );

  if (data.alarmWindowId) {
    chrome.windows.get(data.alarmWindowId, {}, () => {
      if (chrome.runtime.lastError) openAlarm(data.alarmWindowRect);
      else chrome.windows.update(data.alarmWindowId, { focused: true });
    });
  } else {
    openAlarm(data.alarmWindowRect);
  }
});
