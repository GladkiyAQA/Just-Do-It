import { state, MODES, MODE_LABELS } from './state.js';
import { storage } from './storage.js';
import { breakMusicStart, breakMusicStop } from './audio-manager.js';

const timerDisplay  = document.getElementById('timerDisplay');
const timerSubtitle = document.getElementById('timerSubtitle');
const btnStart      = document.getElementById('btnStart');
const btnPause      = document.getElementById('btnPause');
const btnReset      = document.getElementById('btnReset');
const doneSound     = document.getElementById('doneSound');

const ALARM_NAME = 'focusTimer';
const isBreakMode = () => state.currentMode !== 'pomodoro';

function formatTime(secs) {
  return `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
}

export function updateDisplay() {
  timerDisplay.textContent = formatTime(state.secondsLeft);
}

function setRunningUI(running) {
  btnStart.disabled = running;
  btnPause.disabled = !running;
  document.body.classList.toggle('timer-running', running);
}

// Единая функция тика — вычисляет остаток из endTime, не накапливает дрейф
function runInterval(endTime) {
  state.timerInterval = setInterval(() => {
    state.secondsLeft = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
    updateDisplay();
    if (state.secondsLeft <= 0) {
      clearInterval(state.timerInterval);
      state.isRunning = false;
      setRunningUI(false);
      if (isBreakMode()) breakMusicStop();
      doneSound.play().catch(() => {});
      // chrome.alarm откроет alarm.html (сработает даже если popup закрыт)
    }
  }, 1000);
}

function startTimer() {
  if (state.isRunning) return;
  state.isRunning = true;
  setRunningUI(true);
  if (isBreakMode()) breakMusicStart();

  const endTime = Date.now() + state.secondsLeft * 1000;
  // Alarm сработает когда таймер истечёт — даже если popup закрыт
  chrome.alarms.create(ALARM_NAME, { when: endTime });
  storage.saveTimerState({ isRunning: true, endTime, mode: state.currentMode, secondsLeft: state.secondsLeft });

  runInterval(endTime);
}

function pauseTimer() {
  clearInterval(state.timerInterval);
  chrome.alarms.clear(ALARM_NAME);
  state.isRunning = false;
  setRunningUI(false);
  breakMusicStop();
  storage.saveTimerState({ isRunning: false, mode: state.currentMode, secondsLeft: state.secondsLeft });
}

function resetTimer() {
  clearInterval(state.timerInterval);
  chrome.alarms.clear(ALARM_NAME);
  state.isRunning = false;
  breakMusicStop();
  state.secondsLeft = MODES[state.currentMode];
  setRunningUI(false);
  updateDisplay();
  storage.saveTimerState({ isRunning: false, mode: state.currentMode, secondsLeft: MODES[state.currentMode] });
}

export function applyDurations(d) {
  // _v:2 stores seconds; old format stored minutes
  if (d._v === 2) {
    MODES.pomodoro = d.pomodoro ?? 1500;
    MODES.short    = d.short    ?? 300;
    MODES.long     = d.long     ?? 900;
  } else {
    MODES.pomodoro = (d.pomodoro ?? 25) * 60;
    MODES.short    = (d.short    ?? 5)  * 60;
    MODES.long     = (d.long     ?? 15) * 60;
  }
  if (!state.isRunning) {
    state.secondsLeft = MODES[state.currentMode];
    updateDisplay();
  }
}

// Вызывается из app.js после загрузки storage — восстанавливает таймер если он шёл в фоне
export function restoreTimerState(saved) {
  if (!saved) return;

  if (saved.mode) {
    state.currentMode = saved.mode;
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === state.currentMode);
    });
    timerSubtitle.textContent = MODE_LABELS[state.currentMode];
  }

  if (saved.isRunning && saved.endTime) {
    const secsLeft = Math.max(0, Math.ceil((saved.endTime - Date.now()) / 1000));
    if (secsLeft > 0) {
      state.secondsLeft = secsLeft;
      state.isRunning = true;
      setRunningUI(true);
      updateDisplay();
      runInterval(saved.endTime); // подключаемся к уже идущему alarm
      return;
    }
  }

  // Пауза или уже завершён
  state.secondsLeft = saved.secondsLeft ?? MODES[state.currentMode];
  updateDisplay();
}

export function autoStart() {
  clearInterval(state.timerInterval);
  chrome.alarms.clear(ALARM_NAME);
  state.isRunning = false;
  if (isBreakMode()) breakMusicStop();
  state.secondsLeft = MODES[state.currentMode];
  updateDisplay();
  startTimer();
}

export function initTimer() {
  btnStart.addEventListener('click', startTimer);
  btnPause.addEventListener('click', pauseTimer);
  btnReset.addEventListener('click', resetTimer);

  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentMode = btn.dataset.mode;
      timerSubtitle.textContent = MODE_LABELS[state.currentMode];
      resetTimer();
    });
  });
}
