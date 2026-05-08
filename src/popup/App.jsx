import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../lib/store.js';
import { storage } from '../lib/storage.js';
import Topbar from './components/Topbar.jsx';
import BottomNav from './components/BottomNav.jsx';
import Timer from './components/Timer.jsx';
import Tasks from './components/Tasks.jsx';
import Calendar from './components/Calendar.jsx';
import Settings from './components/Settings.jsx';
import HabitsManager from './components/HabitsManager.jsx';

export default function App() {
  const hydrate = useStore((s) => s.hydrate);
  const crystalHue = useStore((s) => s.crystalHue);
  const [tab, setTab] = useState('tasks');
  const [showSettings, setShowSettings] = useState(false);
  const [showHabits, setShowHabits] = useState(false);
  const [tasksJumpSignal, setTasksJumpSignal] = useState(0);
  const [inPanel, setInPanel] = useState(() =>
    typeof document !== 'undefined' &&
    document.documentElement.classList.contains('in-panel'),
  );

  // Watch for in-panel class being added later (resize handler in main.jsx).
  useEffect(() => {
    if (typeof MutationObserver === 'undefined') return;
    const obs = new MutationObserver(() => {
      setInPanel(document.documentElement.classList.contains('in-panel'));
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  const handleNavDoubleClick = (key) => {
    if (key === 'tasks') {
      // Reset Tasks back to today.
      const d = new Date();
      const todayIso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      useStore.getState().setSelectedDate(todayIso);
      setTasksJumpSignal((n) => n + 1);
    }
  };

  const handleCalendarPick = (iso) => {
    useStore.getState().setSelectedDate(iso);
    setTab('tasks');
    setTasksJumpSignal((n) => n + 1);
  };
  const [ready, setReady] = useState(false);

  // Initial hydrate.
  useEffect(() => {
    hydrate().then(() => {
      // If a timer is already running (e.g. service worker auto-started one
      // after a break), surface the Timer tab right away so the user lands on
      // the active session instead of Tasks.
      const ts = useStore.getState().timerState;
      if (ts?.isRunning) setTab('timer');
      setReady(true);
    });
    // If the alarm window is alive but minimized/behind, bring it to front.
    chrome.runtime.sendMessage({ type: 'FOCUS_ALARM_IF_EXISTS' }).catch(() => {});
  }, [hydrate]);

  // Apply crystal hue as CSS variable.
  useEffect(() => {
    document.documentElement.style.setProperty('--c-hue', crystalHue);
  }, [crystalHue]);

  // Apply theme class to <body>.
  const theme = useStore((s) => s.theme);
  useEffect(() => {
    document.body.classList.remove('theme-crystal', 'theme-notion', 'theme-dark');
    document.body.classList.add(`theme-${theme || 'crystal'}`);
  }, [theme]);

  // React to external storage changes (other windows / service worker).
  useEffect(() => {
    return storage.onChanged((changes) => {
      const patch = {};
      if (changes.tasks)            patch.tasks = changes.tasks.newValue || [];
      if (changes.timerState)       patch.timerState = changes.timerState.newValue;
      if (changes.theme)            patch.theme = changes.theme.newValue;
      if (changes.crystalHue)       patch.crystalHue = changes.crystalHue.newValue;
      if (changes.currentTaskIndex) patch.currentTaskIndex = changes.currentTaskIndex.newValue;
      if (changes.durations)        patch.durations = changes.durations.newValue;
      if (changes.pomodoroCounts)   patch.pomodoroCounts = changes.pomodoroCounts.newValue || {};
      if (changes.pomodoroGoal)     patch.pomodoroGoal = changes.pomodoroGoal.newValue || 4;
      if (changes.habits)           patch.habits = changes.habits.newValue || [];
      if (changes.habitLog)         patch.habitLog = changes.habitLog.newValue || {};
      if (changes.uiMode)           patch.uiMode = changes.uiMode.newValue === 'sidebar' ? 'sidebar' : 'popup';
      if (Object.keys(patch).length) useStore.setState(patch);
    });
  }, []);

  // Note: auto-start of the next Pomodoro is handled by the service worker
  // via the `pendingStart` flag — see src/background/index.js. The popup just
  // displays whatever timerState the SW has already set up.

  if (!ready) {
    return <div className="h-full flex items-center justify-center text-white/80 text-sm">Загрузка…</div>;
  }

  return (
    <div className="h-full flex flex-col">
      {!showSettings && !showHabits && !inPanel && <Topbar onOpenSettings={() => setShowSettings(true)} />}
      <main className="flex-1 overflow-y-auto glass-scroll px-3 py-3 flex flex-col gap-3 relative">
        <AnimatePresence mode="wait" initial={false}>
          {showSettings ? (
            <motion.div
              key="settings"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="flex flex-col gap-3"
            >
              <Settings onClose={() => setShowSettings(false)} />
            </motion.div>
          ) : showHabits ? (
            <motion.div
              key="habits-mgr"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="flex flex-col gap-3"
            >
              <HabitsManager onClose={() => setShowHabits(false)} />
            </motion.div>
          ) : (
            <motion.div
              key={`tab-${tab}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className="flex flex-col gap-3"
            >
              {tab === 'timer' && <Timer />}
              {tab === 'tasks' && <Tasks jumpSignal={tasksJumpSignal} onOpenHabits={() => setShowHabits(true)} />}
              {tab === 'calendar' && (
                <Calendar onPickDate={handleCalendarPick} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      {!showSettings && !showHabits && (
        <BottomNav
          active={tab}
          onChange={setTab}
          onDoubleClick={handleNavDoubleClick}
          onOpenSettings={inPanel ? () => setShowSettings(true) : undefined}
        />
      )}
    </div>
  );
}
