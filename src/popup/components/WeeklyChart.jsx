import { useMemo, useState } from 'react';
import { useStore } from '../../lib/store.js';
import { weeklySeries } from '../../lib/stats.js';
import {
  todayISO,
  weekStartFor,
  formatWeekRange,
  addDaysISO,
} from '../../lib/date.js';

const METRICS = [
  { id: 'pomodoros', label: 'Помодоры', color: 'fill-orange-400', accentText: 'text-orange-500' },
  { id: 'tasks',     label: 'Задачи',   color: 'fill-emerald-400', accentText: 'text-emerald-600' },
  { id: 'habits',    label: 'Привычки', color: 'fill-sky-400',     accentText: 'text-sky-600' },
];

const DAY_LABELS = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

export default function WeeklyChart() {
  const pomodoroCounts = useStore((s) => s.pomodoroCounts);
  const tasks          = useStore((s) => s.tasks);
  const habits         = useStore((s) => s.habits);
  const habitLog       = useStore((s) => s.habitLog);
  const selectedDate   = useStore((s) => s.selectedDate);

  const today = todayISO();
  const [metric, setMetric] = useState('pomodoros');
  const [weekStart, setWeekStart] = useState(() => weekStartFor(selectedDate || today));

  const meta = METRICS.find((m) => m.id === metric);

  const series = useMemo(
    () => weeklySeries({ weekStart, metric, pomodoroCounts, tasks, habits, habitLog }),
    [weekStart, metric, pomodoroCounts, tasks, habits, habitLog],
  );

  const max = Math.max(1, ...series.map((d) => d.value));
  // Round nicely up to next sensible scale.
  const niceMax = max <= 5 ? 5 : Math.ceil(max / 5) * 5;

  const goPrev = () => setWeekStart((w) => addDaysISO(w, -7));
  const goNext = () => setWeekStart((w) => addDaysISO(w, 7));
  const goThis = () => setWeekStart(weekStartFor(today));

  // SVG layout
  const W = 280;
  const H = 130;
  const padTop = 18;
  const padBottom = 22;
  const padX = 8;
  const inner = W - padX * 2;
  const barSlot = inner / 7;
  const barW = Math.min(26, barSlot * 0.55);
  const chartH = H - padTop - padBottom;

  return (
    <section data-section="stats" className="glass rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <span className="text-xs text-slate-600 uppercase tracking-wider font-medium">
            Статистика за неделю
          </span>
          <span className="text-sm font-semibold text-slate-900">
            {formatWeekRange(weekStart)}
          </span>
        </div>
        <select
          value={metric}
          onChange={(e) => setMetric(e.target.value)}
          className="text-xs bg-white/60 border border-white/70 rounded-lg px-2 py-1 text-slate-800 outline-none focus:accent-ring cursor-pointer"
        >
          {METRICS.map((m) => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        {/* Bars */}
        {series.map((d, i) => {
          const cx = padX + barSlot * i + barSlot / 2;
          const isToday  = d.iso === today;
          const isFuture = d.iso > today;
          const ratio = d.value / niceMax;
          const minVisible = d.value > 0 ? 4 : 0;
          const h = Math.max(minVisible, Math.round(ratio * chartH));
          const y = padTop + (chartH - h);
          const x = cx - barW / 2;
          return (
            <g key={d.iso}>
              {/* value label above */}
              {!isFuture && d.value > 0 && (
                <text
                  x={cx}
                  y={y - 4}
                  textAnchor="middle"
                  className="fill-slate-800 text-[10px] font-semibold"
                  style={{ fontSize: 10 }}
                >
                  {d.value}
                </text>
              )}
              {isFuture ? (
                <rect
                  x={x}
                  y={padTop + chartH - 4}
                  width={barW}
                  height={4}
                  rx={2}
                  className="fill-slate-300"
                  opacity="0.5"
                />
              ) : d.value === 0 ? (
                <rect
                  x={x}
                  y={padTop + chartH - 3}
                  width={barW}
                  height={3}
                  rx={1.5}
                  className="fill-slate-300"
                />
              ) : (
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={h}
                  rx={4}
                  className={`${meta.color} ${isToday ? '' : 'opacity-85'}`}
                />
              )}
              {/* day label */}
              <text
                x={cx}
                y={H - 6}
                textAnchor="middle"
                className={isToday ? `${meta.accentText} font-bold` : 'fill-slate-600'}
                style={{ fontSize: 10 }}
              >
                {DAY_LABELS[i]}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="flex items-center justify-between text-[11px] text-slate-600">
        <button onClick={goPrev} className="px-2 py-1 rounded hover:bg-black/[0.05] transition">‹ Назад</button>
        <button onClick={goThis} className="px-2 py-1 rounded hover:bg-black/[0.05] transition">Эта неделя</button>
        <button onClick={goNext} className="px-2 py-1 rounded hover:bg-black/[0.05] transition">Вперёд ›</button>
      </div>
    </section>
  );
}
