import { useEffect, useMemo, useState, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../../lib/store.js';
import { MUSIC_PRESETS } from '../../lib/musicSources.js';
import { saveMusicFile, clearMusicFile } from '../../lib/musicDB.js';
import { MusicPlayer } from '../../lib/musicPlayer.js';

const PRESETS = [
  { name: 'Arctic',   hue: 205 },
  { name: 'Emerald',  hue: 160 },
  { name: 'Amethyst', hue: 270 },
  { name: 'Rose',     hue: 340 },
  { name: 'Sand',     hue:  35 },
];

function Section({ title, subtitle, defaultOpen = false, sectionKey, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section data-section={sectionKey} className="glass rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/20 transition text-left"
      >
        <span
          className={`text-slate-600 text-[10px] transition-transform duration-200 flex-shrink-0 ${
            open ? 'rotate-90' : ''
          }`}
        >
          ▶
        </span>
        <div className="flex flex-col flex-1 min-w-0">
          <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
            {title}
          </span>
          {subtitle && (
            <span className="text-[10px] text-slate-600 mt-0.5">{subtitle}</span>
          )}
        </div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      title={checked ? 'Авто' : 'Вручную'}
      className={`relative inline-flex items-center w-11 h-6 rounded-full border transition flex-shrink-0 ${
        checked ? 'accent-bg border-transparent' : 'bg-white/30 border-white/55'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-[20px]' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

const MM_MAX = 60;
const SS_MAX = 59;

function capPart(s, max) {
  if (s.length < 2) return s;
  const n = parseInt(s, 10);
  if (Number.isNaN(n)) return '';
  if (n > max) return String(max);
  return s;
}

// Live formatter for the duration input. Strips invalid chars, limits each
// part to 2 digits, auto-inserts ":" after the second minute digit, and caps
// each part at its maximum.
function formatInput(raw) {
  const cleaned = (raw || '').replace(/[^\d:]/g, '');
  if (cleaned.includes(':')) {
    const [m = '', s = ''] = cleaned.split(':');
    const mm = capPart(m.slice(0, 2), MM_MAX);
    const ss = capPart(s.slice(0, 2), SS_MAX);
    return `${mm}:${ss}`;
  }
  const digits = cleaned.slice(0, 4);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return capPart(digits, MM_MAX);
  return `${capPart(digits.slice(0, 2), MM_MAX)}:${capPart(digits.slice(2), SS_MAX)}`;
}

function parseDuration(raw) {
  const trimmed = (raw || '').trim();
  if (!trimmed) return null;
  const [mPart = '', sPart = ''] = trimmed.split(':');
  const minutes = Number(mPart) || 0;
  const seconds = Number(sPart) || 0;
  if (minutes === 0 && seconds === 0) return null;
  return minutes * 60 + seconds;
}

function formatDuration(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function DurationInput({ label, seconds, onChange }) {
  const initial = useMemo(() => formatDuration(seconds), [seconds]);
  const [raw, setRaw] = useState(initial);

  useEffect(() => { setRaw(formatDuration(seconds)); }, [seconds]);

  const handleChange = (e) => setRaw(formatInput(e.target.value));

  const commit = () => {
    const parsed = parseDuration(raw);
    if (parsed === null) {
      setRaw(formatDuration(seconds));
      return;
    }
    const clamped = Math.max(1, Math.min(MM_MAX * 60 + SS_MAX, parsed));
    setRaw(formatDuration(clamped));
    onChange(clamped);
  };

  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] text-slate-700 font-medium">{label}</span>
      <div className="px-3 py-1.5 rounded-lg bg-white/35 border border-white/55 focus-within:accent-ring">
        <input
          type="text"
          inputMode="numeric"
          value={raw}
          onChange={handleChange}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          maxLength={5}
          placeholder="00:00"
          className="w-full bg-transparent outline-none text-slate-900 font-semibold text-sm tabular-nums"
        />
      </div>
    </label>
  );
}

export default function Settings({ onClose }) {
  const crystalHue   = useStore((s) => s.crystalHue);
  const setHue       = useStore((s) => s.setCrystalHue);
  const durations    = useStore((s) => s.durations);
  const setDurations = useStore((s) => s.setDurations);
  const resetDurations = useStore((s) => s.resetDurations);
  const autoMode     = useStore((s) => s.autoMode);
  const setAutoMode  = useStore((s) => s.setAutoMode);
  const alarmWindowMode    = useStore((s) => s.alarmWindowMode);
  const setAlarmWindowMode = useStore((s) => s.setAlarmWindowMode);
  const uiMode             = useStore((s) => s.uiMode);
  const setUiMode          = useStore((s) => s.setUiMode);
  const music        = useStore((s) => s.music);
  const setMusic     = useStore((s) => s.setMusic);
  const theme        = useStore((s) => s.theme);
  const setTheme     = useStore((s) => s.setTheme);
  const fileInputRef = useRef(null);
  const previewRef = useRef(null);
  const [previewState, setPreviewState] = useState('idle'); // 'idle' | 'loading' | 'playing' | 'error'
  const [previewError, setPreviewError] = useState('');

  useEffect(() => {
    previewRef.current = new MusicPlayer();
    return () => previewRef.current?.destroy();
  }, []);

  const togglePreview = async () => {
    if (previewState === 'playing') {
      await previewRef.current?.stop();
      setPreviewState('idle');
      return;
    }
    setPreviewState('loading');
    setPreviewError('');
    const result = await previewRef.current?.start(music);
    if (result?.ok) {
      setPreviewState('playing');
    } else {
      setPreviewState('error');
      setPreviewError(
        result?.reason === 'no-source'
          ? 'Не выбран источник или он пуст.'
          : 'Не удалось воспроизвести (CORS, неверный URL или autoplay-блок). Попробуй другой источник.',
      );
    }
  };

  // Reflect volume changes to the live preview.
  useEffect(() => {
    if (previewState === 'playing') previewRef.current?.setVolume(music.volume ?? 0.35);
  }, [music.volume, previewState]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|ogg|wav|m4a)$/i)) {
      alert('Выберите аудиофайл (mp3, ogg, wav, m4a)');
      return;
    }
    try {
      await saveMusicFile(file);
      setMusic({ source: 'file', fileName: file.name });
      // reset resume position for the new file
      chrome.storage.local.set({ musicLastTime: 0 });
    } catch (err) {
      alert('Не удалось сохранить файл: ' + err.message);
    }
    e.target.value = '';
  };

  const handleFileClear = async () => {
    await clearMusicFile();
    setMusic({ fileName: '', source: music.source === 'file' ? 'preset' : music.source });
    chrome.storage.local.set({ musicLastTime: 0 });
  };

  const updateDurationSecs = (key, totalSecs) => {
    setDurations({ ...durations, [key]: Math.max(1, totalSecs) });
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Header with back button */}
      <section data-section="header" className="glass rounded-2xl px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-700 hover:bg-white/40 transition"
          title="Назад"
        >
          ‹
        </button>
        <span className="font-semibold text-slate-800">Настройки</span>
      </section>

      {/* View / surface mode */}
      <Section title="Вид" subtitle="Поп-ап или боковая панель Chrome" sectionKey="view">
        {[
          {
            value: 'popup',
            title: 'Поп-ап',
            desc: 'Стандартное всплывающее окно при клике на иконку',
          },
          {
            value: 'sidebar',
            title: 'Боковая панель',
            desc: 'Открывается в боковой панели Chrome — не закрывается случайным кликом',
          },
        ].map((opt) => {
          const active = uiMode === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setUiMode(opt.value)}
              className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg border transition mb-1.5 last:mb-0 text-left ${
                active
                  ? 'border-white/80 bg-white/45 text-slate-900'
                  : 'border-white/40 bg-white/20 text-slate-700 hover:bg-white/30'
              }`}
            >
              <span className="flex flex-col flex-1">
                <span className="text-xs font-semibold">{opt.title}</span>
                <span className="text-[10px] text-slate-600 mt-0.5">{opt.desc}</span>
              </span>
              <span
                className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 mt-1 transition ${
                  active ? 'accent-bg border-transparent' : 'border-slate-500'
                }`}
              />
            </button>
          );
        })}
      </Section>

      {/* Theme picker */}
      <Section title="Тема оформления" subtitle="Crystal · Notion · Dark Minimal" sectionKey="theme" defaultOpen>
        {[
          {
            value: 'crystal',
            title: 'Crystal',
            desc: 'Стеклянные карточки на цветном градиенте',
            swatch: 'linear-gradient(135deg, #b6c9e3 0%, #5a85b8 100%)',
          },
          {
            value: 'notion',
            title: 'Notion',
            desc: 'Пастельные карточки на кремовом фоне',
            swatch: 'linear-gradient(135deg, #efe7fb 0%, #e6f0fb 50%, #fde9e7 100%)',
          },
          {
            value: 'dark',
            title: 'Dark Minimal',
            desc: 'Монохромный графит с одним акцентом',
            swatch: 'linear-gradient(135deg, #16161a 0%, #0a0a0c 60%, #26262e 100%)',
          },
        ].map((opt) => {
          const active = theme === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition mb-1.5 last:mb-0 text-left ${
                active
                  ? 'border-white/80 bg-white/45 text-slate-900'
                  : 'border-white/40 bg-white/20 text-slate-700 hover:bg-white/30'
              }`}
            >
              <span
                className="w-9 h-9 rounded-lg border border-white/60 flex-shrink-0"
                style={{ background: opt.swatch }}
              />
              <span className="flex flex-col flex-1">
                <span className="text-xs font-semibold">{opt.title}</span>
                <span className="text-[10px] text-slate-600 mt-0.5">{opt.desc}</span>
              </span>
              <span
                className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 transition ${
                  active ? 'accent-bg border-transparent' : 'border-slate-500'
                }`}
              />
            </button>
          );
        })}
      </Section>

      {/* Pomodoro group */}
      <Section title="Pomodoro" subtitle="Длительности и режим запуска" sectionKey="pomodoro" defaultOpen>
        <div className="flex flex-col gap-2 mb-4">
          {[
            { key: 'pomodoro', label: 'Работа'   },
            { key: 'short',    label: 'Короткий' },
            { key: 'long',     label: 'Длинный'  },
          ].map(({ key, label }) => (
            <DurationInput
              key={key}
              label={label}
              seconds={durations[key]}
              onChange={(v) => updateDurationSecs(key, v)}
            />
          ))}
        </div>

        <button
          onClick={resetDurations}
          className="w-full text-xs font-medium py-2 rounded-lg glass-soft text-slate-800 hover:bg-white/45 transition mb-4"
        >
          ↺ Сбросить к значениям Pomodoro (25 / 5 / 15)
        </button>

        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-800">Режим запуска</span>
            <span className="text-[10px] text-slate-600 mt-0.5">
              {autoMode
                ? 'Перерыв и Pomodoro запускаются сами'
                : 'Подтверждение каждого шага'}
            </span>
          </div>
          <Toggle checked={autoMode} onChange={setAutoMode} />
        </div>
      </Section>

      {/* Alarm window mode */}
      <Section title="Окно уведомления" subtitle="Как появляется alarm после Pomodoro" sectionKey="window">
        {[
          {
            value: 'fullscreen',
            title: 'На весь экран',
            desc: 'Полноэкранный режим с фоновой картинкой',
          },
          {
            value: 'compact',
            title: 'Компактное окно',
            desc: 'Небольшое окно по центру, не отвлекает от работы',
          },
        ].map((opt) => {
          const active = alarmWindowMode === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setAlarmWindowMode(opt.value)}
              className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg border transition mb-1.5 last:mb-0 text-left ${
                active
                  ? 'border-white/80 bg-white/45 text-slate-900'
                  : 'border-white/40 bg-white/20 text-slate-700 hover:bg-white/30'
              }`}
            >
              <span
                className={`mt-1 w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 transition ${
                  active ? 'accent-bg border-transparent' : 'border-slate-500'
                }`}
              />
              <span className="flex flex-col">
                <span className="text-xs font-semibold">{opt.title}</span>
                <span className="text-[10px] text-slate-600 mt-0.5">{opt.desc}</span>
              </span>
            </button>
          );
        })}
      </Section>

      {/* Music on break */}
      <Section title="Музыка на перерыве" subtitle="Джаз-радио, свой URL или mp3-файл" sectionKey="music">
        {/* Master toggle */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-800">Включить</span>
            <span className="text-[10px] text-slate-600 mt-0.5">
              Играть музыку во время перерыва
            </span>
          </div>
          <Toggle checked={music.enabled} onChange={(v) => setMusic({ enabled: v })} />
        </div>

        {/* Volume — always visible: controls both music and bell. */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold text-slate-700 uppercase tracking-wider">
              Громкость (музыка и колокольчик)
            </span>
            <span className="text-[10px] text-slate-700 tabular-nums">
              {Math.round((music.volume ?? 0.35) * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round((music.volume ?? 0.35) * 100)}
            onChange={(e) => {
              const v = Number(e.target.value) / 100;
              setMusic({ volume: v });
            }}
            className="w-full accent-slate-700"
          />
        </div>

        {music.enabled && (
          <>
            {/* Source: presets */}
            <div className="flex flex-col gap-1.5 mb-3">
              <span className="text-[10px] text-slate-700 font-medium uppercase tracking-wider">
                Радио-пресеты
              </span>
              {MUSIC_PRESETS.map((p) => {
                const active = music.source === 'preset' && music.presetId === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setMusic({ source: 'preset', presetId: p.id })}
                    className={`flex flex-col text-left px-3 py-2 rounded-lg border transition ${
                      active
                        ? 'border-white/80 bg-white/45 text-slate-900'
                        : 'border-white/40 bg-white/20 text-slate-700 hover:bg-white/30'
                    }`}
                  >
                    <span className="text-xs font-semibold">{p.name}</span>
                    <span className="text-[10px] text-slate-600">{p.description}</span>
                  </button>
                );
              })}
            </div>

            {/* Source: custom URL */}
            <label className="flex flex-col gap-1 mb-3">
              <span className="text-[10px] text-slate-700 font-medium uppercase tracking-wider">
                Свой URL потока
              </span>
              <div className="flex gap-1.5">
                <input
                  type="url"
                  placeholder="https://example.com/stream.mp3"
                  value={music.customUrl}
                  onChange={(e) => setMusic({ customUrl: e.target.value })}
                  className="flex-1 px-2 py-1.5 text-xs rounded-lg bg-white/35 border border-white/55 text-slate-800 placeholder:text-slate-500 outline-none focus:accent-ring"
                />
                <button
                  onClick={() => setMusic({ source: 'url' })}
                  disabled={!music.customUrl?.trim()}
                  className={`px-3 text-xs font-medium rounded-lg border transition ${
                    music.source === 'url'
                      ? 'border-white/80 bg-white/45 text-slate-900'
                      : 'border-white/40 bg-white/20 text-slate-700 hover:bg-white/30 disabled:opacity-40'
                  }`}
                >
                  {music.source === 'url' ? '✓' : 'Выбрать'}
                </button>
              </div>
            </label>

            {/* Source: uploaded file */}
            <div className="flex flex-col gap-1 mb-3">
              <span className="text-[10px] text-slate-700 font-medium uppercase tracking-wider">
                Свой mp3-файл
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*,.mp3,.ogg,.wav,.m4a"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 px-2 py-1.5 text-xs font-medium rounded-lg border border-white/55 bg-white/20 text-slate-700 hover:bg-white/35 transition truncate"
                >
                  {music.fileName ? `📄 ${music.fileName}` : '📁 Загрузить аудио…'}
                </button>
                {music.fileName && (
                  <>
                    <button
                      onClick={() => setMusic({ source: 'file' })}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
                        music.source === 'file'
                          ? 'border-white/80 bg-white/45 text-slate-900'
                          : 'border-white/40 bg-white/20 text-slate-700 hover:bg-white/30'
                      }`}
                    >
                      {music.source === 'file' ? '✓' : 'Выбрать'}
                    </button>
                    <button
                      onClick={handleFileClear}
                      title="Удалить файл"
                      className="px-2 py-1.5 text-xs rounded-lg text-slate-600 hover:text-rose-600 transition"
                    >
                      ×
                    </button>
                  </>
                )}
              </div>
              {music.source === 'file' && (
                <span className="text-[10px] text-slate-600 mt-1">
                  Воспроизведение продолжается с того места, где было остановлено.
                </span>
              )}
            </div>

            {/* Test play */}
            <button
              onClick={togglePreview}
              className={`w-full mt-3 py-2 rounded-lg text-xs font-medium transition ${
                previewState === 'playing'
                  ? 'accent-bg text-white'
                  : 'glass-soft text-slate-800 hover:bg-white/45'
              }`}
            >
              {previewState === 'playing' && '⏸ Остановить тест'}
              {previewState === 'loading' && '… Подключение'}
              {(previewState === 'idle' || previewState === 'error') && '▶️ Тест источника'}
            </button>
            {previewState === 'error' && (
              <p className="text-[10px] text-rose-700 mt-1.5">{previewError}</p>
            )}
          </>
        )}
      </Section>

      {/* Crystal hue group — only meaningful in Crystal theme */}
      {theme === 'crystal' && (
      <Section title="Палитра Crystal" subtitle="Цвет всего интерфейса" sectionKey="palette">
        <div className="grid grid-cols-5 gap-1.5 mb-4">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => setHue(p.hue)}
              className={`text-[10px] font-medium py-1.5 rounded-lg transition border ${
                crystalHue === p.hue
                  ? 'border-white/80 bg-white/45 text-slate-900'
                  : 'border-transparent text-slate-700 hover:bg-white/25'
              }`}
            >
              <span
                className="block w-3 h-3 rounded-full mx-auto mb-0.5"
                style={{ background: `hsl(${p.hue} 55% 48%)` }}
              />
              {p.name}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
            Hue
          </span>
          <span className="text-[11px] text-slate-700 tabular-nums">{crystalHue}°</span>
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
      </Section>
      )}

      <p className="text-center text-[10px] text-slate-700/70 pt-1">
        Just Do It! v0.2.0 · React · Tailwind
      </p>
    </div>
  );
}
