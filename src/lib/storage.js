// Wrapper around chrome.storage.local. Keys/shapes match the legacy extension
// so existing user data survives the migration.

const KEYS = [
  'tasks',
  'theme',
  'crystalHue',
  'currentTaskIndex',
  'durations',
  'timerState',
  'pendingStart',
  'uiMode',
  'autoMode',
  'music',
  'musicLastTime',
  'alarmWindowMode',
  'selectedDate',
  'pomodoroCounts',
  'pomodoroGoal',
  'habits',
  'habitLog',
];

export const storage = {
  get: (keys = KEYS) =>
    new Promise((resolve) => chrome.storage.local.get(keys, resolve)),
  set: (obj) =>
    new Promise((resolve) => chrome.storage.local.set(obj, resolve)),
  remove: (keys) =>
    new Promise((resolve) => chrome.storage.local.remove(keys, resolve)),
  onChanged: (handler) => {
    const wrapped = (changes, area) => {
      if (area === 'local') handler(changes);
    };
    chrome.storage.onChanged.addListener(wrapped);
    return () => chrome.storage.onChanged.removeListener(wrapped);
  },
};

export const DEFAULT_DURATIONS = { _v: 2, pomodoro: 25 * 60, short: 5 * 60, long: 15 * 60 };

// Old format stored minutes; v2 stores seconds.
export function normalizeDurations(d) {
  if (!d) return { ...DEFAULT_DURATIONS };
  if (d._v === 2) return d;
  return {
    _v: 2,
    pomodoro: (d.pomodoro ?? 25) * 60,
    short:    (d.short    ?? 5)  * 60,
    long:     (d.long     ?? 15) * 60,
  };
}
