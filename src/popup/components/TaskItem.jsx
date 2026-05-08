import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore, TASK_TEXT_LIMIT } from '../../lib/store.js';

// Block keystrokes that would push the contentEditable past TASK_TEXT_LIMIT.
function preventOverflow(e) {
  const current = e.currentTarget.textContent || '';
  const sel = window.getSelection()?.toString().length || 0;
  const ins = (e.data || '').length;
  if (current.length - sel + ins > TASK_TEXT_LIMIT) e.preventDefault();
}
function handlePaste(e) {
  e.preventDefault();
  const current = e.currentTarget.textContent || '';
  const sel = window.getSelection()?.toString().length || 0;
  const text = e.clipboardData.getData('text') || '';
  const allowed = TASK_TEXT_LIMIT - (current.length - sel);
  if (allowed <= 0) return;
  document.execCommand('insertText', false, text.slice(0, allowed));
}

// Open URL in a new tab (popup context — chrome.tabs is available).
function openUrl(url) {
  try {
    if (chrome?.tabs?.create) chrome.tabs.create({ url });
    else window.open(url, '_blank', 'noopener,noreferrer');
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

// Render plain task text with detected URLs converted to clickable links.
// Trailing punctuation (.,;:!?)/closing brackets/quotes are stripped from the
// link target so "see https://x.com." doesn't include the trailing dot.
function renderTaskText(text) {
  const re = /\b((?:https?:\/\/|www\.)[^\s<>"']+)/gi;
  const out = [];
  let last = 0;
  let m;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    let url = m[0];
    const trail = url.match(/[.,;:!?)\]'"]+$/);
    if (trail) url = url.slice(0, -trail[0].length);
    const href = url.startsWith('http') ? url : `https://${url}`;
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(
      <a
        key={`l${key++}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        contentEditable={false}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          openUrl(href);
        }}
        className="underline accent-text hover:opacity-80 cursor-pointer break-all"
      >
        {url}
      </a>,
    );
    if (trail) out.push(trail[0]);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export default function TaskItem({
  task, index, displayDate,
  onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd,
  isDragging, isDragOver,
}) {
  const toggleTask     = useStore((s) => s.toggleTask);
  const toggleTaskOnDate = useStore((s) => s.toggleTaskOnDate);
  const editTask       = useStore((s) => s.editTask);
  const removeTask     = useStore((s) => s.removeTask);
  const toggleCollapsed = useStore((s) => s.toggleCollapsed);
  const setTaskPomodoroBudget = useStore((s) => s.setTaskPomodoroBudget);
  const addSubtask     = useStore((s) => s.addSubtask);
  const toggleSubtask  = useStore((s) => s.toggleSubtask);
  const editSubtask    = useStore((s) => s.editSubtask);
  const removeSubtask  = useStore((s) => s.removeSubtask);
  const moveSubtask    = useStore((s) => s.moveSubtask);
  const setCurrent     = useStore((s) => s.setCurrentTaskIndex);
  const currentTaskIndex = useStore((s) => s.currentTaskIndex);

  const [adding, setAdding] = useState(false);
  const [subText, setSubText] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [expandedSubs, setExpandedSubs] = useState({});
  const [dragSubIndex, setDragSubIndex] = useState(null);
  const [dragOverSubIndex, setDragOverSubIndex] = useState(null);
  const [menu, setMenu] = useState(null); // { x, y } in viewport coords
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState('');
  const rowRef = useRef(null);
  const subRowRefs = useRef({});
  const menuRef = useRef(null);
  const editRef = useRef(null);
  const subEditRefs = useRef({});

  // When entering edit mode, focus the contentEditable and place caret at end.
  useEffect(() => {
    if (!expanded || !editRef.current) return;
    editRef.current.focus();
    const range = document.createRange();
    range.selectNodeContents(editRef.current);
    range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, [expanded]);

  // Same for subtask edit mode.
  useEffect(() => {
    Object.entries(expandedSubs).forEach(([j, on]) => {
      if (!on) return;
      const el = subEditRefs.current[j];
      if (!el) return;
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    });
  }, [expandedSubs]);

  const isCurrent = currentTaskIndex === index;
  const isRecurring = !!task.recurring;

  // Close context menu on outside click / Escape.
  useEffect(() => {
    if (!menu) return;
    const onDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(null);
    };
    const onKey = (e) => { if (e.key === 'Escape') setMenu(null); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menu]);

  const handleContextMenu = (e) => {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY });
    setEditingBudget(false);
  };
  const toggleCurrentFromMenu = () => {
    setCurrent(isCurrent ? -1 : index);
    setMenu(null);
  };
  const startBudgetEdit = () => {
    setBudgetDraft(task.pomodoroBudget ? String(task.pomodoroBudget) : '');
    setEditingBudget(true);
  };
  const submitBudget = (e) => {
    e?.preventDefault();
    const n = parseInt(budgetDraft, 10);
    setTaskPomodoroBudget(index, Number.isFinite(n) && n >= 0 ? n : 0);
    setEditingBudget(false);
    setMenu(null);
  };

  const handleDragStart = (e) => {
    // Show the whole task row as the drag preview, not just the tiny handle.
    if (rowRef.current && e.dataTransfer) {
      const rect = rowRef.current.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;
      e.dataTransfer.setDragImage(rowRef.current, offsetX, offsetY);
      e.dataTransfer.effectAllowed = 'move';
    }
    onDragStart?.(e);
  };

  const subs = task.subtasks || [];
  const submitSub = (e) => {
    e.preventDefault();
    if (!subText.trim()) return;
    addSubtask(index, subText);
    setSubText('');
    setAdding(false);
  };

  return (
    <div
      ref={rowRef}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onContextMenu={handleContextMenu}
      className={`group task-row relative flex flex-col py-2 transition ${
        isDragging ? 'opacity-40' : ''
      } ${isDragOver ? 'before:content-[""] before:absolute before:left-0 before:right-0 before:-top-px before:h-0.5 before:rounded before:bg-current before:opacity-70' : ''} ${isCurrent ? 'accent-soft-bg rounded-lg -mx-2 px-2' : ''}`}
    >
      <div className="flex items-start gap-2 min-w-0">
        {/* Checkbox — always leftmost so it never shifts. */}
        <span className="w-5 h-5 flex items-center justify-center flex-shrink-0">
          <input
            type="checkbox"
            className="crystal-check"
            checked={task.done}
            onChange={() => {
              if (displayDate) toggleTaskOnDate(index, displayDate);
              else toggleTask(index);
            }}
          />
        </span>
        {/* Subtask expand chevron — same glyph and sizing as the day-card
            chevron in Tasks.jsx, for visual consistency. */}
        {subs.length > 0 ? (
          <button
            onClick={() => toggleCollapsed(index)}
            className={`w-4 h-4 mt-0.5 flex items-center justify-center text-slate-600 hover:text-slate-900 text-sm flex-shrink-0 transition-transform duration-200 ${
              task.collapsed ? '' : 'rotate-90'
            }`}
            title={task.collapsed ? 'Развернуть' : 'Свернуть'}
          >
            ▶
          </button>
        ) : (
          <span className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
        )}
        {expanded ? (
          <span
            ref={editRef}
            contentEditable
            suppressContentEditableWarning
            draggable={false}
            onBeforeInput={preventOverflow}
            onPaste={handlePaste}
            onBlur={(e) => {
              const v = e.currentTarget.textContent.trim().slice(0, TASK_TEXT_LIMIT);
              if (v && v !== task.text) editTask(index, v);
              setExpanded(false);
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }}
            className={`flex-1 min-w-0 text-sm leading-snug outline-none cursor-text break-words [overflow-wrap:anywhere] ${
              task.done ? 'line-through text-slate-500' : 'text-slate-800'
            }`}
          >
            {task.text}
          </span>
        ) : (
          <span
            onClick={() => setExpanded(true)}
            className={`flex-1 min-w-0 text-sm leading-snug cursor-text break-words [overflow-wrap:anywhere] line-clamp-2 ${
              task.done ? 'line-through text-slate-500' : 'text-slate-800'
            }`}
          >
            {renderTaskText(task.text)}
          </span>
        )}
        {isRecurring && (
          <span
            title="Регулярная задача"
            className="flex-shrink-0 text-[10px] accent-text mt-0.5 select-none"
            aria-label="Регулярная"
          >
            ↻
          </span>
        )}
        {/* Drag handle — only this element is draggable, so text selection
            inside the contentEditable still works normally. */}
        <span
          draggable
          onDragStart={handleDragStart}
          onDragEnd={onDragEnd}
          title="Перетащить"
          className="opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing w-4 h-5 flex items-center justify-center text-slate-500 hover:text-slate-800 flex-shrink-0 transition select-none"
        >
          <svg viewBox="0 0 12 16" className="w-2.5 h-3" fill="currentColor">
            <circle cx="3" cy="3" r="1.2" />
            <circle cx="3" cy="8" r="1.2" />
            <circle cx="3" cy="13" r="1.2" />
            <circle cx="9" cy="3" r="1.2" />
            <circle cx="9" cy="8" r="1.2" />
            <circle cx="9" cy="13" r="1.2" />
          </svg>
        </span>
        <button
          onClick={() => setAdding((v) => !v)}
          title="Добавить подзадачу"
          className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded border border-slate-400 text-slate-600 hover:accent-text hover:border-current transition flex-shrink-0"
        >
          <svg viewBox="0 0 16 16" className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M8 3 V13 M3 8 H13" />
          </svg>
        </button>
        <button
          onClick={() => removeTask(index)}
          title="Удалить"
          className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center text-slate-500 hover:text-rose-600 flex-shrink-0 transition"
        >
          <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M4 4 L12 12 M12 4 L4 12" />
          </svg>
        </button>
      </div>

      {adding && (
        <form onSubmit={submitSub} className="mt-1 ml-7">
          <input
            autoFocus
            value={subText}
            onChange={(e) => setSubText(e.target.value)}
            onBlur={submitSub}
            maxLength={200}
            placeholder="Подзадача…"
            className="w-full text-xs px-2 py-1 rounded bg-white/40 border border-white/60 text-slate-800 placeholder:text-slate-500 outline-none"
          />
        </form>
      )}

      {!task.collapsed && subs.length > 0 && (
        <ul className="ml-7 mt-1 flex flex-col gap-0.5">
          {subs.map((s, j) => {
            const isSubDragging = dragSubIndex === j;
            const isSubDragOver = dragOverSubIndex === j && dragSubIndex !== null && dragSubIndex !== j;
            return (
              <li
                key={j}
                ref={(el) => { if (el) subRowRefs.current[j] = el; }}
                onDragOver={(e) => {
                  if (dragSubIndex === null) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOverSubIndex !== j) setDragOverSubIndex(j);
                }}
                onDragLeave={() => {
                  if (dragOverSubIndex === j) setDragOverSubIndex(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragSubIndex !== null && dragSubIndex !== j) {
                    moveSubtask(index, dragSubIndex, j);
                  }
                  setDragSubIndex(null);
                  setDragOverSubIndex(null);
                }}
                className={`group/sub task-row relative flex items-start gap-2 py-1 min-w-0 transition ${
                  isSubDragging ? 'opacity-40' : ''
                } ${isSubDragOver ? 'before:content-[""] before:absolute before:left-0 before:right-0 before:-top-px before:h-0.5 before:rounded before:bg-current before:opacity-70' : ''}`}
              >
                <span className="w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <input
                    type="checkbox"
                    className="crystal-check"
                    style={{ width: 14, height: 14 }}
                    checked={s.done || task.done}
                    onChange={() => toggleSubtask(index, j)}
                  />
                </span>
                {expandedSubs[j] ? (
                  <span
                    ref={(el) => { if (el) subEditRefs.current[j] = el; }}
                    contentEditable
                    suppressContentEditableWarning
                    draggable={false}
                    onBeforeInput={preventOverflow}
                    onPaste={handlePaste}
                    onBlur={(e) => {
                      const v = e.currentTarget.textContent.trim().slice(0, TASK_TEXT_LIMIT);
                      if (v && v !== s.text) editSubtask(index, j, v);
                      setExpandedSubs((m) => ({ ...m, [j]: false }));
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }}
                    className={`flex-1 min-w-0 text-xs outline-none cursor-text break-words [overflow-wrap:anywhere] ${
                      (s.done || task.done) ? 'line-through text-slate-500' : 'text-slate-700'
                    }`}
                  >
                    {s.text}
                  </span>
                ) : (
                  <span
                    onClick={() => setExpandedSubs((m) => ({ ...m, [j]: true }))}
                    className={`flex-1 min-w-0 text-xs cursor-text break-words [overflow-wrap:anywhere] line-clamp-2 ${
                      (s.done || task.done) ? 'line-through text-slate-500' : 'text-slate-700'
                    }`}
                  >
                    {renderTaskText(s.text)}
                  </span>
                )}
                <span
                  draggable
                  onDragStart={(e) => {
                    const el = subRowRefs.current[j];
                    if (el && e.dataTransfer) {
                      const rect = el.getBoundingClientRect();
                      e.dataTransfer.setDragImage(el, e.clientX - rect.left, e.clientY - rect.top);
                      e.dataTransfer.effectAllowed = 'move';
                    }
                    setDragSubIndex(j);
                  }}
                  onDragEnd={() => {
                    setDragSubIndex(null);
                    setDragOverSubIndex(null);
                  }}
                  title="Перетащить"
                  className="opacity-0 group-hover/sub:opacity-100 cursor-grab active:cursor-grabbing w-4 h-4 flex items-center justify-center text-slate-500 hover:text-slate-800 flex-shrink-0 transition select-none"
                >
                  <svg viewBox="0 0 12 16" className="w-2 h-2.5" fill="currentColor">
                    <circle cx="3" cy="3" r="1.2" />
                    <circle cx="3" cy="8" r="1.2" />
                    <circle cx="3" cy="13" r="1.2" />
                    <circle cx="9" cy="3" r="1.2" />
                    <circle cx="9" cy="8" r="1.2" />
                    <circle cx="9" cy="13" r="1.2" />
                  </svg>
                </span>
                <button
                  onClick={() => removeSubtask(index, j)}
                  className="opacity-0 group-hover/sub:opacity-100 w-4 h-4 flex items-center justify-center text-slate-500 hover:text-rose-600 flex-shrink-0 transition"
                >
                  <svg viewBox="0 0 16 16" className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M4 4 L12 12 M12 4 L4 12" />
                  </svg>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <AnimatePresence>
      {menu && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.96, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -4 }}
          transition={{ duration: 0.12, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            top: menu.y,
            left: menu.x,
            zIndex: 50,
            transformOrigin: 'top left',
          }}
          className="glass rounded-xl py-1 min-w-[200px] shadow-lg"
        >
          {!editingBudget ? (
            <>
              <button
                onClick={toggleCurrentFromMenu}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-slate-800 hover:bg-white/35 transition"
              >
                <span className="w-4 text-center">{isCurrent ? '○' : '●'}</span>
                <span className="flex-1">
                  {isCurrent ? 'Снять с активной' : 'Сделать активной'}
                </span>
              </button>
              <button
                onClick={startBudgetEdit}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-slate-800 hover:bg-white/35 transition"
              >
                <span className="w-4 text-center">🍅</span>
                <span className="flex-1">
                  {task.pomodoroBudget ? `Помидорки: ${task.pomodoroBudget}` : 'Рассчитать помидорки'}
                </span>
              </button>
            </>
          ) : (
            <form onSubmit={submitBudget} className="px-3 py-2">
              <div className="text-[10px] text-slate-600 mb-1">Сколько помидорок на задачу?</div>
              <div className="flex items-center gap-1.5">
                <input
                  autoFocus
                  type="number"
                  min="0"
                  max="99"
                  value={budgetDraft}
                  onChange={(e) => setBudgetDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') { setEditingBudget(false); }
                  }}
                  placeholder="0"
                  className="w-14 px-2 py-1 text-sm rounded-md bg-white/60 border border-white/70 text-slate-800 outline-none focus:accent-ring tabular-nums"
                />
                <button
                  type="submit"
                  className="px-2 py-1 text-xs accent-bg text-white rounded-md hover:opacity-90 transition"
                >
                  ОК
                </button>
                {task.pomodoroBudget && (
                  <button
                    type="button"
                    onClick={() => { setTaskPomodoroBudget(index, 0); setEditingBudget(false); setMenu(null); }}
                    className="px-2 py-1 text-xs text-slate-600 hover:text-rose-600 rounded-md transition"
                  >
                    Сброс
                  </button>
                )}
              </div>
            </form>
          )}
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
