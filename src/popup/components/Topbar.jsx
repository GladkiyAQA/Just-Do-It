export default function Topbar({ onOpenSettings }) {
  return (
    <header data-section="header" className="glass px-4 py-3 flex items-center flex-shrink-0">
      <div className="topbar-brand flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-sm accent-bg shadow-md">
          ✓
        </div>
        <span className="font-semibold text-slate-800 tracking-tight">Just Do It!</span>
      </div>
      <div className="flex gap-1 ml-auto text-slate-700">
        <button
          onClick={onOpenSettings}
          title="Настройки"
          className="px-2 py-1 rounded-lg hover:bg-white/40 transition"
        >
          ⚙
        </button>
      </div>
    </header>
  );
}
