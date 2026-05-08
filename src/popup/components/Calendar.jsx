import { useMemo, useState } from 'react';
import { useStore } from '../../lib/store.js';
import {
  computeStreak,
  dayDotsFor,
  totalPomodoros,
  weekGoalPercent,
} from '../../lib/stats.js';
import { weekStartFor } from '../../lib/date.js';
import WeeklyChart from './WeeklyChart.jsx';
import { pluralPomodoro, pluralDays } from '../../lib/plural.js';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

const isoFor = (y, m, d) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

export default function Calendar({ onPickDate }) {
  const tasks          = useStore((s) => s.tasks);
  const habits         = useStore((s) => s.habits);
  const habitLog       = useStore((s) => s.habitLog);
  const pomodoroCounts = useStore((s) => s.pomodoroCounts);
  const pomodoroGoal   = useStore((s) => s.pomodoroGoal);
  const selectedDate   = useStore((s) => s.selectedDate);
  const setSelectedDate = useStore((s) => s.setSelectedDate);

  const [cursor, setCursor] = useState(() => {
    const d = new Date(selectedDate);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const firstDay = new Date(cursor.year, cursor.month, 1);
  const offset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const todayISOStr = (() => {
    const d = new Date();
    return isoFor(d.getFullYear(), d.getMonth(), d.getDate());
  })();

  const move = (delta) => {
    setCursor((c) => {
      const m = c.month + delta;
      return {
        year: c.year + Math.floor(m / 12),
        month: ((m % 12) + 12) % 12,
      };
    });
  };

  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  // KPI values
  const totalPom = useMemo(() => totalPomodoros(pomodoroCounts), [pomodoroCounts]);
  const goalPct  = useMemo(
    () => weekGoalPercent({
      weekStart: weekStartFor(todayISOStr),
      pomodoroCounts,
      pomodoroGoal,
    }),
    [pomodoroCounts, pomodoroGoal, todayISOStr],
  );
  const streak = useMemo(
    () => computeStreak({ pomodoroCounts, habits, habitLog }),
    [pomodoroCounts, habits, habitLog],
  );

  return (
    <div className="flex flex-col gap-3">
      <section data-section="calendar" className="glass rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => move(-1)} className="px-2 py-1 rounded-lg text-slate-700 hover:bg-white/40">‹</button>
          <span className="text-sm font-semibold text-slate-800">
            {MONTHS[cursor.month]} {cursor.year}
          </span>
          <button onClick={() => move(1)} className="px-2 py-1 rounded-lg text-slate-700 hover:bg-white/40">›</button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAYS.map((w) => (
            <div key={w} className="text-center text-[10px] text-slate-700 font-medium py-1">{w}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, idx) => {
            if (d === null) return <div key={idx} />;
            const iso = isoFor(cursor.year, cursor.month, d);
            const isToday = iso === todayISOStr;
            const isSelected = iso === selectedDate;
            const dots = dayDotsFor({ iso, pomodoroCounts, tasks, habits, habitLog });
            return (
              <button
                key={idx}
                onClick={() => {
                  setSelectedDate(iso);
                  onPickDate?.(iso);
                }}
                className={`relative aspect-square rounded-lg text-xs flex items-center justify-center transition ${
                  isToday
                    ? 'accent-bg text-white font-bold'
                    : isSelected
                    ? 'accent-soft-bg accent-text font-semibold'
                    : 'text-slate-800 hover:bg-white/40'
                }`}
              >
                {d}
                {(dots.pomodoro || dots.task || dots.habit) && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                    {dots.pomodoro && (
                      <span className={`w-1 h-1 rounded-full ${isToday ? 'bg-white/90' : 'bg-orange-400'}`} />
                    )}
                    {dots.task && (
                      <span className={`w-1 h-1 rounded-full ${isToday ? 'bg-white/90' : 'bg-emerald-400'}`} />
                    )}
                    {dots.habit && (
                      <span className={`w-1 h-1 rounded-full ${isToday ? 'bg-white/90' : 'bg-sky-400'}`} />
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <WeeklyChart />

      {/* KPI row */}
      <section data-section="kpi" className="grid grid-cols-3 gap-2">
        <div className="glass rounded-2xl px-2 py-3 flex flex-col items-center text-center">
          <span className="text-base">🍅</span>
          <span className="font-display text-base font-bold text-slate-900 leading-tight mt-0.5 tabular-nums">
            {totalPom}
          </span>
          <span className="text-[10px] text-slate-600 leading-tight mt-0.5">
            {pluralPomodoro(totalPom)}
          </span>
        </div>
        <div className="glass rounded-2xl px-2 py-3 flex flex-col items-center text-center">
          <span className="text-base">🎯</span>
          <span className="font-display text-base font-bold text-slate-900 leading-tight mt-0.5 tabular-nums">
            {goalPct}%
          </span>
          <span className="text-[10px] text-slate-600 leading-tight mt-0.5">
            цель недели
          </span>
        </div>
        <div className="glass rounded-2xl px-2 py-3 flex flex-col items-center text-center">
          <span className="text-base">🔥</span>
          <span className="font-display text-base font-bold text-slate-900 leading-tight mt-0.5 tabular-nums">
            {streak}
          </span>
          <span className="text-[10px] text-slate-600 leading-tight mt-0.5">
            {pluralDays(streak)} подряд
          </span>
        </div>
      </section>

      {/* spacer for scroll */}
      <div aria-hidden="true" className="h-4 flex-shrink-0" />
    </div>
  );
}
