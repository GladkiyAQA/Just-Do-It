// Compute completion percentage for a list of tasks.
//
// • If the parent task is checked → counts as fully done (1 unit), regardless
//   of how many subtasks are individually marked. The user is telling us the
//   whole block is complete.
// • Otherwise, if it has subtasks → counts as the fraction of done subtasks.
// • Otherwise (plain task, not done) → 0.
//
// Result: 0..100.

export function computeProgress(tasks) {
  if (!tasks || tasks.length === 0) return 0;
  const total = tasks.length;
  let done = 0;
  for (const t of tasks) {
    if (t.done) {
      done += 1;
      continue;
    }
    const subs = t.subtasks || [];
    if (subs.length > 0) {
      const subDone = subs.filter((s) => s.done).length;
      done += subDone / subs.length;
    }
  }
  return (done / total) * 100;
}

// Habits-only progress for a date — fraction of (count / target) summed and
// averaged across all habits active that day. Each habit contributes equally.
export function computeHabitsProgress(habits, log, date) {
  if (!habits || habits.length === 0) return 0;
  let acc = 0;
  for (const h of habits) {
    const target = Math.max(1, h.targetPerDay || 1);
    const cur = Math.min(target, log?.[date]?.[h.id] || 0);
    acc += cur / target;
  }
  return (acc / habits.length) * 100;
}

// Day-level progress combining tasks and habits 50/50.
// • Both present → average.
// • Only one category present → 100% weight on it.
// • Neither → 0.
export function computeDayProgress({ tasks, habits, log, date }) {
  const hasTasks = tasks && tasks.length > 0;
  const hasHabits = habits && habits.length > 0;
  if (!hasTasks && !hasHabits) return 0;
  if (hasTasks && !hasHabits) return computeProgress(tasks);
  if (!hasTasks && hasHabits) return computeHabitsProgress(habits, log, date);
  return (computeProgress(tasks) + computeHabitsProgress(habits, log, date)) / 2;
}

// Count of "done" habits for the day (count >= target). Used for header chip.
export function countDoneHabits(habits, log, date) {
  if (!habits || habits.length === 0) return 0;
  let n = 0;
  for (const h of habits) {
    const target = Math.max(1, h.targetPerDay || 1);
    const cur = log?.[date]?.[h.id] || 0;
    if (cur >= target) n += 1;
  }
  return n;
}

// Count of fully-done tasks for the day (parent.done OR all subtasks done).
export function countDoneTasks(tasks) {
  if (!tasks || tasks.length === 0) return 0;
  let n = 0;
  for (const t of tasks) {
    if (t.done) { n += 1; continue; }
    const subs = t.subtasks || [];
    if (subs.length > 0 && subs.every((s) => s.done)) n += 1;
  }
  return n;
}
