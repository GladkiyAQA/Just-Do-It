import { create } from 'zustand';
import { storage, DEFAULT_DURATIONS, normalizeDurations } from './storage.js';
import { DEFAULT_MUSIC } from './musicSources.js';

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const TASK_TEXT_LIMIT = 200;
export const HABIT_TEXT_LIMIT = 50;
const cap = (s) => String(s || '').slice(0, TASK_TEXT_LIMIT);
const capHabit = (s) => String(s || '').slice(0, HABIT_TEXT_LIMIT);

const newHabitId = () =>
  `h_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

// Mon=0..Sun=6 — same convention as the Tasks weekly view.
const dayIndexFromISO = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return (new Date(y, m - 1, d).getDay() + 6) % 7;
};

export function isHabitActiveOnDate(habit, iso) {
  if (!habit || habit.archived) return false;
  const sched = habit.schedule || { type: 'daily', days: [0, 1, 2, 3, 4, 5, 6] };
  if (sched.type === 'daily') return true;
  const di = dayIndexFromISO(iso);
  return Array.isArray(sched.days) && sched.days.includes(di);
}

export const useStore = create((set, get) => ({
  // ── data
  tasks: [],
  currentTaskIndex: -1,
  selectedDate: todayISO(),
  theme: 'crystal', // 'crystal' | 'notion' | 'dark'
  crystalHue: 205,
  durations: { ...DEFAULT_DURATIONS },
  pomodoroCounts: {}, // { 'YYYY-MM-DD': N }
  pomodoroGoal: 4,    // daily target — number of pomodoros
  autoMode: false,
  alarmWindowMode: 'fullscreen', // 'fullscreen' | 'compact'
  music: { ...DEFAULT_MUSIC },
  timerState: { mode: 'pomodoro', isRunning: false, endTime: null, secondsLeft: 25 * 60 },
  habits: [],     // [{ id, text, icon, color, targetPerDay, schedule:{type,days}, createdAt, archived, order }]
  habitLog: {},   // { 'YYYY-MM-DD': { habitId: count } }
  uiMode: 'popup', // 'popup' | 'sidebar' — surface mode for the extension action

  // ── lifecycle
  hydrate: async () => {
    const data = await storage.get();
    set({
      tasks: data.tasks || [],
      currentTaskIndex: data.currentTaskIndex ?? -1,
      selectedDate: data.selectedDate || todayISO(),
      theme: data.theme || 'crystal',
      crystalHue: data.crystalHue ?? 205,
      durations: normalizeDurations(data.durations),
      pomodoroCounts: data.pomodoroCounts || {},
      pomodoroGoal: Number.isFinite(data.pomodoroGoal) && data.pomodoroGoal > 0 ? data.pomodoroGoal : 4,
      autoMode: data.autoMode ?? false,
      alarmWindowMode: data.alarmWindowMode || 'fullscreen',
      music: { ...DEFAULT_MUSIC, ...(data.music || {}) },
      timerState: data.timerState || get().timerState,
      habits: Array.isArray(data.habits) ? data.habits : [],
      habitLog: data.habitLog && typeof data.habitLog === 'object' ? data.habitLog : {},
      uiMode: data.uiMode === 'sidebar' ? 'sidebar' : 'popup',
    });
  },

  // ── tasks
  setTasks: (tasks) => {
    set({ tasks });
    storage.set({ tasks });
  },
  addTask: (text, date = todayISO()) => {
    const t = cap(text).trim();
    if (!t) return;
    const tasks = [...get().tasks, { text: t, done: false, subtasks: [], date, collapsed: false }];
    set({ tasks });
    storage.set({ tasks });
  },
  toggleTask: (i) => {
    const tasks = get().tasks.map((t, idx) => {
      if (idx !== i) return t;
      const nextDone = !t.done;
      // Auto-collapse the subtask list when a task is marked done.
      // Leave the collapsed flag alone when un-doing — user can re-expand manually.
      return { ...t, done: nextDone, collapsed: nextDone ? true : t.collapsed };
    });
    set({ tasks });
    storage.set({ tasks });
  },
  // Toggle a task's "done" state for a specific date.
  // - Recurring tasks: maintain a `doneDates` array — adds/removes the date.
  // - Non-recurring: falls back to flipping the global `done` flag.
  toggleTaskOnDate: (i, date) => {
    const tasks = get().tasks.map((t, idx) => {
      if (idx !== i) return t;
      if (t.recurring) {
        const dd = Array.isArray(t.doneDates) ? t.doneDates : [];
        const has = dd.includes(date);
        return { ...t, doneDates: has ? dd.filter((d) => d !== date) : [...dd, date] };
      }
      const nextDone = !t.done;
      // Auto-collapse subtasks when transitioning to done. Leave alone on un-done.
      return { ...t, done: nextDone, collapsed: nextDone ? true : t.collapsed };
    });
    set({ tasks });
    storage.set({ tasks });
  },
  setRecurring: (i, value) => {
    const tasks = get().tasks.map((t, idx) => {
      if (idx !== i) return t;
      if (value) {
        return { ...t, recurring: true, doneDates: Array.isArray(t.doneDates) ? t.doneDates : [], done: false };
      }
      return { ...t, recurring: false, doneDates: [] };
    });
    set({ tasks });
    storage.set({ tasks });
  },
  editTask: (i, text) => {
    const tasks = get().tasks.map((t, idx) => (idx === i ? { ...t, text: cap(text) } : t));
    set({ tasks });
    storage.set({ tasks });
  },
  removeTask: (i) => {
    const tasks = get().tasks.filter((_, idx) => idx !== i);
    let { currentTaskIndex } = get();
    if (currentTaskIndex === i) currentTaskIndex = -1;
    else if (currentTaskIndex > i) currentTaskIndex -= 1;
    set({ tasks, currentTaskIndex });
    storage.set({ tasks, currentTaskIndex });
  },
  // Set the per-task pomodoro budget (estimated count). 0/empty clears it.
  setTaskPomodoroBudget: (i, n) => {
    const v = Math.max(0, Math.min(99, Math.round(Number(n) || 0)));
    const tasks = get().tasks.map((t, idx) =>
      idx === i ? { ...t, pomodoroBudget: v > 0 ? v : undefined } : t,
    );
    set({ tasks });
    storage.set({ tasks });
  },
  // Increment per-task counter (called by SW on pomodoro completion).
  incrementTaskPomodoros: (i) => {
    const tasks = get().tasks.map((t, idx) =>
      idx === i ? { ...t, pomodoroCount: (t.pomodoroCount || 0) + 1 } : t,
    );
    set({ tasks });
    storage.set({ tasks });
  },
  toggleCollapsed: (i) => {
    const tasks = get().tasks.map((t, idx) => (idx === i ? { ...t, collapsed: !t.collapsed } : t));
    set({ tasks });
    storage.set({ tasks });
  },

  // ── subtasks
  addSubtask: (i, text) => {
    const t = cap(text).trim();
    if (!t) return;
    const tasks = get().tasks.map((task, idx) =>
      idx === i ? { ...task, subtasks: [...(task.subtasks || []), { text: t, done: false }] } : task,
    );
    set({ tasks });
    storage.set({ tasks });
  },
  toggleSubtask: (i, j) => {
    const tasks = get().tasks.map((t, idx) =>
      idx !== i ? t : { ...t, subtasks: t.subtasks.map((s, jdx) => (jdx === j ? { ...s, done: !s.done } : s)) },
    );
    set({ tasks });
    storage.set({ tasks });
  },
  editSubtask: (i, j, text) => {
    const tasks = get().tasks.map((t, idx) =>
      idx !== i ? t : { ...t, subtasks: t.subtasks.map((s, jdx) => (jdx === j ? { ...s, text: cap(text) } : s)) },
    );
    set({ tasks });
    storage.set({ tasks });
  },
  removeSubtask: (i, j) => {
    const tasks = get().tasks.map((t, idx) =>
      idx !== i ? t : { ...t, subtasks: t.subtasks.filter((_, jdx) => jdx !== j) },
    );
    set({ tasks });
    storage.set({ tasks });
  },

  // ── reorder
  moveTask: (from, to) => {
    if (from === to) return;
    const tasks = [...get().tasks];
    const [moved] = tasks.splice(from, 1);
    tasks.splice(to, 0, moved);
    set({ tasks });
    storage.set({ tasks });
  },
  moveSubtask: (i, from, to) => {
    if (from === to) return;
    const tasks = get().tasks.map((t, idx) => {
      if (idx !== i) return t;
      const subs = [...t.subtasks];
      const [m] = subs.splice(from, 1);
      subs.splice(to, 0, m);
      return { ...t, subtasks: subs };
    });
    set({ tasks });
    storage.set({ tasks });
  },

  // ── current task
  setCurrentTaskIndex: (i) => {
    set({ currentTaskIndex: i });
    storage.set({ currentTaskIndex: i });
  },

  // ── selected date
  setSelectedDate: (date) => {
    set({ selectedDate: date });
    storage.set({ selectedDate: date });
  },

  // ── pomodoro daily goal
  setPomodoroGoal: (n) => {
    const v = Math.max(1, Math.min(99, Math.round(Number(n) || 1)));
    set({ pomodoroGoal: v });
    storage.set({ pomodoroGoal: v });
  },

  // ── theme
  setTheme: (theme) => {
    set({ theme });
    storage.set({ theme });
  },
  setCrystalHue: (hue) => {
    set({ crystalHue: hue });
    storage.set({ crystalHue: hue });
  },

  // ── durations
  setDurations: (d) => {
    const norm = { _v: 2, ...d };
    set({ durations: norm });
    storage.set({ durations: norm });
  },
  resetDurations: () => {
    set({ durations: { ...DEFAULT_DURATIONS } });
    storage.set({ durations: { ...DEFAULT_DURATIONS } });
  },
  setAutoMode: (v) => {
    set({ autoMode: !!v });
    storage.set({ autoMode: !!v });
  },
  setAlarmWindowMode: (mode) => {
    const v = mode === 'compact' ? 'compact' : 'fullscreen';
    set({ alarmWindowMode: v });
    storage.set({ alarmWindowMode: v });
  },
  setUiMode: (mode) => {
    const v = mode === 'sidebar' ? 'sidebar' : 'popup';
    set({ uiMode: v });
    storage.set({ uiMode: v });
    // Apply immediately — SW also listens for storage changes via initUiMode
    // on next start, but we want the new behavior in effect right now too.
    try {
      if (v === 'sidebar') {
        chrome.action?.setPopup?.({ popup: '' });
        chrome.sidePanel?.setPanelBehavior?.({ openPanelOnActionClick: true });
      } else {
        chrome.action?.setPopup?.({ popup: 'src/popup/index.html' });
        chrome.sidePanel?.setPanelBehavior?.({ openPanelOnActionClick: false });
      }
    } catch {}
  },

  // ── music
  setMusic: (patch) => {
    const next = { ...get().music, ...patch };
    set({ music: next });
    storage.set({ music: next });
  },

  // ── habits
  addHabit: ({ text, icon = '✓', color = 'blue', targetPerDay = 1, schedule } = {}) => {
    const t = capHabit(text).trim();
    if (!t) return;
    const habit = {
      id: newHabitId(),
      text: t,
      icon,
      color,
      targetPerDay: Math.max(1, Math.min(20, Math.round(targetPerDay) || 1)),
      schedule: schedule && schedule.type
        ? schedule
        : { type: 'daily', days: [0, 1, 2, 3, 4, 5, 6] },
      createdAt: todayISO(),
      archived: false,
      order: get().habits.length,
    };
    const habits = [...get().habits, habit];
    set({ habits });
    storage.set({ habits });
  },
  editHabit: (id, patch) => {
    const habits = get().habits.map((h) => {
      if (h.id !== id) return h;
      const next = { ...h, ...patch };
      if (patch.text !== undefined) next.text = capHabit(patch.text);
      if (patch.targetPerDay !== undefined)
        next.targetPerDay = Math.max(1, Math.min(20, Math.round(patch.targetPerDay) || 1));
      return next;
    });
    set({ habits });
    storage.set({ habits });
  },
  // Hard delete: drops the habit AND wipes all its log entries.
  removeHabit: (id) => {
    const habits = get().habits.filter((h) => h.id !== id);
    const log = get().habitLog;
    const habitLog = {};
    for (const date of Object.keys(log)) {
      const day = log[date];
      const { [id]: _drop, ...rest } = day;
      if (Object.keys(rest).length > 0) habitLog[date] = rest;
    }
    set({ habits, habitLog });
    storage.set({ habits, habitLog });
  },
  reorderHabits: (from, to) => {
    if (from === to) return;
    const habits = [...get().habits];
    const [moved] = habits.splice(from, 1);
    habits.splice(to, 0, moved);
    const renumbered = habits.map((h, i) => ({ ...h, order: i }));
    set({ habits: renumbered });
    storage.set({ habits: renumbered });
  },
  incrementHabit: (id, date) => {
    const habit = get().habits.find((h) => h.id === id);
    if (!habit) return;
    const log = get().habitLog;
    const day = { ...(log[date] || {}) };
    const cur = day[id] || 0;
    if (cur >= habit.targetPerDay) return;
    day[id] = cur + 1;
    const habitLog = { ...log, [date]: day };
    set({ habitLog });
    storage.set({ habitLog });
  },
  decrementHabit: (id, date) => {
    const log = get().habitLog;
    const day = { ...(log[date] || {}) };
    const cur = day[id] || 0;
    if (cur <= 0) return;
    if (cur === 1) delete day[id];
    else day[id] = cur - 1;
    const habitLog = { ...log };
    if (Object.keys(day).length > 0) habitLog[date] = day;
    else delete habitLog[date];
    set({ habitLog });
    storage.set({ habitLog });
  },
  // Bool toggle for target=1 habits. For multi-target habits, falls back to
  // setting the count to 0 if anything > 0, else 1.
  toggleHabit: (id, date) => {
    const habit = get().habits.find((h) => h.id === id);
    if (!habit) return;
    const log = get().habitLog;
    const cur = log[date]?.[id] || 0;
    if (cur > 0) get().decrementHabit(id, date);
    else get().incrementHabit(id, date);
  },

  // ── timer
  setTimerState: (patch) => {
    const next = { ...get().timerState, ...patch };
    set({ timerState: next });
    storage.set({ timerState: next });
  },
}));
