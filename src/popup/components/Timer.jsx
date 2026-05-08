import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../../lib/store.js';
import { startTimer, pauseTimer, resetTimer, secondsLeftFromState, formatTime } from '../../lib/timer.js';
import { pluralPomodoro } from '../../lib/plural.js';

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function DartIcon({ className = 'w-4 h-4' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} accent-text`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Shaft */}
      <line x1="5" y1="19" x2="19" y2="5" />
      {/* Tip (arrowhead pointing up-right) */}
      <polyline points="14 5 19 5 19 10" />
      {/* Fletching at back-left */}
      <path d="M5 19 L9 17" />
      <path d="M5 19 L7 15" />
    </svg>
  );
}

function TargetIllustration() {
  return (
    <svg
      viewBox="0 0 96 96"
      className="w-24 h-24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Soft outer halo */}
      <circle cx="42" cy="50" r="32" fill="#fff5f6" />
      {/* Dartboard — alternating coral / white rings */}
      <circle cx="42" cy="50" r="28" fill="#fde9e7" stroke="#f5b3c1" strokeWidth="1.5" />
      <circle cx="42" cy="50" r="22" fill="#ffffff" stroke="#f5b3c1" strokeWidth="1.2" />
      <circle cx="42" cy="50" r="16" fill="#ffd0d8" stroke="#e74463" strokeWidth="1.2" />
      <circle cx="42" cy="50" r="10" fill="#ffffff" stroke="#e74463" strokeWidth="1.2" />
      <circle cx="42" cy="50" r="5"  fill="#e74463" />
      <circle cx="42" cy="50" r="1.6" fill="#ffffff" />

      {/* Dart sticking diagonally up-right, tip at bullseye */}
      {/* Shaft */}
      <line x1="42" y1="50" x2="78" y2="16" stroke="#374151" strokeWidth="3" strokeLinecap="round" />
      {/* Subtle metallic highlight on shaft */}
      <line x1="44" y1="48" x2="76" y2="18" stroke="#9ca3af" strokeWidth="1" strokeLinecap="round" opacity="0.7" />

      {/* Fletching at the back of the shaft, aligned with shaft axis */}
      <g transform="translate(78 16) rotate(-43)">
        <path d="M0 0 L11 -6 L14 0 L11 6 Z" fill="#e74463" stroke="#b03450" strokeWidth="1" strokeLinejoin="round" />
        <line x1="3.5" y1="-2.5" x2="3.5" y2="2.5" stroke="#ffffff" strokeWidth="0.7" opacity="0.8" />
      </g>

      {/* Sparkles around */}
      <g fill="#fda4af" opacity="0.85">
        <circle cx="12" cy="22" r="2" />
        <circle cx="80" cy="78" r="2.4" />
      </g>
      <g stroke="#fda4af" strokeWidth="1.8" strokeLinecap="round" opacity="0.7">
        <line x1="6" y1="62" x2="10" y2="62" />
        <line x1="8" y1="60" x2="8" y2="64" />
        <line x1="86" y1="44" x2="90" y2="44" />
        <line x1="88" y1="42" x2="88" y2="46" />
      </g>
    </svg>
  );
}

const MODES = [
  { key: 'pomodoro', label: 'Pomodoro' },
  { key: 'short',    label: 'Короткий' },
  { key: 'long',     label: 'Длинный'  },
];

export default function Timer({ compact = false }) {
  const timerState = useStore((s) => s.timerState);
  const durations  = useStore((s) => s.durations);
  const tasks      = useStore((s) => s.tasks);
  const currentTaskIndex = useStore((s) => s.currentTaskIndex);
  const setCurrentTaskIndex = useStore((s) => s.setCurrentTaskIndex);
  const pomodoroCounts = useStore((s) => s.pomodoroCounts);
  const pomodoroGoal   = useStore((s) => s.pomodoroGoal);
  const setPomodoroGoal = useStore((s) => s.setPomodoroGoal);
  const [tick, setTick] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState('');
  const intervalRef = useRef(null);
  const pickerRef = useRef(null);

  // Keep ticking while running.
  useEffect(() => {
    if (timerState.isRunning) {
      intervalRef.current = setInterval(() => setTick((t) => t + 1), 500);
      return () => clearInterval(intervalRef.current);
    }
  }, [timerState.isRunning]);

  const secs = secondsLeftFromState(timerState);
  const total = durations[timerState.mode] || 1;
  const progress = 1 - secs / total;
  const currentTask = currentTaskIndex >= 0 ? tasks[currentTaskIndex] : null;
  const today = todayISO();
  const todayTasks = tasks
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => {
      if (t.recurring) {
        const dd = Array.isArray(t.doneDates) ? t.doneDates : [];
        return !dd.includes(today);
      }
      return t.date === today && !t.done;
    });

  // Close picker on outside click.
  useEffect(() => {
    if (!pickerOpen) return;
    const onDocClick = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [pickerOpen]);

  const pickTask = (i) => {
    setCurrentTaskIndex(i);
    setPickerOpen(false);
  };
  const clearCurrent = () => {
    setCurrentTaskIndex(-1);
    setPickerOpen(false);
  };
  // "Завершить задачу" — mark current task done for today and unselect it.
  const completeCurrent = () => {
    if (!currentTask) return;
    const isAlreadyDone = currentTask.recurring
      ? (currentTask.doneDates || []).includes(today)
      : currentTask.done;
    if (!isAlreadyDone) {
      useStore.getState().toggleTaskOnDate(currentTaskIndex, today);
    }
    setCurrentTaskIndex(-1);
    setPickerOpen(false);
  };

  const setMode = (mode) => {
    if (timerState.isRunning) return;
    useStore.getState().setTimerState({ mode, secondsLeft: durations[mode] });
  };
  const handleStart = () =>
    startTimer({ mode: timerState.mode, durations, secondsLeft: secs });
  const handlePause = () => pauseTimer();
  const handleReset = () => resetTimer({ mode: timerState.mode, durations });

  return (
    <>
    <section data-section="timer" className="glass rounded-2xl p-4 flex flex-col items-center">
      {/* Mode tabs */}
      <div className="flex gap-1 text-[11px] mb-3 glass-soft rounded-lg p-1 w-full">
        {MODES.map((m) => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            className={`flex-1 px-2 py-1 rounded-md transition font-medium ${
              timerState.mode === m.key
                ? 'accent-bg text-white'
                : 'text-slate-700 hover:bg-white/30'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Time */}
      <div
        className={`font-bold text-slate-900 tabular-nums tracking-wider leading-none ${
          compact ? 'text-[40px]' : 'text-[56px]'
        }`}
      >
        {formatTime(secs)}
      </div>
      {!compact && (
        <div className="text-xs text-slate-700 mt-1 mb-3 truncate max-w-full">
          {timerState.mode === 'short'
            ? 'Короткий перерыв'
            : timerState.mode === 'long'
              ? 'Длинный перерыв'
              : currentTask
                ? currentTask.text
                : 'Сосредоточься на задаче'}
        </div>
      )}

      {/* Progress bar */}
      <div className="w-full h-1 rounded-full bg-white/30 overflow-hidden mb-3 mt-2">
        <div
          className="h-full accent-bg transition-all"
          style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }}
        />
      </div>

      {/* Buttons */}
      <div className="flex w-full gap-2">
        {timerState.isRunning ? (
          <button
            onClick={handlePause}
            className="flex-1 text-white font-semibold py-2.5 rounded-xl glass-soft border-white/60 text-slate-800"
          >
            Пауза
          </button>
        ) : (
          <button
            onClick={handleStart}
            className="flex-1 text-white font-semibold py-2.5 rounded-xl accent-bg active:translate-y-px transition"
            style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35)' }}
          >
            {secs < total ? 'Продолжить' : 'Начать'}
          </button>
        )}
        <button
          onClick={handleReset}
          title="Сброс"
          className="px-3 rounded-xl glass-soft text-slate-800 hover:bg-white/45"
        >
          ↺
        </button>
      </div>
    </section>

    {/* Active task picker — visible in all modes, not in compact alarm view. */}
    {!compact && (
      <section
        data-section="active-task"
        ref={pickerRef}
        className="glass rounded-2xl p-3 relative"
      >
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-sm leading-none" aria-hidden="true">🎯</span>
          <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
            Сейчас в работе
          </span>
        </div>

        {currentTask ? (
          <>
            <div className="text-sm font-bold text-slate-900 break-words">
              {currentTask.text}
            </div>
            {currentTask.pomodoroBudget > 0 && (
              <div className="text-[11px] text-slate-600 mt-1 mb-3 flex items-center gap-1">
                <span>🍅</span>
                <span className="tabular-nums">
                  {currentTask.pomodoroCount || 0} / {currentTask.pomodoroBudget}
                </span>
                <span>{pluralPomodoro(currentTask.pomodoroBudget)}</span>
              </div>
            )}
            {!currentTask.pomodoroBudget && <div className="mb-3" />}
            <div className="flex gap-2">
              <button
                onClick={() => setPickerOpen((v) => !v)}
                className="task-action-primary flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium hover:opacity-90 transition"
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 4 L4 7 L7 10" />
                  <path d="M4 7 H16 A4 4 0 0 1 20 11" />
                  <path d="M17 20 L20 17 L17 14" />
                  <path d="M20 17 H8 A4 4 0 0 1 4 13" />
                </svg>
                Сменить задачу
              </button>
              <button
                onClick={completeCurrent}
                className="task-action-secondary flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition"
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M8.5 12 L11 14.5 L15.5 9.5" />
                </svg>
                Завершить задачу
              </button>
            </div>
          </>
        ) : (
          <div className="focus-dropzone flex flex-col items-center text-center py-5 px-3 rounded-2xl border border-dashed">
            <TargetIllustration />
            <h4 className="text-sm font-bold text-slate-900 mt-3">
              Выберите задачу для фокуса
            </h4>
            <p className="text-xs text-slate-600 mt-1 leading-snug">
              Это поможет сосредоточиться<br />на важном и отслеживать прогресс
            </p>
            <button
              onClick={() => setPickerOpen((v) => !v)}
              className="focus-cta mt-4 px-5 py-2 rounded-xl text-xs font-medium hover:opacity-90 transition"
            >
              Выбрать задачу
            </button>
          </div>
        )}

        <AnimatePresence>
        {pickerOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute left-3 right-3 mt-1.5 z-10 glass rounded-xl py-1 max-h-64 overflow-y-auto glass-scroll origin-top"
          >
            {todayTasks.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-600">
                На сегодня нет задач. Добавь во вкладке «Задачи».
              </div>
            ) : (
              todayTasks.map(({ t, i }) => {
                const active = i === currentTaskIndex;
                return (
                  <button
                    key={i}
                    onClick={() => pickTask(i)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition ${
                      active
                        ? 'accent-soft-bg accent-text font-medium'
                        : 'text-slate-800 hover:bg-white/35'
                    }`}
                  >
                    <span className="flex-1 min-w-0 truncate">{t.text}</span>
                    {active && <span className="text-[10px] flex-shrink-0">✓</span>}
                  </button>
                );
              })
            )}
            {currentTask && (
              <button
                onClick={clearCurrent}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-slate-600 hover:text-rose-600 hover:bg-white/35 transition border-t border-white/40 mt-1"
              >
                Снять активную задачу
              </button>
            )}
          </motion.div>
        )}
        </AnimatePresence>
      </section>
    )}

    {/* Daily pomodoro goal indicator. */}
    {!compact && (() => {
      const doneToday = pomodoroCounts?.[today] || 0;
      const goal = Math.max(1, pomodoroGoal || 4);
      const reached = doneToday >= goal;
      const ratio = Math.min(1, doneToday / goal);
      const commitGoal = () => {
        const n = parseInt(goalDraft, 10);
        if (Number.isFinite(n) && n > 0) setPomodoroGoal(n);
        setEditingGoal(false);
      };
      return (
        <section data-section="pomodoro-goal" className="glass rounded-2xl p-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[10px] font-semibold text-slate-700 uppercase tracking-wider">
              Помидорки сегодня
            </span>
            {reached && (
              <span className="text-[10px] accent-text font-semibold">Цель достигнута 🎉</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl leading-none flex-shrink-0">🍅</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold text-slate-900 tabular-nums">{doneToday}</span>
                <span className="text-sm text-slate-600">/</span>
                {editingGoal ? (
                  <input
                    autoFocus
                    type="number"
                    min="1"
                    max="99"
                    value={goalDraft}
                    onChange={(e) => setGoalDraft(e.target.value)}
                    onBlur={commitGoal}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.currentTarget.blur();
                      if (e.key === 'Escape') setEditingGoal(false);
                    }}
                    className="w-12 px-1 text-lg font-bold tabular-nums text-slate-900 bg-white/40 border border-white/55 rounded outline-none focus:accent-ring"
                  />
                ) : (
                  <button
                    onClick={() => { setGoalDraft(String(goal)); setEditingGoal(true); }}
                    title="Изменить цель"
                    className="text-lg font-bold text-slate-900 tabular-nums hover:accent-text transition"
                  >
                    {goal}
                  </button>
                )}
                <span className="text-[11px] text-slate-600 ml-1">помидорок</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-white/30 overflow-hidden mt-1.5">
                <div
                  className="h-full accent-bg transition-all"
                  style={{ width: `${ratio * 100}%` }}
                />
              </div>
            </div>
          </div>
        </section>
      );
    })()}
    </>
  );
}
