import React, { useEffect, useRef, useState } from 'react';
import { useAppStore, useActiveTab } from '../../store/appStore';
import { Clock, ChevronDown, ChevronRight, AlertCircle, CheckCircle, Square, History } from 'lucide-react';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { oneDark } from '@codemirror/theme-one-dark';
import { MetadataEntry, StreamEvent, HistoryEntry } from '../../types';

// Subscribe to Wails stream events (injected at runtime)
declare global {
  interface Window {
    runtime?: {
      EventsOn(event: string, cb: (...args: unknown[]) => void): () => void;
      EventsOff(event: string): void;
      BrowserOpenURL(url: string): void;
    };
  }
}

function StatusBadge({ code, text }: { code: number; text: string }) {
  const isDark = useAppStore(s => s.isDark);
  const isOk = code === 0;
  const cls = isOk
    ? (isDark ? 'bg-green-900/40 text-green-400' : 'bg-green-100 text-green-700')
    : (isDark ? 'bg-red-900/40 text-c-accent'    : 'bg-red-100 text-red-600');
  return (
    <div className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded ${cls}`}>
      {isOk ? <CheckCircle size={11} /> : <AlertCircle size={11} />}
      {code} {text}
    </div>
  );
}

function MetadataSection({ title, entries }: { title: string; entries: MetadataEntry[] }) {
  const [open, setOpen] = useState(!!entries?.length);
  if (!entries?.length) return null;
  return (
    <div className="border border-c-border rounded">
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-1 w-full px-2 py-1 text-xs text-c-text2 hover:text-c-text">
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {title}
        <span className="ml-auto text-c-text3">{entries.length}</span>
      </button>
      {open && (
        <div className="px-2 pb-2 space-y-0.5">
          {entries.map((e, i) => (
            <div key={i} className="flex gap-2 text-xs font-mono">
              <span className="text-c-text2 shrink-0">{e.key}:</span>
              <span className="text-c-text break-all">{e.value}</span>
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
      <div className="flex items-center gap-2 px-3 py-2 border-b border-c-border bg-c-panel">
        {isStreaming ? (
          <>
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-green-400">Streaming…</span>
            <button
              onClick={cancelStream}
              className="ml-auto flex items-center gap-1 text-xs px-2 py-0.5 bg-c-accent/20 text-c-accent rounded hover:bg-c-accent/30"
            >
              <Square size={11} /> Cancel
            </button>
          </>
        ) : (
          <>
            <span className="text-xs text-c-text2">{streamMessages.length} messages</span>
            <button
              onClick={clearStream}
              className="ml-auto text-xs text-c-text3 hover:text-c-text px-2 py-0.5 rounded hover:bg-c-hover"
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
  const isDark = useAppStore(s => s.isDark);
  const pretty = (() => {
    if (!evt.json) return '';
    try { return JSON.stringify(JSON.parse(evt.json), null, 2); } catch { return evt.json; }
  })();

  if (evt.type === 'message') {
    return (
      <div className="border border-c-border rounded overflow-hidden">
        <div className="px-2 py-0.5 bg-c-hover text-[10px] text-c-text2">message</div>
        <pre className="p-2 text-c-text overflow-x-auto whitespace-pre-wrap">{pretty}</pre>
      </div>
    );
  }
  if (evt.type === 'trailer') {
    const statusCls = evt.statusCode === 0
      ? (isDark ? 'text-green-400' : 'text-green-600')
      : 'text-c-accent';
    return (
      <div className="border border-c-border rounded px-2 py-1 text-[10px]">
        <span className="text-c-text2">trailer </span>
        <span className={`font-medium ${statusCls}`}>
          {evt.statusCode} {evt.status}
        </span>
      </div>
    );
  }
  if (evt.type === 'error') {
    const borderCls = isDark ? 'border-red-900/40' : 'border-red-300';
    return <div className={`text-c-accent px-2 py-1 border ${borderCls} rounded`}>{evt.error}</div>;
  }
  return null;
}

function formatJson(s: string | null | undefined): string {
  if (!s) return '';
  try { return JSON.stringify(JSON.parse(s), null, 2); } catch { return s; }
}

function HistoryEntryRow({ entry }: { entry: HistoryEntry }) {
  const isDark = useAppStore(s => s.isDark);
  const [expanded, setExpanded] = useState(false);
  const successCls = isDark ? 'text-green-400' : 'text-green-600';

  return (
    <div className="border-b border-c-border">
      <div
        className="flex items-center gap-1.5 px-3 py-2 cursor-pointer hover:bg-c-hover select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? <ChevronDown size={11} className="shrink-0 text-c-text3" /> : <ChevronRight size={11} className="shrink-0 text-c-text3" />}
        <span className="text-[10px] text-c-text3 shrink-0">
          {new Date(entry.invokedAt).toLocaleTimeString()}
        </span>
        {entry.response && (
          <span className={`text-[10px] font-medium shrink-0 ${entry.response.statusCode === 0 ? successCls : 'text-c-accent'}`}>
            {entry.response.statusCode} {entry.response.status} · {entry.response.durationMs}ms
          </span>
        )}
        <pre className="text-[10px] text-c-text3 truncate flex-1 font-mono" title={entry.requestJson ?? undefined}>
          {entry.requestJson?.slice(0, 80)}
        </pre>
      </div>

      {expanded && (
        <div className="px-3 pb-3 space-y-2 text-xs">
          {/* Request */}
          <div>
            <span className="text-[10px] text-c-text3 uppercase font-medium tracking-wide">Request</span>
            <pre className="mt-0.5 p-2 rounded bg-c-bg text-c-text2 text-[10px] font-mono overflow-auto max-h-40 whitespace-pre-wrap break-all">
              {formatJson(entry.requestJson)}
            </pre>
          </div>

          {/* Metadata */}
          {entry.metadata && entry.metadata.length > 0 && (
            <div>
              <span className="text-[10px] text-c-text3 uppercase font-medium tracking-wide">Metadata</span>
              <div className="mt-0.5 space-y-0.5">
                {entry.metadata.map((m, i) => (
                  <div key={i} className="flex gap-2 text-[10px] font-mono">
                    <span className="text-c-text2">{m.key}:</span>
                    <span className="text-c-text3 break-all">{m.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Response */}
          {entry.response && (
            <div>
              <span className="text-[10px] text-c-text3 uppercase font-medium tracking-wide">Response</span>
              {entry.response.responseJson != null && (
                <pre className="mt-0.5 p-2 rounded bg-c-bg text-c-text2 text-[10px] font-mono overflow-auto max-h-40 whitespace-pre-wrap break-all">
                  {formatJson(entry.response.responseJson)}
                </pre>
              )}
              {entry.response.error && (
                <p className="mt-0.5 text-[10px] text-c-accent">{entry.response.error}</p>
              )}
            </div>
          )}

          {/* Headers */}
          {entry.response?.headers && entry.response.headers.length > 0 && (
            <div>
              <span className="text-[10px] text-c-text3 uppercase font-medium tracking-wide">Headers</span>
              <div className="mt-0.5 space-y-0.5">
                {entry.response.headers.map((h, i) => (
                  <div key={i} className="flex gap-2 text-[10px] font-mono">
                    <span className="text-c-text2">{h.key}:</span>
                    <span className="text-c-text3 break-all">{h.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trailers */}
          {entry.response?.trailers && entry.response.trailers.length > 0 && (
            <div>
              <span className="text-[10px] text-c-text3 uppercase font-medium tracking-wide">Trailers</span>
              <div className="mt-0.5 space-y-0.5">
                {entry.response.trailers.map((t, i) => (
                  <div key={i} className="flex gap-2 text-[10px] font-mono">
                    <span className="text-c-text2">{t.key}:</span>
                    <span className="text-c-text3 break-all">{t.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function HistoryPanel() {
  const { selectedMethod, history } = useActiveTab();
  const { loadHistory, clearHistory } = useAppStore();

  useEffect(() => {
    if (selectedMethod) loadHistory(selectedMethod.fullName);
  }, [selectedMethod?.fullName, loadHistory]);

  if (!selectedMethod) return null;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between px-3 py-2 border-b border-c-border">
        <span className="text-xs text-c-text2">{history.length} entries</span>
        {history.length > 0 && (
          <button
            onClick={() => clearHistory(selectedMethod.fullName)}
            className="text-xs text-c-text3 hover:text-c-accent"
          >
            Clear all
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        {history.length === 0 ? (
          <p className="p-4 text-xs text-c-text3 text-center">No history yet</p>
        ) : (
          history.map((entry) => (
            <HistoryEntryRow key={entry.id} entry={entry} />
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
  const isDark = useAppStore(s => s.isDark);
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
        <div className="flex border-b border-c-border">
          {(['response', 'history'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t as typeof tab)}
              className={`px-4 py-1.5 text-xs capitalize border-b-2 ${tab === t ? 'border-c-accent text-c-text' : 'border-transparent text-c-text2 hover:text-c-text'}`}>
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
      <div className="flex-1 flex items-center justify-center text-c-text2 text-sm gap-2">
        <div className="w-4 h-4 border-2 border-c-accent border-t-transparent rounded-full animate-spin" />
        Sending request…
      </div>
    );
  }

  if (!response) {
    if (invokeError) {
      return (
        <div className="flex flex-col h-full min-h-0">
          <div className="flex border-b border-c-border">
            {(['response', 'history'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t as typeof tab)}
                className={`px-4 py-1.5 text-xs capitalize border-b-2 ${tab === t ? 'border-c-accent text-c-text' : 'border-transparent text-c-text2 hover:text-c-text'}`}>
                {t}
              </button>
            ))}
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            {tab === 'history' ? <HistoryPanel /> : (
              <div className="p-3 text-xs text-c-accent font-mono break-all">{invokeError}</div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full min-h-0">
        <div className="flex border-b border-c-border">
          <button onClick={() => setTab('history')}
            className={`px-4 py-1.5 text-xs capitalize border-b-2 ${tab === 'history' ? 'border-c-accent text-c-text' : 'border-transparent text-c-text2 hover:text-c-text'}`}>
            History
          </button>
        </div>
        <div className="flex-1 min-h-0">
          {tab === 'history' ? <HistoryPanel /> : (
            <div className="flex-1 flex items-center justify-center text-c-text3 text-sm select-none h-full">
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
      <div className="flex items-center gap-2 px-3 py-2 border-b border-c-border bg-c-panel">
        <StatusBadge code={response.statusCode} text={response.status} />
        <div className="ml-auto flex items-center gap-1 text-xs text-c-text3">
          <Clock size={11} />
          {response.durationMs}ms
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-c-border">
        {(['response', 'headers', 'history'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-xs capitalize border-b-2 ${tab === t ? 'border-c-accent text-c-text' : 'border-transparent text-c-text2 hover:text-c-text'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === 'response' ? (
          <div className="h-full overflow-auto">
            {response.statusCode !== 0 ? (
              <div className="p-3 text-xs text-c-accent font-mono break-all space-y-1">
                {response.statusMessage && <div>{response.statusMessage}</div>}
                {response.error && response.error !== response.statusMessage && (
                  <div className="text-c-text2">{response.error}</div>
                )}
              </div>
            ) : (
              <CodeMirror value={prettyJson} theme={isDark ? oneDark : undefined} extensions={[json()]} readOnly className="h-full"
                basicSetup={{ lineNumbers: true, foldGutter: true }} />
            )}
          </div>
        ) : tab === 'headers' ? (
          <div className="p-3 space-y-2 overflow-y-auto h-full">
            <MetadataSection key={`headers-${response.durationMs}`} title="Response Headers" entries={response.headers} />
            <MetadataSection key={`trailers-${response.durationMs}`} title="Trailers" entries={response.trailers} />
          </div>
        ) : (
          <HistoryPanel />
        )}
      </div>
    </div>
  );
}
