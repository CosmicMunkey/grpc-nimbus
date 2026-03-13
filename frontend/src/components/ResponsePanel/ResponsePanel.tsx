import React, { useEffect, useRef, useState } from 'react';
import { useAppStore, useActiveTab } from '../../store/appStore';
import { Clock, ChevronDown, ChevronRight, AlertCircle, CheckCircle, Square, History, RotateCcw } from 'lucide-react';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { oneDark } from '@codemirror/theme-one-dark';
import { MetadataEntry, StreamEvent } from '../../types';

// Subscribe to Wails stream events (injected at runtime)
declare global {
  interface Window {
    runtime?: {
      EventsOn(event: string, cb: (...args: unknown[]) => void): () => void;
      EventsOff(event: string): void;
    };
  }
}

function StatusBadge({ code, text }: { code: number; text: string }) {
  const isOk = code === 0;
  return (
    <div className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded ${isOk ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-[#e94560]'}`}>
      {isOk ? <CheckCircle size={11} /> : <AlertCircle size={11} />}
      {code} {text}
    </div>
  );
}

function MetadataSection({ title, entries }: { title: string; entries: MetadataEntry[] }) {
  const [open, setOpen] = useState(false);
  if (!entries?.length) return null;
  return (
    <div className="border border-[#2d3748] rounded">
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-1 w-full px-2 py-1 text-xs text-[#94a3b8] hover:text-[#e2e8f0]">
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {title}
        <span className="ml-auto text-[#4a5568]">{entries.length}</span>
      </button>
      {open && (
        <div className="px-2 pb-2 space-y-0.5">
          {entries.map((e, i) => (
            <div key={i} className="flex gap-2 text-xs font-mono">
              <span className="text-[#94a3b8] shrink-0">{e.key}:</span>
              <span className="text-[#e2e8f0] break-all">{e.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StreamPanel() {
  const { streamMessages, isStreaming } = useActiveTab();
  const { cancelStream, clearStream } = useAppStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [streamMessages]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2d3748] bg-[#16213e]">
        {isStreaming ? (
          <>
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-green-400">Streaming…</span>
            <button
              onClick={cancelStream}
              className="ml-auto flex items-center gap-1 text-xs px-2 py-0.5 bg-[#e94560]/20 text-[#e94560] rounded hover:bg-[#e94560]/30"
            >
              <Square size={11} /> Cancel
            </button>
          </>
        ) : (
          <>
            <span className="text-xs text-[#94a3b8]">{streamMessages.length} messages</span>
            <button
              onClick={clearStream}
              className="ml-auto text-xs text-[#4a5568] hover:text-[#e2e8f0] px-2 py-0.5 rounded hover:bg-[#1e2132]"
            >
              Clear
            </button>
          </>
        )}
      </div>
      <div className="flex-1 overflow-y-auto font-mono text-xs p-2 space-y-2">
        {streamMessages.map((evt, i) => <StreamMessage key={i} evt={evt} />)}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function StreamMessage({ evt }: { evt: StreamEvent }) {
  const pretty = (() => {
    if (!evt.json) return '';
    try { return JSON.stringify(JSON.parse(evt.json), null, 2); } catch { return evt.json; }
  })();

  if (evt.type === 'message') {
    return (
      <div className="border border-[#2d3748] rounded overflow-hidden">
        <div className="px-2 py-0.5 bg-[#1e2132] text-[10px] text-[#94a3b8]">message</div>
        <pre className="p-2 text-[#e2e8f0] overflow-x-auto whitespace-pre-wrap">{pretty}</pre>
      </div>
    );
  }
  if (evt.type === 'trailer') {
    return (
      <div className="border border-[#2d3748] rounded px-2 py-1 text-[10px]">
        <span className="text-[#94a3b8]">trailer </span>
        <span className={`font-medium ${evt.statusCode === 0 ? 'text-green-400' : 'text-[#e94560]'}`}>
          {evt.statusCode} {evt.status}
        </span>
      </div>
    );
  }
  if (evt.type === 'error') {
    return <div className="text-[#e94560] px-2 py-1 border border-red-900/40 rounded">{evt.error}</div>;
  }
  return null;
}

function HistoryPanel() {
  const { selectedMethod, history } = useActiveTab();
  const { loadHistory, clearHistory, restoreFromHistory } = useAppStore();

  useEffect(() => {
    if (selectedMethod) loadHistory(selectedMethod.fullName);
  }, [selectedMethod?.fullName]);

  if (!selectedMethod) return null;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2d3748]">
        <span className="text-xs text-[#94a3b8]">{history.length} entries</span>
        {history.length > 0 && (
          <button
            onClick={() => clearHistory(selectedMethod.fullName)}
            className="text-xs text-[#4a5568] hover:text-[#e94560]"
          >
            Clear all
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        {history.length === 0 ? (
          <p className="p-4 text-xs text-[#4a5568] text-center">No history yet</p>
        ) : (
          history.map((entry) => (
            <div key={entry.id} className="border-b border-[#2d3748] px-3 py-2 hover:bg-[#1e2132] group">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#4a5568]">
                  {new Date(entry.invokedAt).toLocaleTimeString()}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => restoreFromHistory(entry)}
                    className="flex items-center gap-1 text-[10px] text-[#94a3b8] hover:text-[#e2e8f0] px-1.5 py-0.5 rounded hover:bg-[#2d3748]"
                    title="Restore this request"
                  >
                    <RotateCcw size={10} /> Restore
                  </button>
                </div>
              </div>
              {entry.response && (
                <span className={`text-[10px] font-medium ${entry.response.statusCode === 0 ? 'text-green-400' : 'text-[#e94560]'}`}>
                  {entry.response.statusCode} {entry.response.status} · {entry.response.durationMs}ms
                </span>
              )}
              <pre className="text-[10px] text-[#94a3b8] truncate mt-0.5 font-mono">
                {entry.requestJson?.slice(0, 80)}
              </pre>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Main ResponsePanel ──────────────────────────────────────────────────────

export default function ResponsePanel() {
  const { response, isInvoking, invokeError, selectedMethod, streamMessages, isStreaming } = useActiveTab();
  const { appendStreamEvent } = useAppStore();
  const [tab, setTab] = useState<'response' | 'headers' | 'history'>('response');

  // Subscribe to Wails stream events
  useEffect(() => {
    const runtime = window.runtime;
    if (!runtime) return;
    const offEvent = runtime.EventsOn('stream:event', (raw) => {
      appendStreamEvent(raw as StreamEvent);
    });
    const offDone = runtime.EventsOn('stream:done', () => {});
    return () => {
      if (typeof offEvent === 'function') offEvent();
      if (typeof offDone === 'function') offDone();
    };
  }, [appendStreamEvent]);

  if (!selectedMethod) return null;

  // Show streaming panel if streaming is active or we have stream messages
  if (isStreaming || (selectedMethod.serverStreaming && streamMessages.length > 0)) {
    return (
      <div className="flex flex-col h-full min-h-0">
        <div className="flex border-b border-[#2d3748]">
          {(['response', 'history'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t as typeof tab)}
              className={`px-4 py-1.5 text-xs capitalize border-b-2 ${tab === t ? 'border-[#e94560] text-[#e2e8f0]' : 'border-transparent text-[#94a3b8] hover:text-[#e2e8f0]'}`}>
              {t === 'response' ? 'Stream' : t}
            </button>
          ))}
        </div>
        <div className="flex-1 min-h-0">
          {tab === 'response' ? <StreamPanel /> : <HistoryPanel />}
        </div>
      </div>
    );
  }

  if (isInvoking) {
    return (
      <div className="flex-1 flex items-center justify-center text-[#94a3b8] text-sm gap-2">
        <div className="w-4 h-4 border-2 border-[#e94560] border-t-transparent rounded-full animate-spin" />
        Sending request…
      </div>
    );
  }

  if (!response) {
    if (invokeError) {
      return (
        <div className="flex flex-col h-full min-h-0">
          <div className="flex border-b border-[#2d3748]">
            {(['response', 'history'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t as typeof tab)}
                className={`px-4 py-1.5 text-xs capitalize border-b-2 ${tab === t ? 'border-[#e94560] text-[#e2e8f0]' : 'border-transparent text-[#94a3b8] hover:text-[#e2e8f0]'}`}>
                {t}
              </button>
            ))}
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            {tab === 'history' ? <HistoryPanel /> : (
              <div className="p-3 text-xs text-[#e94560] font-mono break-all">{invokeError}</div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full min-h-0">
        <div className="flex border-b border-[#2d3748]">
          <button onClick={() => setTab('history')}
            className={`px-4 py-1.5 text-xs capitalize border-b-2 ${tab === 'history' ? 'border-[#e94560] text-[#e2e8f0]' : 'border-transparent text-[#94a3b8] hover:text-[#e2e8f0]'}`}>
            History
          </button>
        </div>
        <div className="flex-1 min-h-0">
          {tab === 'history' ? <HistoryPanel /> : (
            <div className="flex-1 flex items-center justify-center text-[#4a5568] text-sm select-none h-full">
              Response will appear here
            </div>
          )}
        </div>
      </div>
    );
  }

  const prettyJson = (() => {
    try { return JSON.stringify(JSON.parse(response.responseJson), null, 2); }
    catch { return response.responseJson; }
  })();

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Status bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2d3748] bg-[#16213e]">
        <StatusBadge code={response.statusCode} text={response.status} />
        <div className="ml-auto flex items-center gap-1 text-xs text-[#4a5568]">
          <Clock size={11} />
          {response.durationMs}ms
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#2d3748]">
        {(['response', 'headers', 'history'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-xs capitalize border-b-2 ${tab === t ? 'border-[#e94560] text-[#e2e8f0]' : 'border-transparent text-[#94a3b8] hover:text-[#e2e8f0]'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === 'response' ? (
          <div className="h-full overflow-auto">
            {response.statusCode !== 0 ? (
              <div className="p-3 text-xs text-[#e94560] font-mono break-all space-y-1">
                {response.statusMessage && <div>{response.statusMessage}</div>}
                {response.error && response.error !== response.statusMessage && (
                  <div className="text-[#94a3b8]">{response.error}</div>
                )}
              </div>
            ) : (
              <CodeMirror value={prettyJson} theme={oneDark} extensions={[json()]} readOnly className="h-full"
                basicSetup={{ lineNumbers: true, foldGutter: true }} />
            )}
          </div>
        ) : tab === 'headers' ? (
          <div className="p-3 space-y-2 overflow-y-auto h-full">
            <MetadataSection title="Response Headers" entries={response.headers} />
            <MetadataSection title="Trailers" entries={response.trailers} />
          </div>
        ) : (
          <HistoryPanel />
        )}
      </div>
    </div>
  );
}
