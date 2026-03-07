import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { Environment } from '../../types';
import { Plus, Trash2, X, Check, ChevronDown } from 'lucide-react';

// ─── Environment Editor Modal ────────────────────────────────────────────────

interface EnvEditorProps {
  initial?: Environment;
  onClose: () => void;
}

function EnvEditor({ initial, onClose }: EnvEditorProps) {
  const { saveEnvironment } = useAppStore();
  const [name, setName] = useState(initial?.name ?? '');
  const [vars, setVars] = useState<{ key: string; value: string }[]>(
    initial ? Object.entries(initial.variables ?? {}).map(([key, value]) => ({ key, value })) : []
  );

  const addVar = () => setVars((v) => [...v, { key: '', value: '' }]);
  const removeVar = (i: number) => setVars((v) => v.filter((_, idx) => idx !== i));
  const updateVar = (i: number, field: 'key' | 'value', val: string) =>
    setVars((v) => v.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)));

  const handleSave = async () => {
    if (!name.trim()) return;
    const variables: Record<string, string> = {};
    for (const { key, value } of vars) {
      if (key.trim()) variables[key.trim()] = value;
    }
    const now = new Date().toISOString();
    await saveEnvironment({
      id: initial?.id ?? crypto.randomUUID(),
      name: name.trim(),
      variables,
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#16213e] border border-[#2d3748] rounded-lg p-4 w-96 shadow-xl flex flex-col gap-3 max-h-[80vh]">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#e2e8f0]">
            {initial ? 'Edit Environment' : 'New Environment'}
          </h3>
          <button onClick={onClose} className="text-[#4a5568] hover:text-[#e2e8f0]">
            <X size={14} />
          </button>
        </div>

        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Environment name (e.g. Production)"
          className="bg-[#1a1a2e] border border-[#2d3748] rounded px-2 py-1.5 text-xs text-[#e2e8f0] placeholder-[#4a5568] outline-none focus:border-[#e94560]"
        />

        <div className="flex items-center justify-between">
          <span className="text-xs text-[#94a3b8] font-medium">Variables</span>
          <button
            onClick={addVar}
            className="flex items-center gap-1 text-xs text-[#94a3b8] hover:text-[#e2e8f0] px-1.5 py-0.5 rounded hover:bg-[#1e2132]"
          >
            <Plus size={11} /> Add
          </button>
        </div>

        <div className="overflow-y-auto space-y-1 max-h-64">
          {vars.length === 0 && (
            <p className="text-xs text-[#4a5568]">No variables — use {'{{VAR_NAME}}'} in requests</p>
          )}
          {vars.map((v, i) => (
            <div key={i} className="flex gap-1">
              <input
                value={v.key}
                onChange={(e) => updateVar(i, 'key', e.target.value)}
                placeholder="KEY"
                className="w-32 bg-[#1a1a2e] border border-[#2d3748] rounded px-2 py-0.5 text-xs text-[#e94560] placeholder-[#4a5568] outline-none focus:border-[#e94560] font-mono"
              />
              <input
                value={v.value}
                onChange={(e) => updateVar(i, 'value', e.target.value)}
                placeholder="value"
                className="flex-1 bg-[#1a1a2e] border border-[#2d3748] rounded px-2 py-0.5 text-xs text-[#e2e8f0] placeholder-[#4a5568] outline-none focus:border-[#e94560] font-mono"
              />
              <button onClick={() => removeVar(i)} className="text-[#4a5568] hover:text-[#e94560] p-1">
                <X size={11} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-1.5 text-xs text-[#94a3b8] border border-[#2d3748] rounded hover:bg-[#1e2132]">
            Cancel
          </button>
          <button onClick={handleSave} disabled={!name.trim()} className="flex-1 py-1.5 text-xs bg-[#e94560] text-white rounded hover:bg-[#c73652] disabled:opacity-40">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Environment Selector Dropdown ───────────────────────────────────────────

export default function EnvSelector() {
  const {
    environments,
    activeEnvironmentId,
    loadEnvironments,
    setActiveEnvironment,
    deleteEnvironment,
  } = useAppStore();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Environment | undefined>(undefined);
  const [showEditor, setShowEditor] = useState(false);

  useEffect(() => { loadEnvironments(); }, []);

  const active = environments.find((e) => e.id === activeEnvironmentId);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 px-2 py-1 bg-[#1a1a2e] border border-[#2d3748] rounded text-xs text-[#94a3b8] hover:border-[#4a5568] max-w-[140px]"
      >
        <span className={`w-2 h-2 rounded-full shrink-0 ${active ? 'bg-green-400' : 'bg-[#4a5568]'}`} />
        <span className="truncate">{active ? active.name : 'No Environment'}</span>
        <ChevronDown size={11} className="shrink-0" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-[#16213e] border border-[#2d3748] rounded shadow-lg min-w-[200px]">
          {/* No env option */}
          <button
            onClick={() => { setActiveEnvironment(''); setOpen(false); }}
            className={`flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-[#1e2132] ${!active ? 'text-[#e94560]' : 'text-[#e2e8f0]'}`}
          >
            {!active && <Check size={11} />}
            <span>No Environment</span>
          </button>

          {environments.map((env) => (
            <div key={env.id} className="flex items-center group">
              <button
                onClick={() => { setActiveEnvironment(env.id); setOpen(false); }}
                className={`flex-1 flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-[#1e2132] ${activeEnvironmentId === env.id ? 'text-[#e94560]' : 'text-[#e2e8f0]'}`}
              >
                {activeEnvironmentId === env.id && <Check size={11} />}
                <span className="truncate">{env.name}</span>
              </button>
              <button
                onClick={() => { setEditing(env); setShowEditor(true); setOpen(false); }}
                className="px-1 py-1.5 text-[#4a5568] hover:text-[#e2e8f0] opacity-0 group-hover:opacity-100"
                title="Edit"
              >
                ✎
              </button>
              <button
                onClick={() => { deleteEnvironment(env.id); }}
                className="px-2 py-1.5 text-[#4a5568] hover:text-[#e94560] opacity-0 group-hover:opacity-100"
                title="Delete"
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}

          <div className="border-t border-[#2d3748] mt-1 pt-1">
            <button
              onClick={() => { setEditing(undefined); setShowEditor(true); setOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[#1e2132]"
            >
              <Plus size={11} /> New Environment
            </button>
          </div>
        </div>
      )}

      {showEditor && (
        <EnvEditor
          initial={editing}
          onClose={() => { setShowEditor(false); setEditing(undefined); }}
        />
      )}
    </div>
  );
}
