import { useEffect, useState } from 'react';
import { useStore } from '../lib/store.js';

const PRESETS = [
  { name: 'Arctic',   hue: 205 },
  { name: 'Emerald',  hue: 160 },
  { name: 'Amethyst', hue: 270 },
  { name: 'Rose',     hue: 340 },
  { name: 'Sand',     hue:  35 },
];

export default function App() {
  const hydrate     = useStore((s) => s.hydrate);
  const crystalHue  = useStore((s) => s.crystalHue);
  const setHue      = useStore((s) => s.setCrystalHue);
  const durations   = useStore((s) => s.durations);
  const setDurations = useStore((s) => s.setDurations);
  const [ready, setReady] = useState(false);

  useEffect(() => { hydrate().then(() => setReady(true)); }, [hydrate]);
  useEffect(() => {
    document.documentElement.style.setProperty('--c-hue', crystalHue);
  }, [crystalHue]);

  if (!ready) return null;

  const minutes = (s) => Math.round(s / 60);
  const updateDuration = (key, mins) => {
    const v = Math.max(1, Math.min(180, Number(mins) || 1));
    setDurations({ ...durations, [key]: v * 60 });
  };

  return (
    <div className="min-h-screen w-full flex justify-center p-6">
      <div className="w-full max-w-[560px] flex flex-col gap-4">

        <header className="glass rounded-2xl px-5 py-4 flex items-center justify-between">
          <span className="font-semibold text-slate-800 text-lg">Настройки</span>
          <button
            onClick={() => window.close()}
            className="px-3 py-1 rounded-lg text-slate-700 hover:bg-white/40 text-sm"
          >
            Закрыть
          </button>
        </header>

        {/* Crystal hue */}
        <section className="glass rounded-2xl p-5">
          <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Оттенок Crystal
          </h3>
          <p className="text-xs text-slate-600 mb-3">
            Тонкая настройка цветовой палитры всего интерфейса.
          </p>

          <div className="flex gap-2 mb-4">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                onClick={() => setHue(p.hue)}
                className={`flex-1 text-xs font-medium py-2 rounded-lg transition border ${
                  crystalHue === p.hue
                    ? 'border-white/80 bg-white/45 text-slate-900'
                    : 'border-transparent text-slate-700 hover:bg-white/25'
                }`}
              >
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 align-middle"
                  style={{ background: `hsl(${p.hue} 55% 48%)` }}
                />
                {p.name}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Hue
            </span>
            <span className="text-xs text-slate-700 tabular-nums">{crystalHue}°</span>
          </div>
          <input
            type="range"
            min="0"
            max="360"
            value={crystalHue}
            onChange={(e) => setHue(Number(e.target.value))}
            className="w-full"
            style={{
              background:
                'linear-gradient(to right, hsl(0 60% 50%), hsl(60 60% 50%), hsl(120 60% 50%), hsl(180 60% 50%), hsl(240 60% 50%), hsl(300 60% 50%), hsl(360 60% 50%))',
              borderRadius: 9999,
              height: 6,
              appearance: 'none',
            }}
          />
        </section>

        {/* Durations */}
        <section className="glass rounded-2xl p-5">
          <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Длительности
          </h3>
          <p className="text-xs text-slate-600 mb-3">Минуты каждого режима таймера.</p>

          <div className="grid grid-cols-3 gap-3">
            {[
              { key: 'pomodoro', label: 'Pomodoro' },
              { key: 'short',    label: 'Короткий' },
              { key: 'long',     label: 'Длинный'  },
            ].map(({ key, label }) => (
              <label key={key} className="flex flex-col gap-1">
                <span className="text-[11px] text-slate-700 font-medium">{label}</span>
                <div className="flex items-center gap-1 px-3 py-2 rounded-lg bg-white/35 border border-white/55 focus-within:accent-ring">
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={minutes(durations[key])}
                    onChange={(e) => updateDuration(key, e.target.value)}
                    className="w-12 bg-transparent outline-none text-slate-900 font-semibold"
                  />
                  <span className="text-[11px] text-slate-600">мин</span>
                </div>
              </label>
            ))}
          </div>
        </section>

        <p className="text-center text-[11px] text-slate-700/80">
          Just Do It! v0.2.0 — Crystal · React · Tailwind
        </p>
      </div>
    </div>
  );
}
