import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore, isHabitActiveOnDate } from '../../lib/store.js';
import {
  todayISO,
  weekStartFor,
  addDaysISO,
  isoToDate,
} from '../../lib/date.js';
import { countDoneHabits, countDoneTasks } from '../../lib/progress.js';
import { dayDotsFor } from '../../lib/stats.js';
import { pluralTasks, pluralPomodoro, pluralHabits } from '../../lib/plural.js';
import TaskItem from './TaskItem.jsx';
import HabitItem from './HabitItem.jsx';

function formatFullDate(iso) {
  const d = isoToDate(iso);
  const today = new Date();
  const opts = d.getFullYear() === today.getFullYear()
    ? { day: 'numeric', month: 'long' }
    : { day: 'numeric', month: 'long', year: 'numeric' };
  return d.toLocaleDateString('ru-RU', opts).replace(' г.', '');
}

const WEEKDAYS_FULL  = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
const WEEKDAYS_SHORT = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

function CheckBadge({ bg = 'bg-emerald-500' }) {
  return (
    <span className={`w-[18px] h-[18px] rounded-full flex items-center justify-center flex-shrink-0 ${bg}`}>
      <svg
        viewBox="0 0 16 16"
        className="w-2.5 h-2.5"
        fill="none"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3.5 8 L7 11.5 L12.5 5" />
      </svg>
    </span>
  );
}

function EmptyTasksIllustration() {
  return (
    <svg
      viewBox="0 0 96 96"
      className="w-20 h-20 accent-text opacity-80"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Clipboard body + top clip */}
      <g stroke="currentColor" strokeWidth="2.5" fill="rgba(255,255,255,0.55)">
        <rect x="24" y="22" width="48" height="60" rx="8" />
        <rect x="36" y="14" width="24" height="12" rx="3" />
      </g>
      {/* Checklist items */}
      <g stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round">
        <rect x="32" y="36" width="7" height="7" rx="1.5" />
        <line x1="44" y1="39.5" x2="63" y2="39.5" />
        <rect x="32" y="50" width="7" height="7" rx="1.5" />
        <line x1="44" y1="53.5" x2="63" y2="53.5" />
        <rect x="32" y="64" width="7" height="7" rx="1.5" />
        <line x1="44" y1="67.5" x2="63" y2="67.5" />
      </g>
      {/* Sparkles around */}
      <g fill="currentColor" opacity="0.7">
        <circle cx="11" cy="32" r="2" />
        <circle cx="86" cy="38" r="2.2" />
        <circle cx="14" cy="70" r="1.8" />
        <circle cx="88" cy="74" r="2" />
      </g>
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6">
        <line x1="6" y1="50" x2="11" y2="50" />
        <line x1="8.5" y1="47.5" x2="8.5" y2="52.5" />
        <line x1="89" y1="20" x2="93" y2="20" />
        <line x1="91" y1="18" x2="91" y2="22" />
      </g>
      {/* Accent check badge bottom-right */}
      <g>
        <circle cx="74" cy="78" r="12" fill="#ff5e7a" />
        <path
          d="M68 78 L72.5 82.5 L80 74"
          stroke="white"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>
    </svg>
  );
}

function StatItem({ icon, value, label }) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-lg font-bold text-slate-900 tabular-nums leading-none">
          {value}
        </span>
      </div>
      <span className="text-[11px] text-slate-700 whitespace-nowrap mt-1">
        {label}
      </span>
    </div>
  );
}

export default function Tasks({ jumpSignal = 0, onOpenHabits }) {
  const tasks          = useStore((s) => s.tasks);
  const addTask        = useStore((s) => s.addTask);
  const moveTask       = useStore((s) => s.moveTask);
  const habits         = useStore((s) => s.habits);
  const habitLog       = useStore((s) => s.habitLog);
  const addHabit       = useStore((s) => s.addHabit);
  const pomodoroCounts = useStore((s) => s.pomodoroCounts);
  const pomodoroGoal   = useStore((s) => s.pomodoroGoal);
  const selectedDate   = useStore((s) => s.selectedDate);
  const setSelectedDate = useStore((s) => s.setSelectedDate);

  const today = todayISO();
  const focusDate = selectedDate || today;
  // Sliding 7-day window. Shifts by ±1 day when focusDate crosses the edge,
  // not by a whole week — so day cells animate in/out one at a time.
  const [windowStart, setWindowStart] = useState(() => weekStartFor(focusDate));
  const [shiftDir, setShiftDir] = useState(0); // +1 = forward, -1 = backward, 0 = no shift
  const windowDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDaysISO(windowStart, i)),
    [windowStart],
  );

  // If focusDate is outside the window (e.g. picked from Calendar tab), re-snap.
  useEffect(() => {
    const last = addDaysISO(windowStart, 6);
    if (focusDate < windowStart || focusDate > last) {
      setShiftDir(0);
      setWindowStart(weekStartFor(focusDate));
    }
  }, [focusDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const focusRef = useRef(null);
  const [addingTask, setAddingTask]   = useState(false);
  const [addText, setAddText]         = useState('');
  const [addingHabit, setAddingHabit] = useState(false);
  const [habitText, setHabitText]     = useState('');
  const [dragFrom, setDragFrom]       = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  useEffect(() => {
    if (!jumpSignal) return;
    requestAnimationFrame(() => {
      focusRef.current?.scrollIntoView({ block: 'start' });
    });
  }, [jumpSignal]);

  useEffect(() => {
    setAddingTask(false);
    setAddText('');
    setAddingHabit(false);
    setHabitText('');
  }, [focusDate]);

  const goPrevDay = () => {
    const next = addDaysISO(focusDate, -1);
    if (next < windowStart) {
      setShiftDir(-1);
      setWindowStart(addDaysISO(windowStart, -1));
    } else {
      setShiftDir(0);
    }
    setSelectedDate(next);
  };
  const goNextDay = () => {
    const next = addDaysISO(focusDate, 1);
    if (next > addDaysISO(windowStart, 6)) {
      setShiftDir(1);
      setWindowStart(addDaysISO(windowStart, 1));
    } else {
      setShiftDir(0);
    }
    setSelectedDate(next);
  };
  const pickDay = (iso) => {
    setShiftDir(0);
    setSelectedDate(iso);
  };

  const dayIndex = (isoToDate(focusDate).getDay() + 6) % 7;
  const recurring = tasks
    .map((task, index) => ({ task, index }))
    .filter(({ task }) => task.recurring);
  const dated = tasks
    .map((task, index) => ({ task, index }))
    .filter(({ task }) => !task.recurring && (task.date || today) === focusDate);
  const rawItems = [...recurring, ...dated];
  const items = rawItems.map(({ task, index }) => {
    if (task.recurring) {
      const dd = Array.isArray(task.doneDates) ? task.doneDates : [];
      return { task: { ...task, done: dd.includes(focusDate) }, index };
    }
    return { task, index };
  });
  const itemTasks = items.map(({ task }) => task);
  const habitsForDay = habits.filter((h) => isHabitActiveOnDate(h, focusDate));
  const dayName  = WEEKDAYS_FULL[dayIndex];
  const isToday  = focusDate === today;
  const isFuture = focusDate > today;
  const pomCount  = pomodoroCounts?.[focusDate] || 0;
  const doneTasks = countDoneTasks(itemTasks);
  const doneHbN   = countDoneHabits(habitsForDay, habitLog, focusDate);
  const goal      = Math.max(1, pomodoroGoal || 4);
  const goalPct   = Math.min(100, Math.round((pomCount / goal) * 100));

  const submitAdd = (e) => {
    e.preventDefault();
    if (!addText.trim()) return;
    addTask(addText, focusDate);
    setAddText('');
    setAddingTask(false);
  };
  const submitAddHabit = (e) => {
    e.preventDefault();
    const t = habitText.trim();
    if (!t) return;
    addHabit({ text: t });
    setHabitText('');
    setAddingHabit(false);
  };

  const onDragStart = (i) => setDragFrom(i);
  const onDragEnd = () => { setDragFrom(null); setDragOverIndex(null); };
  const onDragOver = (e, targetIndex) => {
    if (dragFrom === null) return;
    const src = tasks[dragFrom];
    if (!src || src.date !== focusDate) return;
    e.preventDefault();
    if (dragOverIndex !== targetIndex) setDragOverIndex(targetIndex);
  };
  const onDragLeave = (targetIndex) => {
    if (dragOverIndex === targetIndex) setDragOverIndex(null);
  };
  const onDrop = (e, targetIndex) => {
    e.preventDefault();
    if (dragFrom !== null && dragFrom !== targetIndex) {
      const src = tasks[dragFrom];
      if (src && src.date === focusDate) moveTask(dragFrom, targetIndex);
    }
    setDragFrom(null);
    setDragOverIndex(null);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Week strip — no card, just pills on the page background.
          Hover-reveal chevrons on the sides (no own bg, just glyphs). */}
      <div className="relative group/strip px-7">
        <button
          onClick={goPrevDay}
          title="Предыдущий день"
          aria-label="Предыдущий день"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-6 h-7 flex items-center justify-center text-base text-slate-500 hover:text-slate-900 opacity-0 group-hover/strip:opacity-70 hover:!opacity-100 transition"
        >
          ‹
        </button>
        <button
          onClick={goNextDay}
          title="Следующий день"
          aria-label="Следующий день"
          className="absolute right-0 top-1/2 -translate-y-1/2 w-6 h-7 flex items-center justify-center text-base text-slate-500 hover:text-slate-900 opacity-0 group-hover/strip:opacity-70 hover:!opacity-100 transition"
        >
          ›
        </button>
        <div className="grid grid-cols-7 gap-1 overflow-hidden">
          <AnimatePresence initial={false} mode="popLayout" custom={shiftDir}>
            {windowDays.map((iso) => {
              const di    = (isoToDate(iso).getDay() + 6) % 7;
              const dnum  = isoToDate(iso).getDate();
              const isSel = iso === focusDate;
              const isT   = iso === today;
              const dots  = dayDotsFor({ iso, pomodoroCounts, tasks, habits, habitLog });
              const hasAnyDot = dots.pomodoro || dots.task || dots.habit;
              return (
                <motion.button
                  key={iso}
                  layout
                  custom={shiftDir}
                  variants={{
                    enter:  (dir) => ({ opacity: 0, x: dir > 0 ? 24 : dir < 0 ? -24 : 0 }),
                    center: { opacity: 1, x: 0 },
                    exit:   (dir) => ({ opacity: 0, x: dir > 0 ? -24 : dir < 0 ? 24 : 0 }),
                  }}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  onClick={() => pickDay(iso)}
                  className="flex flex-col items-center py-1 rounded-md group/day"
                  title={WEEKDAYS_FULL[di]}
                >
                  <span className={`text-[10px] uppercase tracking-wider leading-none ${
                    isT && !isSel ? 'accent-text font-semibold' : 'text-slate-600'
                  }`}>
                    {WEEKDAYS_SHORT[di]}
                  </span>
                  <span className="relative mt-1 w-7 h-7 flex items-center justify-center text-sm tabular-nums">
                    {isSel && (
                      <motion.span
                        layoutId="dayHighlight"
                        className="absolute inset-0 rounded-lg accent-soft-bg"
                        transition={{ type: 'spring', stiffness: 480, damping: 34 }}
                      />
                    )}
                    <span className={`relative z-10 ${
                      isSel
                        ? 'accent-text font-bold'
                        : isT
                        ? 'accent-text font-bold'
                        : 'text-slate-800 font-medium'
                    } ${!isSel ? 'group-hover/day:bg-black/[0.05] rounded-lg' : ''}`}
                      style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      {dnum}
                    </span>
                  </span>
                  <span className="h-1.5 mt-0.5 flex items-center gap-0.5">
                    {hasAnyDot ? (
                      <>
                        {dots.pomodoro && <span className="w-1 h-1 rounded-full bg-orange-400" />}
                        {dots.task     && <span className="w-1 h-1 rounded-full bg-emerald-400" />}
                        {dots.habit    && <span className="w-1 h-1 rounded-full bg-sky-400" />}
                      </>
                    ) : null}
                  </span>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Hero card — coral/pink */}
      <section
        ref={focusRef}
        data-section="day-hero"
        className="glass rounded-2xl px-4 pt-3 pb-4 flex flex-col gap-4"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-slate-900">
            {dayName}, {formatFullDate(focusDate)}
          </span>
          {isToday && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-2xl accent-pill-bg">
              Сегодня
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3 px-1">
          <StatItem
            icon={<CheckBadge bg="bg-emerald-500" />}
            value={doneTasks}
            label={pluralTasks(doneTasks)}
          />
          <StatItem
            icon={<span className="text-base leading-none flex-shrink-0">🍅</span>}
            value={pomCount}
            label={pluralPomodoro(pomCount)}
          />
          <StatItem
            icon={<CheckBadge bg="bg-violet-500" />}
            value={doneHbN}
            label={pluralHabits(doneHbN)}
          />
        </div>
      </section>

      {/* Tasks card — white */}
      <section data-section="day-tasks" className="glass rounded-2xl px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-slate-900">Задачи</h3>
          {!addingTask && (
            <button
              onClick={() => { setAddingTask(true); setAddText(''); }}
              className="text-xs accent-text hover:opacity-80 transition"
            >
              + Добавить задачу
            </button>
          )}
        </div>

        {addingTask && (
          <form onSubmit={submitAdd} className="mt-1 mb-1">
            <input
              autoFocus
              value={addText}
              onChange={(e) => setAddText(e.target.value)}
              onBlur={() => {
                if (!addText.trim()) {
                  setAddingTask(false);
                  setAddText('');
                }
              }}
              maxLength={200}
              placeholder="Новая задача…"
              className="w-full px-2.5 py-1.5 text-sm rounded-md bg-white/60 border border-white/70 text-slate-800 placeholder:text-slate-500 outline-none focus:accent-ring"
            />
          </form>
        )}

        {items.length > 0 ? (
          <div className="flex flex-col -mx-1">
            <AnimatePresence initial={false}>
              {[
                ...items.filter(({ task }) => !task.done).map(({ task, index }) => (
                  <motion.div
                    key={`task-${task.recurring ? `r${index}` : index}`}
                    layout="position"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  >
                    <TaskItem
                      task={task}
                      index={index}
                      displayDate={focusDate}
                      isDragging={dragFrom === index && !task.recurring}
                      isDragOver={dragOverIndex === index && dragFrom !== index}
                      onDragStart={() => onDragStart(index)}
                      onDragEnd={onDragEnd}
                      onDragOver={(e) => onDragOver(e, index)}
                      onDragLeave={() => onDragLeave(index)}
                      onDrop={(e) => onDrop(e, index)}
                    />
                  </motion.div>
                )),
                items.some(({ task }) => task.done) && (
                  <motion.div
                    key="task-divider"
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="my-2 mx-1 border-t border-slate-300"
                  />
                ),
                ...items.filter(({ task }) => task.done).map(({ task, index }) => (
                  <motion.div
                    key={`task-${task.recurring ? `r${index}` : index}`}
                    layout="position"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  >
                    <TaskItem
                      task={task}
                      index={index}
                      displayDate={focusDate}
                      isDragging={dragFrom === index && !task.recurring}
                      isDragOver={dragOverIndex === index && dragFrom !== index}
                      onDragStart={() => onDragStart(index)}
                      onDragEnd={onDragEnd}
                      onDragOver={(e) => onDragOver(e, index)}
                      onDragLeave={() => onDragLeave(index)}
                      onDrop={(e) => onDrop(e, index)}
                    />
                  </motion.div>
                )),
              ].filter(Boolean)}
            </AnimatePresence>
          </div>
        ) : !addingTask && (
          <div className="flex flex-col items-center text-center py-4">
            <EmptyTasksIllustration />
            <h4 className="text-sm font-bold text-slate-900 mt-3">
              Нет задач на этот день
            </h4>
            <p className="text-xs text-slate-600 mt-1 leading-snug">
              Добавьте задачу, чтобы<br />не забыть о важном
            </p>
            <button
              onClick={() => { setAddingTask(true); setAddText(''); }}
              className="mt-4 px-5 py-2 rounded-xl accent-bg text-white text-xs font-medium hover:opacity-90 transition"
            >
              + Добавить задачу
            </button>
          </div>
        )}
      </section>

      {/* Habits card — sage/green */}
      <section data-section="day-habits" className="glass rounded-2xl px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-baseline gap-1.5">
            <h3 className="text-sm font-bold text-slate-900">Привычки</h3>
            <span className="text-xs text-slate-500 tabular-nums">
              {doneHbN}/{habitsForDay.length}
            </span>
          </div>
          <div className="flex items-center gap-2 -mr-1">
            {!addingHabit && (
              <button
                onClick={() => { setAddingHabit(true); setHabitText(''); }}
                className="text-xs accent-text hover:opacity-80 transition"
              >
                + Добавить привычку
              </button>
            )}
            {onOpenHabits && (
              <button
                onClick={onOpenHabits}
                title="Управление привычками"
                className="w-5 h-5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-black/[0.05] flex items-center justify-center transition"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {addingHabit && (
          <form onSubmit={submitAddHabit} className="mt-1 mb-1">
            <input
              autoFocus
              value={habitText}
              onChange={(e) => setHabitText(e.target.value)}
              onBlur={() => {
                if (!habitText.trim()) {
                  setAddingHabit(false);
                  setHabitText('');
                }
              }}
              maxLength={50}
              placeholder="Новая привычка…"
              className="w-full px-2.5 py-1.5 text-sm rounded-md bg-white/60 border border-white/70 text-slate-800 placeholder:text-slate-500 outline-none focus:accent-ring"
            />
          </form>
        )}

        {habitsForDay.length > 0 ? (
          <div className="flex flex-col -mx-1">
            {habitsForDay.map((h) => (
              <HabitItem
                key={h.id}
                habit={h}
                date={focusDate}
                editable={!isFuture}
              />
            ))}
          </div>
        ) : !addingHabit && (
          <div className="habits-empty-dropzone flex flex-col items-center text-center py-3 px-3 rounded-2xl border border-dashed bg-transparent">
            <span className="text-base leading-none" aria-hidden="true">✨</span>
            <h4 className="text-xs font-bold text-slate-900 mt-1.5">
              Привычек пока нет
            </h4>
            <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
              Добавьте привычки, которые хотите развивать
            </p>
          </div>
        )}
      </section>

      {/* Pomodoros card — lavender */}
      {(isToday || pomCount > 0) && (
        <section data-section="day-pomodoros" className="glass rounded-2xl px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-900">Помидорки</h3>
            <span className="text-xs text-slate-700 tabular-nums">
              {pomCount}/{goal}
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {Array.from({ length: goal }).map((_, i) => (
              <span
                key={i}
                className={`text-lg leading-none transition ${
                  i < pomCount ? '' : 'opacity-30 grayscale'
                }`}
                aria-hidden="true"
              >
                🍅
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
