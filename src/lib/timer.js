// Pomodoro timer logic — uses chrome.alarms so it ticks even when popup is closed.
// Display ticking is driven by setInterval inside the popup (see hooks/useTimer).

import { storage } from './storage.js';

export const ALARM_NAME = 'pomodoroAlarm';

export async function startTimer({ mode, durations, secondsLeft }) {
  const seconds = secondsLeft && secondsLeft > 0 ? secondsLeft : durations[mode];
  const endTime = Date.now() + seconds * 1000;
  await storage.set({
    timerState: { mode, isRunning: true, endTime, secondsLeft: seconds },
  });
  chrome.alarms.create(ALARM_NAME, { when: endTime });
  return endTime;
}

export async function pauseTimer() {
  const { timerState } = await storage.get(['timerState']);
  if (!timerState?.isRunning || !timerState?.endTime) return;
  const secondsLeft = Math.max(0, Math.ceil((timerState.endTime - Date.now()) / 1000));
  await storage.set({
    timerState: { ...timerState, isRunning: false, endTime: null, secondsLeft },
  });
  chrome.alarms.clear(ALARM_NAME);
}

export async function resetTimer({ mode, durations }) {
  await storage.set({
    timerState: { mode, isRunning: false, endTime: null, secondsLeft: durations[mode] },
  });
  chrome.alarms.clear(ALARM_NAME);
}

export function secondsLeftFromState(ts) {
  if (!ts) return 0;
  if (ts.isRunning && ts.endTime) {
    return Math.max(0, Math.ceil((ts.endTime - Date.now()) / 1000));
  }
  return ts.secondsLeft ?? 0;
}

export function formatTime(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
}
