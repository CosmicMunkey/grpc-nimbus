import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, X } from 'lucide-react';
import { helpTopics, type HelpTopic, type ContentBlock } from './helpTopics';

interface Props {
  onClose: () => void;
}

function matchesTopic(topic: HelpTopic, query: string): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return true;
  return (
    topic.title.toLowerCase().includes(q) ||
    topic.keywords.some((k) => k.includes(q)) ||
    topic.content.some(block => {
      if (block.type === 'bullets') return block.items.some(i => i.toLowerCase().includes(q));
      if ('text' in block) return block.text.toLowerCase().includes(q);
      return false;
    })
  );
}

function renderBlock(block: ContentBlock, idx: number) {
  switch (block.type) {
    case 'heading':
      return (
        <h3 key={idx} className="text-[11px] font-semibold uppercase tracking-wider text-c-text mt-4 mb-1.5 first:mt-0">
          {block.text}
        </h3>
      );
    case 'paragraph':
      return (
        <p key={idx} className="text-xs text-c-text2 leading-relaxed">
          {block.text}
        </p>
      );
    case 'bullets':
      return (
        <ul key={idx} className="flex flex-col gap-1 my-0.5">
          {block.items.map((item, i) => {
            const dashIdx = item.indexOf(' — ');
            const hasLabel = dashIdx !== -1;
            const label = hasLabel ? item.slice(0, dashIdx) : '';
            const rest = hasLabel ? item.slice(dashIdx + 3) : item;
            return (
              <li key={i} className="flex gap-2 text-xs text-c-text2 leading-relaxed">
                <span className="text-c-accent shrink-0 mt-0.5">›</span>
                <span>
                  {hasLabel
                    ? <><span className="font-medium text-c-text">{label}</span>{' — '}{rest}</>
                    : item}
                </span>
              </li>
            );
          })}
        </ul>
      );
    case 'code':
      return (
        <pre key={idx} className="text-xs font-mono bg-c-bg border border-c-border rounded px-3 py-2 text-c-accent my-1">
          {block.text}
        </pre>
      );
    case 'note':
      return (
        <div key={idx} className="flex gap-2 text-xs bg-c-accent/10 border border-c-accent/20 rounded px-3 py-2 text-c-text2 leading-relaxed mt-2">
          <span className="text-c-accent font-semibold shrink-0">Note</span>
          <span>{block.text}</span>
        </div>
      );
  }
}

function getInitialPos() {
  const w = Math.min(720, window.innerWidth * 0.95);
  const h = Math.min(window.innerHeight * 0.75, 600);
  return {
    x: Math.round((window.innerWidth - w) / 2),
    y: Math.round(window.innerHeight * 0.08),
    w,
    h,
  };
}

export default function HelpDialog({ onClose }: Props) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const init = getInitialPos();
  const [pos, setPos] = useState({ x: init.x, y: init.y });
  const [size] = useState({ w: init.w, h: init.h });
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const filtered = helpTopics.filter((t) => matchesTopic(t, query));
  const activeTopic = filtered[selected] ?? null;

  useEffect(() => { setSelected(0); }, [query]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selected}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (document.activeElement === inputRef.current) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((s) => Math.min(s + 1, filtered.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, filtered]);

  const onTitleBarMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    dragging.current = true;
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.preventDefault();
  }, [pos]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      setPos({
        x: Math.max(0, Math.min(e.clientX - dragOffset.current.x, window.innerWidth - size.w)),
        y: Math.max(0, Math.min(e.clientY - dragOffset.current.y, window.innerHeight - 60)),
      });
    };
    const onMouseUp = () => { dragging.current = false; };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [size.w]);

  return createPortal(
    <div
      className="fixed z-[10000] flex flex-col bg-c-panel border border-c-border rounded-xl shadow-2xl overflow-hidden"
      style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}
    >
      {/* Title bar — drag handle */}
      <div
        className="flex items-center gap-2 px-4 py-2.5 border-b border-c-border shrink-0 cursor-grab active:cursor-grabbing select-none"
        onMouseDown={onTitleBarMouseDown}
      >
        <span className="flex-1 text-sm font-semibold text-c-text">GRPC Nimbus Documentation</span>
        <button
          onClick={onClose}
          className="p-0.5 rounded hover:bg-c-border text-c-text3 hover:text-c-text transition-colors"
          aria-label="Close"
        >
          <X size={14} />
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-c-border shrink-0">
        <Search size={15} className="text-c-text2 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search help…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-transparent text-sm text-c-text placeholder-c-text3 outline-none"
        />
        <kbd className="hidden sm:inline text-[10px] text-c-text3 border border-c-border rounded px-1 py-0.5">ESC</kbd>
      </div>

      {/* Body: list + detail */}
      <div className="flex flex-1 min-h-0">
        {/* Topic list */}
        <div ref={listRef} className="w-48 shrink-0 border-r border-c-border overflow-y-auto">
          {filtered.length === 0 && (
            <div className="px-3 py-6 text-center text-xs text-c-text3">No results</div>
          )}
          {filtered.map((topic, idx) => (
            <div
              key={topic.id}
              data-idx={idx}
              className={`px-3 py-2.5 cursor-pointer text-xs border-b border-c-border/40 last:border-0 transition-colors ${
                idx === selected
                  ? 'bg-c-accent/15 text-c-text font-medium'
                  : 'text-c-text2 hover:bg-c-bg/60'
              }`}
              onClick={() => setSelected(idx)}
            >
              {topic.title}
            </div>
          ))}
        </div>

        {/* Detail pane */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTopic ? (
            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-bold text-c-text mb-2">{activeTopic.title}</h2>
              {activeTopic.content.map((block, i) => renderBlock(block, i))}
            </div>
          ) : (
            <div className="text-xs text-c-text3 text-center mt-8">Select a topic</div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-c-border shrink-0 flex items-center gap-3 text-[10px] text-c-text3">
        <span><kbd className="border border-c-border rounded px-1">↑↓</kbd> navigate</span>
        <span><kbd className="border border-c-border rounded px-1">ESC</kbd> close</span>
      </div>
    </div>,
    document.body
  );
}
