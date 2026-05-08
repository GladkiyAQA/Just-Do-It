const ITEMS = [
  { key: 'timer',    label: 'Таймер',    icon: '⏱' },
  { key: 'tasks',    label: 'Задачи',    icon: '✓' },
  { key: 'calendar', label: 'Календарь', icon: '📅' },
];

export default function BottomNav({ active, onChange, onDoubleClick, onOpenSettings }) {
  return (
    <nav data-section="nav" className="glass flex items-center justify-around py-2 flex-shrink-0">
      {ITEMS.map((it) => (
        <button
          key={it.key}
          onClick={() => onChange(it.key)}
          onDoubleClick={() => onDoubleClick?.(it.key)}
          className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-lg transition ${
            active === it.key
              ? 'accent-soft-bg accent-text font-semibold'
              : 'text-slate-700 hover:bg-white/30'
          }`}
        >
          <span className="text-base leading-none">{it.icon}</span>
          <span className="text-[10px]">{it.label}</span>
        </button>
      ))}
      {onOpenSettings && (
        <button
          onClick={onOpenSettings}
          className="flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-lg transition text-slate-700 hover:bg-white/30"
        >
          <span className="text-base leading-none">⚙</span>
          <span className="text-[10px]">Настройки</span>
        </button>
      )}
    </nav>
  );
}
