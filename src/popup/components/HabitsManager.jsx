import { useState } from 'react';
import { useStore } from '../../lib/store.js';

const ICONS = ['✓','💧','📖','🏃','🧘','🥗','💊','☕','💪','🎯','🌱','🛌','🪥','🏊','🚴','🎵','✍️','🌅','🍎','🧠','🚭','📵','🌙','🧴'];
const COLORS = [
  { id: 'blue',   cls: 'bg-sky-400' },
  { id: 'green',  cls: 'bg-emerald-400' },
  { id: 'yellow', cls: 'bg-amber-400' },
  { id: 'red',    cls: 'bg-rose-400' },
  { id: 'purple', cls: 'bg-violet-400' },
  { id: 'pink',   cls: 'bg-pink-400' },
  { id: 'teal',   cls: 'bg-teal-400' },
  { id: 'orange', cls: 'bg-orange-400' },
];
const DAY_ABBR = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

const DAILY    = { type: 'daily',  days: [0,1,2,3,4,5,6] };
const WEEKDAYS = { type: 'weekdays', days: [0,1,2,3,4] };
const WEEKENDS = { type: 'custom', days: [5,6] };

function schedulePresetId(schedule) {
  if (!schedule || schedule.type === 'daily') return 'daily';
  const days = [...(schedule.days || [])].sort((a,b) => a-b).join(',');
  if (days === '0,1,2,3,4') return 'weekdays';
  if (days === '5,6') return 'weekends';
  return 'custom';
}

function scheduleHumanLabel(schedule) {
  const id = schedulePresetId(schedule);
  if (id === 'daily') return 'Каждый день';
  if (id === 'weekdays') return 'Будни';
  if (id === 'weekends') return 'Выходные';
  const days = [...(schedule.days || [])].sort((a,b) => a-b);
  return days.map((d) => DAY_ABBR[d]).join(' ');
}

const EMPTY_FORM = {
  id: null,
  text: '',
  icon: '✓',
  color: 'blue',
  targetPerDay: 1,
  schedule: { ...DAILY },
};

export default function HabitsManager({ onClose }) {
  const habits      = useStore((s) => s.habits);
  const addHabit    = useStore((s) => s.addHabit);
  const editHabit   = useStore((s) => s.editHabit);
  const removeHabit = useStore((s) => s.removeHabit);
  const reorderHabits = useStore((s) => s.reorderHabits);

  const [form, setForm] = useState(null); // null = list view; object = editing/creating
  const [dragFrom, setDragFrom] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const startCreate = () => setForm({ ...EMPTY_FORM });
  const startEdit = (h) => setForm({
    id: h.id,
    text: h.text,
    icon: h.icon || '✓',
    color: h.color || 'blue',
    targetPerDay: h.targetPerDay || 1,
    schedule: h.schedule || { ...DAILY },
  });

  const submit = (e) => {
    e.preventDefault();
    const text = form.text.trim();
    if (!text) return;
    const payload = {
      text,
      icon: form.icon,
      color: form.color,
      targetPerDay: form.targetPerDay,
      schedule: form.schedule,
    };
    if (form.id) editHabit(form.id, payload);
    else addHabit(payload);
    setForm(null);
  };

  const deleteCurrent = () => {
    if (!form?.id) return;
    if (confirm(`Удалить привычку «${form.text}»? Все отметки будут потеряны.`)) {
      removeHabit(form.id);
      setForm(null);
    }
  };

  const setSchedulePreset = (id) => {
    if (id === 'daily')    setForm((f) => ({ ...f, schedule: { ...DAILY } }));
    else if (id === 'weekdays') setForm((f) => ({ ...f, schedule: { ...WEEKDAYS } }));
    else if (id === 'weekends') setForm((f) => ({ ...f, schedule: { ...WEEKENDS } }));
    else setForm((f) => ({ ...f, schedule: { type: 'custom', days: [...(f.schedule.days || [])] } }));
  };

  const toggleCustomDay = (di) => {
    setForm((f) => {
      const cur = new Set(f.schedule.days || []);
      if (cur.has(di)) cur.delete(di); else cur.add(di);
      const days = [...cur].sort((a,b) => a-b);
      return { ...f, schedule: { type: 'custom', days } };
    });
  };

  // ── List view
  if (!form) {
    return (
      <div className="flex flex-col gap-3">
        <section data-section="header" className="glass rounded-2xl px-4 py-3 flex items-center gap-3">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-700 hover:bg-white/40 transition"
            title="Назад"
          >‹</button>
          <span className="font-semibold text-slate-800 flex-1">Привычки</span>
          <button
            onClick={startCreate}
            className="px-3 h-8 rounded-lg accent-bg text-white text-xs font-semibold hover:opacity-90 transition"
          >
            + Добавить
          </button>
        </section>

        <section data-section="habits-list" className="glass rounded-2xl p-2">
          {habits.length === 0 ? (
            <p className="text-center text-xs text-slate-600 py-6">
              Привычек пока нет. Нажми «+ Добавить», чтобы создать первую.
            </p>
          ) : (
            <ul className="flex flex-col">
              {habits.map((h, i) => {
                const dotCls = COLORS.find((c) => c.id === h.color)?.cls || 'bg-sky-400';
                const isDragging = dragFrom === i;
                const isDragOverHere = dragOver === i && dragFrom !== null && dragFrom !== i;
                return (
                  <li
                    key={h.id}
                    onDragOver={(e) => {
                      if (dragFrom === null) return;
                      e.preventDefault();
                      if (dragOver !== i) setDragOver(i);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragFrom !== null && dragFrom !== i) reorderHabits(dragFrom, i);
                      setDragFrom(null);
                      setDragOver(null);
                    }}
                    className={`group flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-white/40 transition relative ${
                      isDragging ? 'opacity-40' : ''
                    } ${isDragOverHere ? 'before:content-[""] before:absolute before:left-2 before:right-2 before:-top-px before:h-0.5 before:rounded before:bg-current before:opacity-70 accent-text' : ''}`}
                  >
                    <span
                      draggable
                      onDragStart={() => setDragFrom(i)}
                      onDragEnd={() => { setDragFrom(null); setDragOver(null); }}
                      className="cursor-grab active:cursor-grabbing w-4 h-5 flex items-center justify-center text-slate-500 hover:text-slate-800 flex-shrink-0 select-none"
                      title="Перетащить"
                    >
                      <svg viewBox="0 0 12 16" className="w-2.5 h-3" fill="currentColor">
                        <circle cx="3" cy="3" r="1.2" /><circle cx="3" cy="8" r="1.2" /><circle cx="3" cy="13" r="1.2" />
                        <circle cx="9" cy="3" r="1.2" /><circle cx="9" cy="8" r="1.2" /><circle cx="9" cy="13" r="1.2" />
                      </svg>
                    </span>
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotCls}`} />
                    <span className="text-base leading-none flex-shrink-0">{h.icon || '✓'}</span>
                    <div className="flex-1 min-w-0 flex flex-col">
                      <span className="text-sm text-slate-800 truncate">{h.text}</span>
                      <span className="text-[11px] text-slate-600">
                        {scheduleHumanLabel(h.schedule)}
                        {(h.targetPerDay || 1) > 1 && ` · цель ${h.targetPerDay}/день`}
                      </span>
                    </div>
                    <button
                      onClick={() => startEdit(h)}
                      className="text-xs px-2 py-1 rounded-md text-slate-700 hover:bg-white/50 transition"
                    >
                      Изменить
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    );
  }

  // ── Form view (create or edit)
  const presetId = schedulePresetId(form.schedule);
  const customDays = form.schedule.days || [];
  const isEdit = !!form.id;

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <section data-section="header" className="glass rounded-2xl px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setForm(null)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-700 hover:bg-white/40 transition"
          title="Назад"
        >‹</button>
        <span className="font-semibold text-slate-800 flex-1">
          {isEdit ? 'Редактировать привычку' : 'Новая привычка'}
        </span>
      </section>

      {/* Name */}
      <section data-section="habit-name" className="glass rounded-2xl px-4 py-3 flex flex-col gap-2">
        <label className="text-[11px] uppercase tracking-wider text-slate-600">Название</label>
        <input
          autoFocus
          value={form.text}
          onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
          maxLength={50}
          placeholder="Например, Вода"
          className="w-full px-2.5 py-1.5 text-sm rounded-md bg-white/60 border border-white/70 text-slate-800 placeholder:text-slate-500 outline-none focus:accent-ring"
        />
      </section>

      {/* Icon */}
      <section data-section="habit-icon" className="glass rounded-2xl px-4 py-3 flex flex-col gap-2">
        <label className="text-[11px] uppercase tracking-wider text-slate-600">Иконка</label>
        <div className="grid grid-cols-8 gap-1">
          {ICONS.map((ic) => {
            const active = form.icon === ic;
            return (
              <button
                type="button"
                key={ic}
                onClick={() => setForm((f) => ({ ...f, icon: ic }))}
                className={`h-8 rounded-md flex items-center justify-center text-base transition ${
                  active ? 'accent-bg text-white' : 'bg-white/40 hover:bg-white/60 text-slate-800'
                }`}
              >
                {ic}
              </button>
            );
          })}
        </div>
      </section>

      {/* Color */}
      <section data-section="habit-color" className="glass rounded-2xl px-4 py-3 flex flex-col gap-2">
        <label className="text-[11px] uppercase tracking-wider text-slate-600">Цвет</label>
        <div className="flex gap-2">
          {COLORS.map((c) => {
            const active = form.color === c.id;
            return (
              <button
                type="button"
                key={c.id}
                onClick={() => setForm((f) => ({ ...f, color: c.id }))}
                className={`w-7 h-7 rounded-full transition ${c.cls} ${
                  active ? 'ring-2 ring-offset-2 ring-offset-white/40 ring-slate-700' : 'opacity-80 hover:opacity-100'
                }`}
                aria-label={c.id}
              />
            );
          })}
        </div>
      </section>

      {/* Schedule */}
      <section data-section="habit-schedule" className="glass rounded-2xl px-4 py-3 flex flex-col gap-2">
        <label className="text-[11px] uppercase tracking-wider text-slate-600">Расписание</label>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { id: 'daily',    label: 'Каждый день' },
            { id: 'weekdays', label: 'Будни' },
            { id: 'weekends', label: 'Выходные' },
            { id: 'custom',   label: 'Свой график' },
          ].map((p) => {
            const active = presetId === p.id;
            return (
              <button
                type="button"
                key={p.id}
                onClick={() => setSchedulePreset(p.id)}
                className={`px-2 py-1.5 rounded-md text-xs transition ${
                  active ? 'accent-bg text-white' : 'bg-white/40 hover:bg-white/60 text-slate-800'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        {presetId === 'custom' && (
          <div className="grid grid-cols-7 gap-1 mt-1">
            {DAY_ABBR.map((ab, di) => {
              const active = customDays.includes(di);
              return (
                <button
                  type="button"
                  key={ab}
                  onClick={() => toggleCustomDay(di)}
                  className={`h-8 rounded-md text-xs font-medium transition ${
                    active ? 'accent-bg text-white' : 'bg-white/40 hover:bg-white/60 text-slate-800'
                  }`}
                >
                  {ab}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Target */}
      <section data-section="habit-target" className="glass rounded-2xl px-4 py-3 flex flex-col gap-2">
        <label className="text-[11px] uppercase tracking-wider text-slate-600">Цель в день</label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, targetPerDay: Math.max(1, (f.targetPerDay || 1) - 1) }))}
            className="w-8 h-8 rounded-md bg-white/40 hover:bg-white/60 text-slate-800 transition flex items-center justify-center"
          >−</button>
          <input
            type="number"
            min="1"
            max="20"
            value={form.targetPerDay}
            onChange={(e) => {
              const n = Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 1));
              setForm((f) => ({ ...f, targetPerDay: n }));
            }}
            className="w-16 text-center px-2 py-1.5 text-sm rounded-md bg-white/60 border border-white/70 text-slate-800 outline-none focus:accent-ring"
          />
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, targetPerDay: Math.min(20, (f.targetPerDay || 1) + 1) }))}
            className="w-8 h-8 rounded-md bg-white/40 hover:bg-white/60 text-slate-800 transition flex items-center justify-center"
          >+</button>
          <span className="text-xs text-slate-600">
            {form.targetPerDay === 1 ? 'раз в день' : 'раз/день'}
          </span>
        </div>
      </section>

      {/* Actions */}
      <section className="flex gap-2 pb-4">
        <button
          type="submit"
          disabled={!form.text.trim()}
          className="flex-1 h-10 rounded-xl accent-bg text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition"
        >
          {isEdit ? 'Сохранить' : 'Создать'}
        </button>
        {isEdit && (
          <button
            type="button"
            onClick={deleteCurrent}
            className="h-10 px-3 rounded-xl bg-rose-500/90 text-white text-sm font-semibold hover:bg-rose-600 transition"
          >
            Удалить
          </button>
        )}
      </section>
    </form>
  );
}
