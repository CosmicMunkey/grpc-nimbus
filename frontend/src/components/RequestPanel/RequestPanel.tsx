import React, { useState } from 'react';
import { useAppStore, useActiveTab } from '../../store/appStore';
import { Play, Save, Plus, X, LayoutList, Code, Terminal, Copy, Check } from 'lucide-react';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { oneDark } from '@codemirror/theme-one-dark';
import { MetadataEntry } from '../../types';
import FormBuilder from '../RequestBuilder/FormBuilder';

function MetadataTable() {
  const { requestMetadata } = useActiveTab();
  const { setRequestMetadata, environments, activeEnvironmentId } = useAppStore();

  const activeEnv = environments.find((e) => e.id === activeEnvironmentId);
  const envHeaders = (activeEnv?.headers ?? []).filter((h) => h.key.trim());

  const addRow = () => setRequestMetadata([...requestMetadata, { key: '', value: '' }]);

  const updateRow = (i: number, field: keyof MetadataEntry, val: string) => {
    const updated = requestMetadata.map((r, idx) => idx === i ? { ...r, [field]: val } : r);
    setRequestMetadata(updated);
  };

  const removeRow = (i: number) => setRequestMetadata(requestMetadata.filter((_, idx) => idx !== i));

  return (
    <div className="flex flex-col gap-3">
      {/* Environment headers (read-only) */}
      {envHeaders.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-[#4a5568] font-medium uppercase tracking-wide">
            From environment · {activeEnv?.name}
          </span>
          <div className="space-y-1">
            {envHeaders.map((h, i) => (
              <div key={i} className="flex gap-1 opacity-60">
                <div className="flex-1 bg-[#1a1a2e] border border-[#2d3748] rounded px-2 py-0.5 text-xs text-[#e94560] font-mono truncate">
                  {h.key}
                </div>
                <div className="flex-1 bg-[#1a1a2e] border border-[#2d3748] rounded px-2 py-0.5 text-xs text-[#94a3b8] font-mono truncate">
                  {h.value}
                </div>
                <div className="w-5" /> {/* spacer to align with editable rows */}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-request metadata (editable) */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-[#4a5568] font-medium uppercase tracking-wide">Request metadata</span>
          <button
            onClick={addRow}
            className="flex items-center gap-1 text-xs text-[#94a3b8] hover:text-[#e2e8f0] px-1.5 py-0.5 rounded hover:bg-[#1e2132]"
          >
            <Plus size={11} /> Add
          </button>
        </div>

        {requestMetadata.length === 0 ? (
          <p className="text-xs text-[#4a5568]">No request metadata — click Add to set entries</p>
        ) : (
          <div className="space-y-1">
            {requestMetadata.map((row, i) => (
              <div key={i} className="flex gap-1">
                <input
                  value={row.key}
                  onChange={(e) => updateRow(i, 'key', e.target.value)}
                  placeholder="key"
                  className="flex-1 bg-[#1a1a2e] border border-[#2d3748] rounded px-2 py-0.5 text-xs text-[#e2e8f0] placeholder-[#4a5568] outline-none focus:border-[#e94560] font-mono"
                />
                <input
                  value={row.value}
                  onChange={(e) => updateRow(i, 'value', e.target.value)}
                  placeholder="value"
                  className="flex-1 bg-[#1a1a2e] border border-[#2d3748] rounded px-2 py-0.5 text-xs text-[#e2e8f0] placeholder-[#4a5568] outline-none focus:border-[#e94560] font-mono"
                />
                <button
                  onClick={() => removeRow(i)}
                  className="text-[#4a5568] hover:text-[#e94560] p-1"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
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
      <div className="bg-[#16213e] border border-[#2d3748] rounded-lg p-4 w-72 shadow-xl">
        <h3 className="text-sm font-semibold text-[#e2e8f0] mb-3">Save Request</h3>
        <div className="space-y-2">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="Request name"
            className="w-full bg-[#1a1a2e] border border-[#2d3748] rounded px-2 py-1.5 text-xs text-[#e2e8f0] placeholder-[#4a5568] outline-none focus:border-[#e94560]"
          />
          {collections.length > 0 ? (
            <select
              value={colId}
              onChange={(e) => setColId(e.target.value)}
              className="w-full bg-[#1a1a2e] border border-[#2d3748] rounded px-2 py-1.5 text-xs text-[#e2e8f0] outline-none focus:border-[#e94560]"
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
              className="w-full bg-[#1a1a2e] border border-[#2d3748] rounded px-2 py-1.5 text-xs text-[#e2e8f0] placeholder-[#4a5568] outline-none focus:border-[#e94560]"
            />
          )}
        </div>
        <div className="flex gap-2 mt-4">
          <button
            onClick={onClose}
            className="flex-1 py-1.5 text-xs text-[#94a3b8] border border-[#2d3748] rounded hover:bg-[#1e2132]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name}
            className="flex-1 py-1.5 text-xs bg-[#e94560] text-white rounded hover:bg-[#c73652] disabled:opacity-40"
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
  else if (tls === 'insecure_skip') args.push('-insecure');

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
        <span className="text-[10px] text-[#4a5568] font-mono">grpcurl command</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs px-2 py-0.5 rounded border border-[#2d3748] text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[#1e2132]"
        >
          {copied ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="flex-1 overflow-auto bg-[#1a1a2e] border border-[#2d3748] rounded p-3 text-xs font-mono text-[#e2e8f0] leading-relaxed whitespace-pre select-all">
        {command}
      </pre>
      {loadMode === 'proto' && (
        <p className="text-[10px] text-[#4a5568]">
          Note: Proto file import paths may need <span className="font-mono text-[#94a3b8]">-import-path</span> and <span className="font-mono text-[#94a3b8]">-proto</span> flags added manually.
        </p>
      )}
      {loadMode === 'reflection' && (
        <p className="text-[10px] text-[#4a5568]">
          Using server reflection — no <span className="font-mono text-[#94a3b8]">-protoset</span> flag needed.
        </p>
      )}
    </div>
  );
}

export default function RequestPanel() {
  const {
    selectedMethod,
    requestJson,
    timeoutSeconds,
    isInvoking,
    savedRequestId,
    savedRequestName,
  } = useActiveTab();
  const { setRequestJson, setTimeoutSeconds, invoke, updateSavedRequest } = useAppStore();

  const [tab, setTab] = useState<'form' | 'body' | 'metadata' | 'grpcurl'>('form');
  const [showSave, setShowSave] = useState(false);

  if (!selectedMethod) {
    return (
      <div className="flex-1 flex items-center justify-center text-[#4a5568] text-sm select-none">
        Select a method from the sidebar
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Method header bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2d3748] bg-[#16213e]">
        <span className="text-xs font-mono text-[#e94560] truncate flex-1">
          {selectedMethod.fullName}
        </span>
        {/* Timeout */}
        <div className="flex items-center gap-1 text-xs text-[#94a3b8]">
          <span>Timeout</span>
          <input
            type="number"
            min={0}
            step={1}
            value={timeoutSeconds || ''}
            onChange={(e) => setTimeoutSeconds(Number(e.target.value))}
            placeholder="∞"
            className="w-12 bg-[#1a1a2e] border border-[#2d3748] rounded px-1 py-0.5 text-xs text-center text-[#e2e8f0] outline-none focus:border-[#e94560]"
          />
          <span>s</span>
        </div>
        {/* Save — if tab is linked to a saved request, update in-place; otherwise open dialog */}
        {savedRequestId ? (
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => updateSavedRequest()}
              title={`Save over "${savedRequestName}"`}
              className="flex items-center gap-1 text-xs px-2 py-1 border border-[#2d3748] rounded text-[#94a3b8] hover:bg-[#1e2132] hover:text-[#e2e8f0]"
            >
              <Save size={12} /> Save
            </button>
            <button
              onClick={() => setShowSave(true)}
              title="Save as a new request…"
              className="flex items-center text-xs px-1.5 py-1 border border-[#2d3748] rounded-r text-[#4a5568] hover:bg-[#1e2132] hover:text-[#94a3b8] border-l-0 -ml-px"
            >
              <Plus size={11} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowSave(true)}
            className="flex items-center gap-1 text-xs px-2 py-1 border border-[#2d3748] rounded text-[#94a3b8] hover:bg-[#1e2132] hover:text-[#e2e8f0]"
          >
            <Save size={12} /> Save
          </button>
        )}
        {/* Send */}
        <button
          onClick={invoke}
          disabled={isInvoking}
          className="flex items-center gap-1 text-xs px-3 py-1 bg-[#e94560] text-white rounded hover:bg-[#c73652] disabled:opacity-50 font-medium"
        >
          <Play size={12} />
          {isInvoking ? 'Sending…' : 'Send'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#2d3748]">
        <button
          onClick={() => setTab('form')}
          className={`flex items-center gap-1 px-4 py-1.5 text-xs transition-colors border-b-2 ${
            tab === 'form' ? 'border-[#e94560] text-[#e2e8f0]' : 'border-transparent text-[#94a3b8] hover:text-[#e2e8f0]'
          }`}
        >
          <LayoutList size={11} /> Form
        </button>
        <button
          onClick={() => setTab('body')}
          className={`flex items-center gap-1 px-4 py-1.5 text-xs transition-colors border-b-2 ${
            tab === 'body' ? 'border-[#e94560] text-[#e2e8f0]' : 'border-transparent text-[#94a3b8] hover:text-[#e2e8f0]'
          }`}
        >
          <Code size={11} /> JSON
        </button>
        <button
          onClick={() => setTab('metadata')}
          className={`px-4 py-1.5 text-xs capitalize transition-colors border-b-2 ${
            tab === 'metadata' ? 'border-[#e94560] text-[#e2e8f0]' : 'border-transparent text-[#94a3b8] hover:text-[#e2e8f0]'
          }`}
        >
          Metadata
        </button>
        <button
          onClick={() => setTab('grpcurl')}
          className={`flex items-center gap-1 px-4 py-1.5 text-xs transition-colors border-b-2 ${
            tab === 'grpcurl' ? 'border-[#e94560] text-[#e2e8f0]' : 'border-transparent text-[#94a3b8] hover:text-[#e2e8f0]'
          }`}
        >
          <Terminal size={11} /> grpcurl
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === 'form' ? (
          <FormBuilder />
        ) : tab === 'body' ? (
          <div className="h-full">
            <CodeMirror
              value={requestJson}
              onChange={setRequestJson}
              theme={oneDark}
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
