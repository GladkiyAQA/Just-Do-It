import { state, todayStr } from './state.js';
import { storage } from './storage.js';
import { renderCalendar } from './calendar.js';

const taskList          = document.getElementById('taskList');
const newTaskInput      = document.getElementById('newTaskInput');
const btnAddTask        = document.getElementById('btnAddTask');
const addTaskRow        = document.getElementById('addTaskRow');
const currentTaskText   = document.getElementById('currentTaskText');
const taskCountBadge    = document.getElementById('taskCountBadge');
const btnChangeTask     = document.getElementById('btnChangeTask');
const dateSectionLabel  = document.getElementById('dateSectionLabel');
const taskPickerOverlay = document.getElementById('taskPickerOverlay');
const pickerList        = document.getElementById('pickerList');
const btnCloseTaskPicker = document.getElementById('btnCloseTaskPicker');

const MONTHS_RU_GEN = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];

export function saveTasks() {
  storage.saveTasks(state.tasks);
  renderCalendar();
}

function updateDateLabel() {
  if (state.selectedDate === todayStr()) {
    dateSectionLabel.textContent = 'Сегодня';
  } else {
    const [, m, d] = state.selectedDate.split('-').map(Number);
    dateSectionLabel.textContent = `${d} ${MONTHS_RU_GEN[m - 1]}`;
  }
}

export function updateCurrentTaskDisplay() {
  const { tasks, currentTaskIndex } = state;
  if (currentTaskIndex >= 0 && currentTaskIndex < tasks.length) {
    const t = tasks[currentTaskIndex];
    currentTaskText.textContent = t.text;
    currentTaskText.classList.add('has-task');
    currentTaskText.style.textDecoration = t.done ? 'line-through' : 'none';
  } else {
    state.currentTaskIndex = -1;
    currentTaskText.textContent = 'Нет задачи';
    currentTaskText.classList.remove('has-task');
    currentTaskText.style.textDecoration = 'none';
  }
}

function makeEditableSpan(text, onSave) {
  const span = document.createElement('span');
  span.className       = 'task-text';
  span.contentEditable = 'true';
  span.textContent     = text;
  span.addEventListener('blur', () => {
    const val = span.textContent.trim();
    if (val) onSave(val);
    else span.textContent = text;
  });
  span.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); span.blur(); }
  });
  return span;
}

function renderSubtasks(subtasks, parentIndex) {
  const ul = document.createElement('ul');
  ul.className = 'subtask-list';

  subtasks.forEach((sub, subIndex) => {
    const li = document.createElement('li');
    li.className = 'subtask-item';
    if (sub.done) li.classList.add('done');
    li.draggable = true;

    li.addEventListener('dragstart', e => {
      e.stopPropagation();
      state.dragSrcIndex    = parentIndex;
      state.dragSrcSubIndex = subIndex;
      li.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    li.addEventListener('dragover', e => {
      e.preventDefault();
      e.stopPropagation();
      if (state.dragSrcSubIndex === null || state.dragSrcIndex !== parentIndex) return;
      ul.querySelectorAll('.subtask-item').forEach(el => el.classList.remove('drag-over'));
      if (subIndex !== state.dragSrcSubIndex) li.classList.add('drag-over');
    });

    li.addEventListener('drop', e => {
      e.preventDefault();
      e.stopPropagation();
      if (state.dragSrcSubIndex === null || state.dragSrcIndex !== parentIndex || state.dragSrcSubIndex === subIndex) return;
      const moved = state.tasks[parentIndex].subtasks.splice(state.dragSrcSubIndex, 1)[0];
      state.tasks[parentIndex].subtasks.splice(subIndex, 0, moved);
      saveTasks();
      renderTasks();
    });

    li.addEventListener('dragend', e => {
      e.stopPropagation();
      state.dragSrcIndex    = null;
      state.dragSrcSubIndex = null;
      document.querySelectorAll('.subtask-item').forEach(el => el.classList.remove('dragging', 'drag-over'));
    });

    const handle = document.createElement('span');
    handle.className   = 'drag-handle';
    handle.textContent = '⠿';

    const checkbox = document.createElement('input');
    checkbox.type    = 'checkbox';
    checkbox.checked = sub.done;
    checkbox.addEventListener('change', () => {
      state.tasks[parentIndex].subtasks[subIndex].done = checkbox.checked;
      li.classList.toggle('done', checkbox.checked);
      saveTasks();
    });

    const span = makeEditableSpan(sub.text, val => {
      state.tasks[parentIndex].subtasks[subIndex].text = val;
      saveTasks();
    });

    const btnDel = document.createElement('button');
    btnDel.className   = 'btn-delete';
    btnDel.textContent = '×';
    btnDel.addEventListener('click', () => {
      state.tasks[parentIndex].subtasks.splice(subIndex, 1);
      saveTasks();
      renderTasks();
    });

    const left = document.createElement('div');
    left.className = 'subtask-left';
    left.appendChild(handle);
    left.appendChild(checkbox);
    left.appendChild(span);

    li.appendChild(left);
    li.appendChild(btnDel);
    ul.appendChild(li);
  });

  return ul;
}

export function renderTasks() {
  taskList.innerHTML = '';
  updateDateLabel();

  const visiblePairs = state.tasks
    .map((task, index) => ({ task, index }))
    .filter(({ task }) => (task.date || todayStr()) === state.selectedDate);

  visiblePairs.forEach(({ task, index }) => {
    const li = document.createElement('li');
    if (task.done) li.classList.add('done');
    li.draggable = true;

    li.addEventListener('dragstart', e => {
      if (state.dragSrcSubIndex !== null) return;
      state.dragSrcIndex = index;
      li.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    li.addEventListener('dragover', e => {
      if (state.dragSrcSubIndex !== null) return;
      e.preventDefault();
      taskList.querySelectorAll(':scope > li').forEach(el => el.classList.remove('drag-over'));
      if (index !== state.dragSrcIndex) li.classList.add('drag-over');
    });

    li.addEventListener('drop', e => {
      if (state.dragSrcSubIndex !== null) return;
      e.preventDefault();
      if (state.dragSrcIndex === null || state.dragSrcIndex === index) return;
      const moved = state.tasks.splice(state.dragSrcIndex, 1)[0];
      state.tasks.splice(index, 0, moved);
      saveTasks();
      renderTasks();
    });

    li.addEventListener('dragend', () => {
      if (state.dragSrcSubIndex !== null) return;
      state.dragSrcIndex = null;
      taskList.querySelectorAll(':scope > li').forEach(el => el.classList.remove('dragging', 'drag-over'));
    });

    const topRow = document.createElement('div');
    topRow.className = 'task-top-row';

    const handle = document.createElement('span');
    handle.className   = 'drag-handle';
    handle.textContent = '⠿';

    const checkbox = document.createElement('input');
    checkbox.type    = 'checkbox';
    checkbox.checked = task.done;
    checkbox.addEventListener('change', () => {
      state.tasks[index].done = checkbox.checked;
      li.classList.toggle('done', checkbox.checked);
      if (state.currentTaskIndex === index) updateCurrentTaskDisplay();
      saveTasks();
    });

    const span = makeEditableSpan(task.text, val => {
      state.tasks[index].text = val;
      if (state.currentTaskIndex === index) updateCurrentTaskDisplay();
      saveTasks();
    });

    const btnAddSub = document.createElement('button');
    btnAddSub.className   = 'btn-add-sub';
    btnAddSub.textContent = '+';
    btnAddSub.title       = 'Добавить подпункт';
    btnAddSub.addEventListener('click', e => {
      e.stopPropagation();
      state.tasks[index].subtasks.push({ text: 'Новый подпункт', done: false });
      state.tasks[index].collapsed = false;
      saveTasks();
      renderTasks();
    });

    const btnDel = document.createElement('button');
    btnDel.className   = 'btn-delete';
    btnDel.textContent = '×';
    btnDel.addEventListener('click', () => {
      if (state.currentTaskIndex === index) state.currentTaskIndex = -1;
      else if (state.currentTaskIndex > index) state.currentTaskIndex--;
      state.tasks.splice(index, 1);
      saveTasks();
      renderTasks();
      updateCurrentTaskDisplay();
      storage.saveCurrentTaskIndex(state.currentTaskIndex);
    });

    const btnCollapse = document.createElement('button');
    btnCollapse.className        = 'collapse-btn';
    btnCollapse.style.visibility = task.subtasks.length > 0 ? 'visible' : 'hidden';
    btnCollapse.textContent      = task.collapsed ? '▶' : '▼';
    btnCollapse.title            = task.collapsed ? 'Развернуть' : 'Свернуть';
    btnCollapse.addEventListener('click', e => {
      e.stopPropagation();
      state.tasks[index].collapsed = !state.tasks[index].collapsed;
      saveTasks();
      renderTasks();
    });

    topRow.appendChild(handle);
    topRow.appendChild(btnCollapse);
    topRow.appendChild(checkbox);
    topRow.appendChild(span);
    topRow.appendChild(btnAddSub);
    topRow.appendChild(btnDel);
    li.appendChild(topRow);

    if (task.subtasks.length > 0 && !task.collapsed) {
      li.appendChild(renderSubtasks(task.subtasks, index));
    }

    taskList.appendChild(li);
  });

  taskCountBadge.textContent = visiblePairs.length;
  updateCurrentTaskDisplay();
}

function addTask(text) {
  const trimmed = text.trim();
  if (!trimmed) return;
  state.tasks.push({ text: trimmed, done: false, subtasks: [], date: state.selectedDate });
  saveTasks();
  renderTasks();
  const items = taskList.querySelectorAll(':scope > li');
  if (items.length) items[items.length - 1].classList.add('task-new');
}

export function initTasks() {
  btnAddTask.addEventListener('click', () => {
    if (addTaskRow.style.display === 'none') {
      addTaskRow.style.display = 'block';
      newTaskInput.focus();
    } else {
      const val = newTaskInput.value.trim();
      if (val) { addTask(val); newTaskInput.value = ''; }
      addTaskRow.style.display = 'none';
    }
  });

  newTaskInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const val = newTaskInput.value.trim();
      if (val) { addTask(val); newTaskInput.value = ''; }
      addTaskRow.style.display = 'none';
    }
    if (e.key === 'Escape') {
      newTaskInput.value = '';
      addTaskRow.style.display = 'none';
    }
  });

  btnChangeTask.addEventListener('click', openTaskPicker);
  btnCloseTaskPicker.addEventListener('click', closeTaskPicker);
  taskPickerOverlay.addEventListener('click', e => {
    if (e.target === taskPickerOverlay) closeTaskPicker();
  });
}

function openTaskPicker() {
  const todayTasks = state.tasks
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => (t.date || todayStr()) === state.selectedDate);

  pickerList.innerHTML = '';

  if (todayTasks.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'picker-no-tasks';
    empty.textContent = 'Нет задач на сегодня';
    pickerList.appendChild(empty);
  } else {
    todayTasks.forEach(({ t, i }) => {
      const li = document.createElement('li');
      li.className = 'picker-item' +
        (t.done ? ' done-task' : '') +
        (i === state.currentTaskIndex ? ' selected' : '');

      const check = document.createElement('span');
      check.className = 'picker-item-check';
      check.textContent = '✓';

      const text = document.createElement('span');
      text.className = 'picker-item-text';
      text.textContent = t.text;

      li.appendChild(check);
      li.appendChild(text);

      li.addEventListener('click', () => {
        state.currentTaskIndex = i;
        updateCurrentTaskDisplay();
        storage.saveCurrentTaskIndex(state.currentTaskIndex);
        closeTaskPicker();
      });

      pickerList.appendChild(li);
    });
  }

  taskPickerOverlay.classList.add('open');
}

function closeTaskPicker() {
  taskPickerOverlay.classList.remove('open');
}
