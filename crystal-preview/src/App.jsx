import { useState, useEffect } from 'react';

const PRESETS = [
  { name: 'Arctic',   hue: 205 },
  { name: 'Emerald',  hue: 160 },
  { name: 'Amethyst', hue: 270 },
  { name: 'Rose',     hue: 340 },
  { name: 'Sand',     hue:  35 },
];

export default function App() {
  const [hue, setHue] = useState(205);
  const [tasks, setTasks] = useState([
    { id: 1, text: 'Спроектировать новую палитру Crystal',         done: true  },
    { id: 2, text: 'Настроить glass-эффекты для карточек',         done: false },
    { id: 3, text: 'Подобрать профессиональные оттенки HSL',       done: false },
    { id: 4, text: 'Перенести токены обратно в popup.css',         done: false },
  ]);
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(25 * 60);

  useEffect(() => {
    document.documentElement.style.setProperty('--c-hue', hue);
  }, [hue]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [running]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  const toggleTask = (id) =>
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6">
      <div className="w-full max-w-[420px] flex flex-col gap-4">

        {/* Topbar */}
        <header className="glass rounded-2xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md"
              style={{ background: `hsl(${hue} 55% 48%)` }}
            >
              ✓
            </div>
            <span className="font-semibold text-slate-800 tracking-tight">Just Do It!</span>
          </div>
          <div className="flex gap-1 text-slate-700">
            <button className="px-2 py-1 rounded-lg hover:bg-white/40 transition">⚙</button>
            <button className="px-2 py-1 rounded-lg hover:bg-white/40 transition">🌿</button>
          </div>
        </header>

        {/* Hue presets */}
        <div className="glass-soft rounded-xl p-2 flex gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => setHue(p.hue)}
              className={`flex-1 text-xs font-medium py-1.5 rounded-lg transition border ${
                hue === p.hue
                  ? 'border-white/80 bg-white/45 text-slate-900'
                  : 'border-transparent text-slate-700 hover:bg-white/25'
              }`}
              style={{
                boxShadow:
                  hue === p.hue
                    ? `inset 0 0 0 2px hsl(${p.hue} 55% 48% / 0.5)`
                    : 'none',
              }}
            >
              <span
                className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 align-middle"
                style={{ background: `hsl(${p.hue} 55% 48%)` }}
              />
              {p.name}
            </button>
          ))}
        </div>

        {/* Hue slider */}
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Оттенок
            </span>
            <span className="text-xs text-slate-600 tabular-nums">{hue}°</span>
          </div>
          <input
            type="range"
            min="0"
            max="360"
            value={hue}
            onChange={(e) => setHue(Number(e.target.value))}
            className="w-full accent-slate-800"
            style={{
              background:
                'linear-gradient(to right, hsl(0 60% 50%), hsl(60 60% 50%), hsl(120 60% 50%), hsl(180 60% 50%), hsl(240 60% 50%), hsl(300 60% 50%), hsl(360 60% 50%))',
              borderRadius: 9999,
              height: 6,
              appearance: 'none',
            }}
          />
        </div>

        {/* Timer */}
        <div className="glass rounded-2xl p-5 flex flex-col items-center">
          <div className="flex gap-1 text-[11px] mb-3 glass-soft rounded-lg p-1">
            {['Pomodoro', 'Short', 'Long'].map((m, i) => (
              <button
                key={m}
                className={`px-3 py-1 rounded-md transition ${
                  i === 0
                    ? 'text-white font-semibold'
                    : 'text-slate-700 hover:bg-white/30'
                }`}
                style={{
                  background: i === 0 ? `hsl(${hue} 55% 48%)` : 'transparent',
                }}
              >
                {m}
              </button>
            ))}
          </div>
          <div className="text-[56px] font-bold text-slate-900 tabular-nums tracking-wider leading-none">
            {mm}:{ss}
          </div>
          <div className="text-xs text-slate-600 mt-1 mb-4">Сосредоточься на задаче</div>
          <button
            onClick={() => setRunning((r) => !r)}
            className="w-full text-white font-semibold py-3 rounded-xl transition active:translate-y-px"
            style={{
              background: `hsl(${hue} 55% 48%)`,
              boxShadow: `0 8px 24px hsl(${hue} 55% 48% / 0.45), inset 0 1px 0 rgba(255,255,255,0.35)`,
            }}
          >
            {running ? 'Пауза' : 'Начать'}
          </button>
        </div>

        {/* Tasks */}
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Задачи
            </span>
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{
                background: `hsl(${hue} 55% 48% / 0.14)`,
                color: `hsl(${hue} 55% 32%)`,
              }}
            >
              {tasks.filter((t) => !t.done).length} / {tasks.length}
            </span>
          </div>
          <ul className="flex flex-col">
            {tasks.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-3 py-2 border-b border-white/30 last:border-b-0"
              >
                <input
                  type="checkbox"
                  className="crystal-check"
                  checked={t.done}
                  onChange={() => toggleTask(t.id)}
                />
                <span
                  className={`text-sm leading-snug ${
                    t.done ? 'line-through text-slate-500' : 'text-slate-800'
                  }`}
                >
                  {t.text}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-center text-[11px] text-slate-700/80">
          Песочница Crystal — экспериментальные палитры и glass-эффекты
        </p>
      </div>
    </div>
  );
}
