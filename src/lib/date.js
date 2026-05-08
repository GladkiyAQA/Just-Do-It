// ── Week helpers (Monday-first) ──────────────────────────────────────
const dayMs = 24 * 60 * 60 * 1000;

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function isoToDate(iso) {
  return new Date(iso + 'T00:00:00');
}

export function dateToISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function addDaysISO(iso, n) {
  const d = isoToDate(iso);
  d.setDate(d.getDate() + n);
  return dateToISO(d);
}

// Returns the Monday of the week containing the given ISO date.
export function weekStartFor(iso) {
  const d = isoToDate(iso);
  const dow = (d.getDay() + 6) % 7; // 0 = Mon, 6 = Sun
  d.setDate(d.getDate() - dow);
  return dateToISO(d);
}

// Returns array of 7 ISO dates Mon..Sun starting from the given Monday ISO.
export function weekDaysFrom(mondayIso) {
  return Array.from({ length: 7 }, (_, i) => addDaysISO(mondayIso, i));
}

export function formatWeekRange(mondayIso) {
  const start = isoToDate(mondayIso);
  const end = isoToDate(addDaysISO(mondayIso, 6));
  const today = new Date();
  const sameMonth = start.getMonth() === end.getMonth();
  const sameYear  = start.getFullYear() === end.getFullYear();
  const showYear  = start.getFullYear() !== today.getFullYear() || end.getFullYear() !== today.getFullYear();

  const fmt = (d, withMonth) => {
    const opts = withMonth ? { day: 'numeric', month: 'short' } : { day: 'numeric' };
    return d.toLocaleDateString('ru-RU', opts).replace('.', '');
  };
  const left  = fmt(start, true);
  const right = fmt(end, true);
  const yearLabel = showYear
    ? (sameYear ? ` ${start.getFullYear()}` : ` ${start.getFullYear()}/${end.getFullYear()}`)
    : '';
  if (sameMonth) {
    // both have month — drop month from start: "27 – 3 мая"
    const leftDay = start.getDate();
    return `${leftDay} – ${right}${yearLabel}`;
  }
  return `${left} – ${right}${yearLabel}`;
}

// Format a YYYY-MM-DD ISO date relative to today.
//
// Today           → "Сегодня"
// Tomorrow        → "Завтра"
// Yesterday       → "Вчера"
// Same year       → "2 июля"
// Different year  → "2 июля 2025"

export function formatSelectedDate(iso) {
  if (!iso) return '';
  const sel = new Date(iso + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dayMs = 24 * 60 * 60 * 1000;
  const diff = Math.round((sel.getTime() - today.getTime()) / dayMs);

  if (diff === 0)  return 'Сегодня';
  if (diff === 1)  return 'Завтра';
  if (diff === -1) return 'Вчера';

  const opts = sel.getFullYear() === today.getFullYear()
    ? { day: 'numeric', month: 'long' }
    : { day: 'numeric', month: 'long', year: 'numeric' };
  return sel.toLocaleDateString('ru-RU', opts).replace(' г.', '');
}
