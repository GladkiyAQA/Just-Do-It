import { useStore } from '../../lib/store.js';

const COLOR_DOT = {
  blue:   'bg-sky-400',
  green:  'bg-emerald-400',
  yellow: 'bg-amber-400',
  red:    'bg-rose-400',
  purple: 'bg-violet-400',
  pink:   'bg-pink-400',
  teal:   'bg-teal-400',
  orange: 'bg-orange-400',
};

function scheduleLabel(schedule) {
  if (!schedule || schedule.type === 'daily') return 'Каждый день';
  const days = schedule.days || [];
  if (days.length === 7) return 'Каждый день';
  if (days.length === 5 && [0,1,2,3,4].every((d) => days.includes(d))) return 'Будни';
  if (days.length === 2 && [5,6].every((d) => days.includes(d))) return 'Выходные';
  const ABBR = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
  return [...days].sort((a,b) => a-b).map((d) => ABBR[d]).join(' ');
}

export default function HabitItem({ habit, date, editable = true }) {
  const log         = useStore((s) => s.habitLog);
  const incHabit    = useStore((s) => s.incrementHabit);
  const decHabit    = useStore((s) => s.decrementHabit);
  const toggleHabit = useStore((s) => s.toggleHabit);
  const removeHabit = useStore((s) => s.removeHabit);

  const target = Math.max(1, habit.targetPerDay || 1);
  const cur    = log?.[date]?.[habit.id] || 0;
  const done   = cur >= target;

  const onPrimary = () => {
    if (!editable) return;
    if (target === 1) toggleHabit(habit.id, date);
    else incHabit(habit.id, date);
  };

  return (
    <div
      className={`group task-row relative flex items-center gap-2 py-1.5 px-2 rounded-xl border transition ${
        done ? 'habit-done-row' : 'border-transparent'
      }`}
    >
      {/* Icon — fixed-width slot so habit names line up regardless of glyph */}
      <span className="w-5 flex items-center justify-center text-base leading-none flex-shrink-0 select-none" aria-hidden="true">
        {habit.icon || '✓'}
      </span>

      {/* Text + meta — content-sized so the centre stays free for the badge */}
      <div className="min-w-0 flex flex-col">
        <span className="text-sm leading-snug truncate text-slate-800">
          {habit.text}
        </span>
        <span className="text-[11px] text-slate-600 leading-snug">
          {scheduleLabel(habit.schedule)}
          {target > 1 && ` · ${cur}/${target}`}
        </span>
      </div>

      {/* Centre area — holds the "Выполнено" badge when done */}
      <div className="flex-1 flex justify-center">
        {done && (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full habit-done-badge whitespace-nowrap">
            Выполнено
          </span>
        )}
      </div>

      {/* Counter (target>1) — minus button on hover */}
      {target > 1 && cur > 0 && editable && (
        <button
          onClick={() => decHabit(habit.id, date)}
          title="Убавить"
          className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded border border-slate-400 text-slate-600 hover:accent-text hover:border-current transition flex-shrink-0"
        >
          <svg viewBox="0 0 16 16" className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M3 8 H13" />
          </svg>
        </button>
      )}

      {/* Primary action */}
      {target === 1 ? (
        <input
          type="checkbox"
          className="crystal-check flex-shrink-0"
          checked={done}
          disabled={!editable}
          onChange={onPrimary}
          aria-label={done ? 'Отменить выполнение' : 'Отметить выполненным'}
        />
      ) : (
        <button
          onClick={onPrimary}
          disabled={!editable || cur >= target}
          title={cur >= target ? 'Выполнено' : 'Прибавить'}
          className={`w-6 h-6 flex items-center justify-center rounded-md border text-sm flex-shrink-0 transition ${
            done
              ? 'habit-done-btn'
              : 'border-slate-400 text-slate-700 hover:accent-text hover:border-current'
          } disabled:opacity-50`}
        >
          <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            {done ? <path d="M3.5 8 L7 11.5 L12.5 5" /> : <path d="M8 3 V13 M3 8 H13" />}
          </svg>
        </button>
      )}

      {/* Delete (hover) */}
      {editable && (
        <button
          onClick={() => {
            if (confirm(`Удалить привычку «${habit.text}»? Все отметки будут потеряны.`)) {
              removeHabit(habit.id);
            }
          }}
          title="Удалить"
          className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center text-slate-500 hover:text-rose-600 flex-shrink-0 transition"
        >
          <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M4 4 L12 12 M12 4 L4 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
