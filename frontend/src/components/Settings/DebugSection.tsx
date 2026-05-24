import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import { LogEntry } from '../../types';
import { Bug, Copy, Trash2 } from 'lucide-react';

const LEVEL_COLORS: Record<string, string> = {
  info: 'text-blue-400',
  warn: 'text-yellow-400',
  error: 'text-red-400',
};

const LEVEL_BG: Record<string, string> = {
  info: 'bg-blue-900/20',
  warn: 'bg-yellow-900/20',
  error: 'bg-red-900/20',
};


function LogViewer() {
  const { logs, clearLogs } = useAppStore();
  const [filter, setFilter] = useState<string>('all');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const filtered = filter === 'all' ? logs : logs.filter((e) => e.level === filter);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filtered.length, autoScroll]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30;
    setAutoScroll(atBottom);
  };

  const handleCopyAll = async () => {
    const text = logs.map((e) => `[${e.timestamp}] [${e.level.toUpperCase()}] ${e.message}`).join('\n');
    await navigator.clipboard.writeText(text);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-2 border-b border-c-border shrink-0">
        <div className="flex items-center gap-2">
          {['all', 'info', 'warn', 'error'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilter(lvl)}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                filter === lvl
                  ? 'bg-c-accent text-c-accent-text'
                  : 'text-c-text2 hover:text-c-text border border-c-border'
              }`}
            >
              {lvl === 'all' ? 'All' : lvl.charAt(0).toUpperCase() + lvl.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopyAll}
            title="Copy all logs"
            className="p-1.5 text-c-text3 hover:text-c-text rounded hover:bg-c-hover transition-colors"
          >
            <Copy size={13} />
          </button>
          <button
            onClick={() => { clearLogs(); }}
            title="Clear logs"
            className="p-1.5 text-c-text3 hover:text-c-accent rounded hover:bg-c-hover transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Log entries */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto font-mono text-xs leading-relaxed"
      >
        {filtered.length === 0 ? (
          <p className="p-5 text-c-text3 text-center">No log entries.</p>
        ) : (
          filtered.map((entry, i) => (
            <div
              key={i}
              className={`px-5 py-1 border-b border-c-border/20 ${LEVEL_BG[entry.level] ?? ''}`}
            >
              <span className="text-c-text3 mr-2 select-none">
                {entry.timestamp.slice(0, 19).replace('T', ' ')}
              </span>
              <span className={`font-semibold mr-2 ${LEVEL_COLORS[entry.level] ?? 'text-c-text'}`}>
                {entry.level.toUpperCase()}
              </span>
              <span className="text-c-text">{entry.message}</span>
            </div>
          ))
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-2 px-5 py-1.5 border-t border-c-border text-[0.625rem] text-c-text3 shrink-0">
        <span>{filtered.length} of {logs.length} entries</span>
        <span>·</span>
        <span>{autoScroll ? 'Auto-scroll on' : 'Auto-scroll off'}</span>
      </div>
    </div>
  );
}

export default function DebugSection() {
  const { showDebugIndicator, setShowDebugIndicator } = useAppStore();

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Settings */}
      <div className="px-5 py-3 border-b border-c-border shrink-0">
        <div className="flex items-center justify-between">
          <div className="pr-4">
            <p className="text-xs font-medium text-c-text">Show error indicator in connection bar</p>
            <p className="text-[0.6875rem] text-c-text3 mt-0.5">
              When on, a badge appears in the connection bar when there are errors or warnings.
            </p>
          </div>
          <button
            role="switch"
            aria-checked={showDebugIndicator}
            onClick={() => setShowDebugIndicator(!showDebugIndicator)}
            className={`relative inline-flex h-5 w-9 shrink-0 rounded-full p-0.5 transition-colors ${
              showDebugIndicator ? 'bg-c-accent' : 'bg-c-border'
            }`}
          >
            <span
              className={`h-4 w-4 shrink-0 rounded-full bg-white shadow transition-transform ${
                showDebugIndicator ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Log viewer */}
      <LogViewer />
    </div>
  );
}
