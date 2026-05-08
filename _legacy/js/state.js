export const MODES = { pomodoro: 25 * 60, short: 5 * 60, long: 15 * 60 };
export const MODE_LABELS = {
  pomodoro: 'Фокус на задаче',
  short: 'Короткий перерыв',
  long: 'Длинный перерыв',
};

export function todayStr() {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

export function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export const state = {
  currentMode: 'pomodoro',
  secondsLeft: MODES.pomodoro,
  timerInterval: null,
  isRunning: false,
  tasks: [],
  currentTaskIndex: -1,
  selectedDate: todayStr(),
  dragSrcIndex: null,
  dragSrcSubIndex: null,
  calYear: new Date().getFullYear(),
  calMonth: new Date().getMonth(),
};
