import { state, todayStr, toDateStr } from './state.js';

const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

let onDateSelect = null;

export function renderCalendar() {
  const grid  = document.getElementById('calGrid');
  const label = document.getElementById('calMonthYear');
  if (!grid || !label) return;
  grid.innerHTML = '';
  label.textContent = `${MONTHS_RU[state.calMonth]} ${state.calYear}`;

  const todayDate      = todayStr();
  const datesWithTasks = new Set(state.tasks.map(t => t.date || todayStr()));
  const firstDay       = new Date(state.calYear, state.calMonth, 1);
  const lastDay        = new Date(state.calYear, state.calMonth + 1, 0);
  let startDow         = firstDay.getDay();
  startDow = startDow === 0 ? 6 : startDow - 1;

  for (let i = 0; i < startDow; i++) {
    const cell = document.createElement('div');
    cell.className = 'cal-cell empty';
    grid.appendChild(cell);
  }

  for (let d = 1; d <= lastDay.getDate(); d++) {
    const cell    = document.createElement('div');
    const dateStr = toDateStr(state.calYear, state.calMonth, d);
    cell.className   = 'cal-cell';
    cell.textContent = d;
    if (dateStr === todayDate)          cell.classList.add('today');
    if (dateStr === state.selectedDate) cell.classList.add('selected');
    if (datesWithTasks.has(dateStr))    cell.classList.add('has-tasks');
    cell.addEventListener('click', () => {
      state.selectedDate = dateStr;
      if (onDateSelect) onDateSelect(dateStr);
    });
    grid.appendChild(cell);
  }
}

export function initCalendar(dateSelectCallback) {
  onDateSelect = dateSelectCallback;

  document.getElementById('calPrev').addEventListener('click', () => {
    if (--state.calMonth < 0) { state.calMonth = 11; state.calYear--; }
    renderCalendar();
  });
  document.getElementById('calNext').addEventListener('click', () => {
    if (++state.calMonth > 11) { state.calMonth = 0; state.calYear++; }
    renderCalendar();
  });

  renderCalendar();
}
