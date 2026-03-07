import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { Clock, ChevronDown, ChevronRight, AlertCircle, CheckCircle } from 'lucide-react';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { oneDark } from '@codemirror/theme-one-dark';
import { MetadataEntry } from '../../types';

function StatusBadge({ code, text }: { code: number; text: string }) {
  const isOk = code === 0;
  return (
    <div className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded ${
      isOk ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-[#e94560]'
    }`}>
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
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 w-full px-2 py-1 text-xs text-[#94a3b8] hover:text-[#e2e8f0]"
      >
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

export default function ResponsePanel() {
  const { response, isInvoking, invokeError, selectedMethod } = useAppStore();
  const [tab, setTab] = useState<'response' | 'headers'>('response');

  if (!selectedMethod) return null;

  if (isInvoking) {
    return (
      <div className="flex-1 flex items-center justify-center text-[#94a3b8] text-sm gap-2">
        <div className="w-4 h-4 border-2 border-[#e94560] border-t-transparent rounded-full animate-spin" />
        Sending request…
      </div>
    );
  }

  if (invokeError && !response) {
    return (
      <div className="flex-1 p-4">
        <div className="flex items-start gap-2 p-3 bg-red-900/20 border border-red-900/40 rounded text-xs text-[#e94560]">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span className="break-all">{invokeError}</span>
        </div>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="flex-1 flex items-center justify-center text-[#4a5568] text-sm select-none">
        Response will appear here
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
        {response.statusMessage && (
          <span className="text-xs text-[#94a3b8] truncate">{response.statusMessage}</span>
        )}
        <div className="ml-auto flex items-center gap-1 text-xs text-[#4a5568]">
          <Clock size={11} />
          {response.durationMs}ms
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#2d3748]">
        {(['response', 'headers'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-xs capitalize transition-colors border-b-2 ${
              tab === t
                ? 'border-[#e94560] text-[#e2e8f0]'
                : 'border-transparent text-[#94a3b8] hover:text-[#e2e8f0]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === 'response' ? (
          <div className="h-full">
            {response.error ? (
              <div className="p-3 text-xs text-[#e94560] font-mono break-all">{response.error}</div>
            ) : (
              <CodeMirror
                value={prettyJson}
                theme={oneDark}
                extensions={[json()]}
                readOnly
                className="h-full"
                basicSetup={{ lineNumbers: true, foldGutter: true }}
              />
            )}
          </div>
        ) : (
          <div className="p-3 space-y-2 overflow-y-auto h-full">
            <MetadataSection title="Response Headers" entries={response.headers} />
            <MetadataSection title="Trailers" entries={response.trailers} />
          </div>
        )}
      </div>
    </div>
  );
}
