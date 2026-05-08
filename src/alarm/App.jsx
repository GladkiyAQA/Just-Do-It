import { useEffect, useRef, useState } from 'react';
import { storage, normalizeDurations } from '../lib/storage.js';
import { formatTime } from '../lib/timer.js';
import { MusicPlayer } from '../lib/musicPlayer.js';
import Backdrop from './Backdrop.jsx';

const STATES = {
  READY_TO_REST: 'readyToRest',
  BREAK: 'break',
  READY_TO_WORK: 'readyToWork',
};

const AUTO_INTRO_MS = 3000;

function playBell(volume = 0.35) {
  try {
    const a = new Audio(chrome.runtime.getURL('sounds/opening-bell.mp3'));
    a.volume = Math.max(0, Math.min(1, volume));
    a.play().catch(() => {});
  } catch {}
}

export default function App() {
  const [state, setState] = useState(STATES.READY_TO_REST);
  const [hue, setHue] = useState(205);
  const [breakSeconds, setBreakSeconds] = useState(5 * 60);
  const [breakLeft, setBreakLeft] = useState(5 * 60);
  const [autoMode, setAutoMode] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const playerRef = useRef(null);
  const musicRef = useRef(null);
  const windowModeRef = useRef('fullscreen');
  const [theme, setThemeState] = useState('crystal');

  // Hydrate config + ring the first bell.
  useEffect(() => {
    storage.get(['crystalHue', 'durations', 'autoMode', 'music', 'alarmWindowMode', 'theme']).then((d) => {
      setHue(d.crystalHue ?? 205);
      const themeName = d.theme || 'crystal';
      document.body.classList.remove('theme-crystal', 'theme-notion', 'theme-dark');
      document.body.classList.add(`theme-${themeName}`);
      setThemeState(themeName);
      const dur = normalizeDurations(d.durations);
      setBreakSeconds(dur.short);
      setBreakLeft(dur.short);
      setAutoMode(!!d.autoMode);
      musicRef.current = d.music;
      windowModeRef.current = d.alarmWindowMode || 'fullscreen';
      setHydrated(true);
    });
    playBell(musicRef.current?.volume ?? 0.35);
    playerRef.current = new MusicPlayer();

    // Force true fullscreen via the DOM Fullscreen API — only when the user
    // selected the fullscreen alarm mode. In compact mode we keep the small
    // popup window untouched.
    const tryFullscreen = () => {
      if (windowModeRef.current !== 'fullscreen') return;
      const el = document.documentElement;
      if (document.fullscreenElement) return;
      const req = el.requestFullscreen?.bind(el) || el.webkitRequestFullscreen?.bind(el);
      req?.().catch(() => {});
    };
    // Wait until storage hydration finishes before deciding.
    const fsTimer = setTimeout(tryFullscreen, 250);

    return () => {
      clearTimeout(fsTimer);
      playerRef.current?.destroy();
    };
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--c-hue', hue);
  }, [hue]);

  // Auto-mode: after 3s on intro screens, move forward.
  useEffect(() => {
    if (!hydrated || !autoMode) return;
    if (state === STATES.READY_TO_REST) {
      const id = setTimeout(() => setState(STATES.BREAK), AUTO_INTRO_MS);
      return () => clearTimeout(id);
    }
    if (state === STATES.READY_TO_WORK) {
      const id = setTimeout(async () => {
        await storage.set({
          pendingStart: true,
          timerState: { mode: 'pomodoro', isRunning: false, endTime: null, secondsLeft: 0 },
        });
        window.close();
      }, AUTO_INTRO_MS);
      return () => clearTimeout(id);
    }
  }, [state, autoMode, hydrated]);

  // Break tick.
  useEffect(() => {
    if (state !== STATES.BREAK) return;
    if (breakLeft <= 0) {
      playerRef.current?.stop({ savePosition: true });
      playBell(musicRef.current?.volume ?? 0.35);
      setState(STATES.READY_TO_WORK);
      return;
    }
    const id = setInterval(() => setBreakLeft((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [state, breakLeft]);

  // Start music when entering BREAK; stop on transition.
  useEffect(() => {
    if (state === STATES.BREAK && hydrated && musicRef.current?.enabled) {
      playerRef.current?.start(musicRef.current);
      return () => playerRef.current?.stop({ savePosition: true });
    }
  }, [state, hydrated]);

  const startBreakManual = () => setState(STATES.BREAK);
  const startNextPomodoroManual = async () => {
    await storage.set({
      pendingStart: true,
      timerState: { mode: 'pomodoro', isRunning: false, endTime: null, secondsLeft: 0 },
    });
    window.close();
  };
  const skipBreak = () => setState(STATES.READY_TO_WORK);
  const closeWindow = () => window.close();

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-8">
      <Backdrop />}
      <div className="glass rounded-3xl p-10 max-w-md w-full text-center">
        {state === STATES.READY_TO_REST && (
          <>
            <div className="text-6xl mb-3 animate-pulse">🍅</div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Готов отдохнуть?
            </h1>
            <p className="text-sm text-slate-700 mb-6">
              Pomodoro завершён — пора сделать паузу.
            </p>
            {autoMode ? (
              <p className="text-xs text-slate-600">
                Перерыв запустится через несколько секунд…
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                <button
                  onClick={startBreakManual}
                  className="w-full py-3 rounded-xl accent-bg text-white font-semibold"
                >
                  ☕ Запустить отдых ({Math.round(breakSeconds / 60)} мин)
                </button>
                <button
                  onClick={startNextPomodoroManual}
                  className="w-full py-3 rounded-xl glass-soft text-slate-800 font-medium"
                >
                  🍅 Сразу новый Pomodoro
                </button>
                <button onClick={closeWindow} className="text-xs text-slate-600 mt-2">
                  Закрыть
                </button>
              </div>
            )}
          </>
        )}

        {state === STATES.BREAK && (
          <>
            <div className="text-5xl mb-2">🍹</div>
            <div className="text-sm text-slate-700 uppercase tracking-wider font-semibold mb-2">
              Перерыв
            </div>
            <div className="text-7xl font-bold text-slate-900 tabular-nums mb-4">
              {formatTime(breakLeft)}
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/30 overflow-hidden mb-6">
              <div
                className="h-full accent-bg transition-all"
                style={{ width: `${(1 - breakLeft / breakSeconds) * 100}%` }}
              />
            </div>
            <div className="flex flex-col gap-2 items-center">
              <button
                onClick={skipBreak}
                className="px-5 py-2 rounded-xl glass-soft text-slate-800"
              >
                Продолжить работать
              </button>
              <button onClick={closeWindow} className="text-xs text-slate-600 mt-1">
                Закрыть
              </button>
            </div>
          </>
        )}

        {state === STATES.READY_TO_WORK && (
          <>
            <div className="text-6xl mb-3 animate-pulse">💪</div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Готов поработать?
            </h1>
            <p className="text-sm text-slate-700 mb-6">
              Перерыв окончен — возвращаемся к фокусу.
            </p>
            {autoMode ? (
              <p className="text-xs text-slate-600">
                Pomodoro запустится через несколько секунд…
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                <button
                  onClick={startNextPomodoroManual}
                  className="w-full py-3 rounded-xl accent-bg text-white font-semibold"
                >
                  🍅 Запустить новый Pomodoro
                </button>
                <button onClick={closeWindow} className="text-xs text-slate-600 mt-2">
                  Закрыть
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
