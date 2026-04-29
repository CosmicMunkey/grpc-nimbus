import React, { useState, useMemo } from 'react';
import { useAppStore, useActiveTab } from '../../store/appStore';
import { Play, Square, Save, Plus, X, LayoutList, Code, Terminal, Copy, Check } from 'lucide-react';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { MetadataEntry } from '../../types';
import FormBuilder from '../RequestBuilder/FormBuilder';
import { buildCodeMirrorTheme } from '../../codeMirrorTheme';

function MetadataTable() {
  const { requestMetadata } = useActiveTab();
  const { setRequestMetadata, environments, activeEnvironmentId, defaultMetadata } = useAppStore();

  const activeEnv = environments.find((e) => e.id === activeEnvironmentId);
  const envHeaders = (activeEnv?.headers ?? []).filter((h) => h.key.trim());
  const defaultMeta = (defaultMetadata ?? []).filter((h) => h.key.trim());

  const addRow = () => setRequestMetadata([...requestMetadata, { key: '', value: '' }]);

  const updateRow = (i: number, field: keyof MetadataEntry, val: string) => {
    const updated = requestMetadata.map((r, idx) => idx === i ? { ...r, [field]: val } : r);
    setRequestMetadata(updated);
  };

  const removeRow = (i: number) => setRequestMetadata(requestMetadata.filter((_, idx) => idx !== i));

  return (
    <div className="flex flex-col gap-3">
      {/* Default metadata from Settings (read-only) */}
      {defaultMeta.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-c-text3 font-medium uppercase tracking-wide">
            Default · Settings
          </span>
          <div className="space-y-1">
            {defaultMeta.map((h, i) => (
              <div key={i} className="flex gap-1 items-center opacity-60">
                <div className="w-2/5 shrink-0 bg-c-bg border border-c-border rounded px-2 py-0.5 text-xs text-c-accent font-mono truncate">
                  {h.key}
                </div>
                <span className="text-c-text3 text-sm shrink-0">:</span>
                <div className="flex-1 bg-c-bg border border-c-border rounded px-2 py-0.5 text-xs text-c-text2 font-mono truncate">
                  {h.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Environment headers (read-only) */}
      {envHeaders.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-c-text3 font-medium uppercase tracking-wide">
            From environment · {activeEnv?.name}
          </span>
          <div className="space-y-1">
            {envHeaders.map((h, i) => (
              <div key={i} className="flex gap-1 items-center opacity-60">
                <div className="w-2/5 shrink-0 bg-c-bg border border-c-border rounded px-2 py-0.5 text-xs text-c-accent font-mono truncate">
                  {h.key}
                </div>
                <span className="text-c-text3 text-sm shrink-0">:</span>
                <div className="flex-1 bg-c-bg border border-c-border rounded px-2 py-0.5 text-xs text-c-text2 font-mono truncate">
                  {h.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-request metadata (editable) */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-c-text3 font-medium uppercase tracking-wide">Request metadata</span>
          <button
            onClick={addRow}
            className="flex items-center gap-1 text-xs text-c-text2 hover:text-c-text px-1.5 py-0.5 rounded hover:bg-c-hover"
          >
            <Plus size={11} /> Add
          </button>
        </div>

        {requestMetadata.length === 0 ? (
          <p className="text-xs text-c-text3">No request metadata — click Add to set entries</p>
        ) : (
          <div className="space-y-1">
            {requestMetadata.map((row, i) => {
              const dynamic = row.value.includes('${') || row.value.includes('$(');
              return (
                <div key={i} className="flex gap-1 items-center">
                  <input
                    value={row.key}
                    onChange={(e) => updateRow(i, 'key', e.target.value)}
                    placeholder="key"
                    className="w-2/5 shrink-0 bg-c-bg border border-c-border rounded px-2 py-0.5 text-xs text-c-text placeholder-c-text3 outline-none focus:border-c-accent font-mono"
                  />
                  <span className="text-c-text3 text-sm shrink-0">:</span>
                  <div className="relative flex-1">
                    <input
                      value={row.value}
                      onChange={(e) => updateRow(i, 'value', e.target.value)}
                      placeholder="value"
                      className={`w-full bg-c-bg border border-c-border rounded px-2 py-0.5 text-xs text-c-text placeholder-c-text3 outline-none focus:border-c-accent font-mono ${dynamic ? 'pr-6' : ''}`}
                    />
                    {dynamic && (
                      <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] font-mono text-c-accent bg-c-accent/10 px-1 rounded leading-tight pointer-events-none">$</span>
                    )}
                  </div>
                  <button
                    onClick={() => removeRow(i)}
                    className="shrink-0 w-5 h-5 flex items-center justify-center text-c-text3 hover:text-c-accent rounded hover:bg-c-hover"
                  >
                    <X size={11} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function SaveRequestModal({ onClose }: { onClose: () => void }) {
  const { collections, saveToCollection } = useAppStore();
  const [name, setName] = useState('');
  const [colId, setColId] = useState(collections[0]?.id ?? '');
  const [newColName, setNewColName] = useState('');
  const useNew = !colId || collections.length === 0;

  const handleSave = async () => {
    const targetColId = useNew ? (newColName || 'Default') : colId;
    if (!name) return;
    await saveToCollection(targetColId, name);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-c-panel border border-c-border rounded-lg p-4 w-72 shadow-xl">
        <h3 className="text-sm font-semibold text-c-text mb-3">Save Request</h3>
        <div className="space-y-2">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSave(); } }}
            placeholder="Request name"
            className="w-full bg-c-bg border border-c-border rounded px-2 py-1.5 text-xs text-c-text placeholder-c-text3 outline-none focus:border-c-accent"
          />
          {collections.length > 0 ? (
            <select
              value={colId}
              onChange={(e) => setColId(e.target.value)}
              className="w-full bg-c-bg border border-c-border rounded pl-2 pr-6 py-1.5 text-xs text-c-text outline-none focus:border-c-accent"
            >
              {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              <option value="">+ New collection…</option>
            </select>
          ) : null}
          {(useNew || colId === '') && (
            <input
              value={newColName}
              onChange={(e) => setNewColName(e.target.value)}
              placeholder="New collection name"
              className="w-full bg-c-bg border border-c-border rounded px-2 py-1.5 text-xs text-c-text placeholder-c-text3 outline-none focus:border-c-accent"
            />
          )}
        </div>
        <div className="flex gap-2 mt-4">
          <button
            onClick={onClose}
            className="flex-1 py-1.5 text-xs text-c-text2 border border-c-border rounded hover:bg-c-hover"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name}
            className="flex-1 py-1.5 text-xs bg-c-accent text-white rounded hover:bg-c-accent2 disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function shellQuote(s: string): string {
  // Wrap in single quotes, escaping any embedded single quotes.
  return `'${s.replace(/'/g, "'\\''")}'`;
}

function buildGrpcurlCommand(opts: {
  target: string;
  tls: string;
  protosetPath: string | undefined;
  loadMode: string;
  envHeaders: { key: string; value: string }[];
  metadata: MetadataEntry[];
  requestJson: string;
  methodPath: string;
}): string {
  const { target, tls, protosetPath, loadMode, envHeaders, metadata, requestJson, methodPath } = opts;
  const args: string[] = ['grpcurl'];

  if (tls === 'none') args.push('-plaintext');

  if (loadMode === 'protoset' && protosetPath) {
    args.push(`-protoset ${shellQuote(protosetPath)}`);
  }

  for (const h of [...envHeaders, ...metadata]) {
    if (h.key.trim()) args.push(`-H ${shellQuote(`${h.key}: ${h.value}`)}`);
  }

  // Omit -d when body is empty or an empty object.
  const body = requestJson?.trim() || '{}';
  const isEmpty = (() => { try { const p = JSON.parse(body); return typeof p === 'object' && p !== null && Object.keys(p).length === 0; } catch { return false; } })();
  if (!isEmpty) args.push(`-d ${shellQuote(body)}`);

  args.push(shellQuote(target || 'localhost:50051'));
  args.push(shellQuote(methodPath));

  return args.join(' \\\n  ');
}

function GrpcurlTab() {
  const { services, connectionConfig, loadMode, environments, activeEnvironmentId } = useAppStore();
  const { requestJson, requestMetadata, selectedMethod } = useActiveTab();
  const [copied, setCopied] = useState(false);

  const activeEnv = environments.find((e) => e.id === activeEnvironmentId);
  const sourceFile = services.find((s) => s.name === selectedMethod?.serviceName)?.sourceFile;

  const command = buildGrpcurlCommand({
    target: connectionConfig.target,
    tls: connectionConfig.tls,
    protosetPath: sourceFile,
    loadMode,
    envHeaders: activeEnv?.headers ?? [],
    metadata: requestMetadata,
    requestJson,
    methodPath: selectedMethod?.fullName ?? '',
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="h-full flex flex-col p-3 gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-c-text3 font-mono">grpcurl command</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs px-2 py-0.5 rounded border border-c-border text-c-text2 hover:text-c-text hover:bg-c-hover"
        >
          {copied ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="flex-1 overflow-auto bg-c-bg border border-c-border rounded p-3 text-xs font-mono text-c-text leading-relaxed whitespace-pre select-all">
        {command}
      </pre>
      {loadMode === 'proto' && (
        <p className="text-[10px] text-c-text3">
          Note: Proto file import paths may need <span className="font-mono text-c-text2">-import-path</span> and <span className="font-mono text-c-text2">-proto</span> flags added manually.
        </p>
      )}
      {loadMode === 'reflection' && (
        <p className="text-[10px] text-c-text3">
          Using server reflection — no <span className="font-mono text-c-text2">-protoset</span> flag needed.
        </p>
      )}
    </div>
  );
}

export default function RequestPanel() {
  const {
    id: tabId,
    selectedMethod,
    requestJson,
    timeoutSeconds,
    isInvoking,
    isStreaming,
    savedRequestId,
    savedRequestName,
  } = useActiveTab();
  const { setRequestJson, setTimeoutSeconds, invoke, cancelInvoke, updateSavedRequest, streamingTabId } = useAppStore();
  const activeThemeTokens = useAppStore(s => s.activeThemeTokens);
  const cmTheme = useMemo(() => buildCodeMirrorTheme(activeThemeTokens), [activeThemeTokens]);
  const hasOtherActiveStream = streamingTabId !== null && streamingTabId !== tabId;
  const showCancel = isInvoking || isStreaming;

  const [tab, setTab] = useState<'form' | 'body' | 'metadata' | 'grpcurl'>('form');
  const [showSave, setShowSave] = useState(false);

  if (!selectedMethod) {
    return (
      <div className="flex-1 flex items-center justify-center text-c-text3 text-sm select-none">
        Select a method from the sidebar
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Method header bar */}
      <div className="flex flex-col border-b border-c-border bg-c-panel">
        <div className="flex items-center gap-2 px-3 pt-2 pb-1">
          <span className="text-xs font-semibold text-c-text truncate flex-1">
            {selectedMethod.methodName}
          </span>
          {/* Timeout */}
          <div className="flex items-center gap-1 text-xs text-c-text2">
            <span>Timeout</span>
            <input
              type="number"
              min={0}
              step={1}
              value={timeoutSeconds || ''}
              onChange={(e) => setTimeoutSeconds(Number(e.target.value))}
              placeholder="∞"
              className="w-16 bg-c-bg border border-c-border rounded pl-1.5 pr-0.5 py-0.5 text-xs text-c-text outline-none focus:border-c-accent"
            />
            <span>s</span>
          </div>
          {/* Save — if tab is linked to a saved request, update in-place; otherwise open dialog */}
          {savedRequestId ? (
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => updateSavedRequest()}
                title={`Save over "${savedRequestName}"`}
                className="flex items-center gap-1 text-xs px-2 py-1 border border-c-border rounded text-c-text2 hover:bg-c-hover hover:text-c-text"
              >
                <Save size={12} /> Save
              </button>
              <button
                onClick={() => setShowSave(true)}
                title="Save as a new request…"
                className="flex items-center text-xs px-1.5 py-1 border border-c-border rounded-r text-c-text3 hover:bg-c-hover hover:text-c-text2 border-l-0 -ml-px"
              >
                <Plus size={11} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSave(true)}
              className="flex items-center gap-1 text-xs px-2 py-1 border border-c-border rounded text-c-text2 hover:bg-c-hover hover:text-c-text"
            >
              <Save size={12} /> Save
            </button>
          )}
          {/* Send / Cancel */}
          <button
            onClick={() => { void (showCancel ? cancelInvoke() : invoke()); }}
            disabled={!showCancel && hasOtherActiveStream}
            title={!showCancel && hasOtherActiveStream ? 'Another tab is currently streaming' : undefined}
            className={`flex items-center gap-1 text-xs px-3 py-1 rounded font-medium transition-colors ${
              showCancel
                ? 'border border-c-accent text-c-accent hover:bg-c-accent hover:text-white'
                : 'bg-c-accent text-white hover:bg-c-accent2 disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
          >
            {showCancel ? <Square size={11} /> : <Play size={12} />}
            {showCancel ? 'Cancel' : 'Send'}
          </button>
        </div>
        <span className="text-[10px] font-mono text-c-text3 truncate px-3 pb-1.5" title={selectedMethod.fullName}>
          {selectedMethod.fullName}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-c-border">
        <button
          onClick={() => setTab('form')}
          className={`flex items-center gap-1 px-4 py-1.5 text-xs transition-colors border-b-2 ${
            tab === 'form' ? 'border-c-accent text-c-text' : 'border-transparent text-c-text2 hover:text-c-text'
          }`}
        >
          <LayoutList size={11} /> Form
        </button>
        <button
          onClick={() => setTab('body')}
          className={`flex items-center gap-1 px-4 py-1.5 text-xs transition-colors border-b-2 ${
            tab === 'body' ? 'border-c-accent text-c-text' : 'border-transparent text-c-text2 hover:text-c-text'
          }`}
        >
          <Code size={11} /> JSON
        </button>
        <button
          onClick={() => setTab('metadata')}
          className={`px-4 py-1.5 text-xs capitalize transition-colors border-b-2 ${
            tab === 'metadata' ? 'border-c-accent text-c-text' : 'border-transparent text-c-text2 hover:text-c-text'
          }`}
        >
          Metadata
        </button>
        <button
          onClick={() => setTab('grpcurl')}
          className={`flex items-center gap-1 px-4 py-1.5 text-xs transition-colors border-b-2 ${
            tab === 'grpcurl' ? 'border-c-accent text-c-text' : 'border-transparent text-c-text2 hover:text-c-text'
          }`}
        >
          <Terminal size={11} /> grpcurl
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === 'form' ? (
          <FormBuilder key={tabId} />
        ) : tab === 'body' ? (
          <div className="h-full">
            <CodeMirror
              value={requestJson}
              onChange={setRequestJson}
              theme={cmTheme}
              extensions={[json()]}
              className="h-full"
              basicSetup={{
                lineNumbers: true,
                foldGutter: true,
                autocompletion: true,
              }}
            />
          </div>
        ) : tab === 'grpcurl' ? (
          <GrpcurlTab />
        ) : (
          <div className="p-3 overflow-y-auto h-full">
            <MetadataTable />
          </div>
        )}
      </div>

      {showSave && <SaveRequestModal onClose={() => setShowSave(false)} />}
    </div>
  );
}
