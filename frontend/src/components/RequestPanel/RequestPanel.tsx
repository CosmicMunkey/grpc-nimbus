import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { Play, Save, Plus, Trash2, X } from 'lucide-react';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { oneDark } from '@codemirror/theme-one-dark';
import { MetadataEntry } from '../../types';

function MetadataTable() {
  const { requestMetadata, setRequestMetadata } = useAppStore();

  const addRow = () => setRequestMetadata([...requestMetadata, { key: '', value: '' }]);

  const updateRow = (i: number, field: keyof MetadataEntry, val: string) => {
    const updated = requestMetadata.map((r, idx) => idx === i ? { ...r, [field]: val } : r);
    setRequestMetadata(updated);
  };

  const removeRow = (i: number) => setRequestMetadata(requestMetadata.filter((_, idx) => idx !== i));

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-[#94a3b8] font-medium">Metadata / Headers</span>
        <button
          onClick={addRow}
          className="flex items-center gap-1 text-xs text-[#94a3b8] hover:text-[#e2e8f0] px-1.5 py-0.5 rounded hover:bg-[#1e2132]"
        >
          <Plus size={11} /> Add
        </button>
      </div>

      {requestMetadata.length === 0 ? (
        <p className="text-xs text-[#4a5568]">No metadata — click Add to set headers</p>
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

export default function RequestPanel() {
  const {
    selectedMethod,
    requestJson,
    setRequestJson,
    timeoutSeconds,
    setTimeoutSeconds,
    invoke,
    isInvoking,
  } = useAppStore();

  const [tab, setTab] = useState<'body' | 'metadata'>('body');
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
        {/* Save */}
        <button
          onClick={() => setShowSave(true)}
          className="flex items-center gap-1 text-xs px-2 py-1 border border-[#2d3748] rounded text-[#94a3b8] hover:bg-[#1e2132] hover:text-[#e2e8f0]"
        >
          <Save size={12} /> Save
        </button>
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
        {(['body', 'metadata'] as const).map((t) => (
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

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === 'body' ? (
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
