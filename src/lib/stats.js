// Aggregations for the Calendar tab — daily/weekly stats and streaks.
import { isHabitActiveOnDate } from './store.js';
import { addDaysISO, todayISO, weekDaysFrom, weekStartFor } from './date.js';

// Done tasks for a specific date (non-recurring + recurring with doneDates).
export function doneTasksOnDate(tasks, date) {
  if (!tasks) return 0;
  let n = 0;
  for (const t of tasks) {
    if (t.recurring) {
      if (Array.isArray(t.doneDates) && t.doneDates.includes(date)) n += 1;
      continue;
    }
    if (t.date !== date) continue;
    if (t.done) { n += 1; continue; }
    const subs = t.subtasks || [];
    if (subs.length > 0 && subs.every((s) => s.done)) n += 1;
  }
  return n;
}

// Done habits = habits active that day with count >= target.
export function doneHabitsOnDate(habits, log, date) {
  if (!habits || habits.length === 0) return 0;
  let n = 0;
  for (const h of habits) {
    if (!isHabitActiveOnDate(h, date)) continue;
    const target = Math.max(1, h.targetPerDay || 1);
    const cur = log?.[date]?.[h.id] || 0;
    if (cur >= target) n += 1;
  }
  return n;
}

export function activeHabitsCountOnDate(habits, date) {
  if (!habits) return 0;
  let n = 0;
  for (const h of habits) if (isHabitActiveOnDate(h, date)) n += 1;
  return n;
}

// Build the 7-day series Mon..Sun for one of the metrics.
// metric: 'pomodoros' | 'tasks' | 'habits'
export function weeklySeries({
  weekStart,
  metric,
  pomodoroCounts,
  tasks,
  habits,
  habitLog,
}) {
  const days = weekDaysFrom(weekStart);
  return days.map((iso) => {
    let value = 0;
    if (metric === 'pomodoros') value = pomodoroCounts?.[iso] || 0;
    else if (metric === 'tasks') value = doneTasksOnDate(tasks, iso);
    else if (metric === 'habits') value = doneHabitsOnDate(habits, habitLog, iso);
    return { iso, value };
  });
}

// Total pomodoros across all stored days.
export function totalPomodoros(pomodoroCounts) {
  if (!pomodoroCounts) return 0;
  let s = 0;
  for (const k of Object.keys(pomodoroCounts)) s += pomodoroCounts[k] || 0;
  return s;
}

// Week-goal percentage: total pomodoros done this week / (goal × 7), capped at 100.
export function weekGoalPercent({ weekStart, pomodoroCounts, pomodoroGoal }) {
  const goal = Math.max(1, pomodoroGoal || 1);
  const target = goal * 7;
  let done = 0;
  for (const iso of weekDaysFrom(weekStart)) done += pomodoroCounts?.[iso] || 0;
  return Math.min(100, Math.round((done / target) * 100));
}

// "Active day" = ≥1 pomodoro OR (≥1 active habit that day AND all of them done).
// Pure pomodoro fallback for days without active habits.
function isDayActive({ iso, pomodoroCounts, habits, habitLog }) {
  const pom = pomodoroCounts?.[iso] || 0;
  if (pom > 0) return true;
  const active = (habits || []).filter((h) => isHabitActiveOnDate(h, iso));
  if (active.length === 0) return false;
  const done = doneHabitsOnDate(active, habitLog, iso);
  return done === active.length;
}

// Current consecutive-day streak ending today (or yesterday if today not yet
// counted). We allow "today not yet active" without breaking the streak — count
// from yesterday backwards.
export function computeStreak({ pomodoroCounts, habits, habitLog }) {
  const today = todayISO();
  const todayActive = isDayActive({ iso: today, pomodoroCounts, habits, habitLog });
  let cursor = todayActive ? today : addDaysISO(today, -1);
  let streak = todayActive ? 1 : 0;
  // Look back at most ~365 days to avoid pathological loops.
  for (let i = 0; i < 365; i++) {
    const prev = addDaysISO(cursor, -1);
    if (isDayActive({ iso: prev, pomodoroCounts, habits, habitLog })) {
      streak += 1;
      cursor = prev;
    } else {
      break;
    }
  }
  return streak;
}

// Lightweight per-day flags for calendar dots.
export function dayDotsFor({ iso, pomodoroCounts, tasks, habits, habitLog }) {
  return {
    pomodoro: (pomodoroCounts?.[iso] || 0) > 0,
    task: doneTasksOnDate(tasks, iso) > 0,
    habit: doneHabitsOnDate(habits, habitLog, iso) > 0,
  };
}

export { weekStartFor };
