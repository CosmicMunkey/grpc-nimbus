import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../../store/appStore';
import { Environment } from '../../types';
import { Plus, Trash2, X, Check, ChevronDown, Pencil, Settings } from 'lucide-react';
import { usePortalMenu } from '../../hooks/usePortalMenu';

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
          onKeyDown={(e) => e.key === 'Enter' && addVar()}
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

// ─── Environments Manager Modal ───────────────────────────────────────────────

interface EnvManagerProps {
  onClose: () => void;
}

function EnvManager({ onClose }: EnvManagerProps) {
  const { environments, activeEnvironmentId, setActiveEnvironment, deleteEnvironment } = useAppStore();
  const [editing, setEditing] = useState<Environment | undefined>(undefined);
  const [showEditor, setShowEditor] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    await deleteEnvironment(id);
    setConfirmDeleteId(null);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#16213e] border border-[#2d3748] rounded-lg shadow-xl w-[480px] max-h-[70vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2d3748]">
          <h3 className="text-sm font-semibold text-[#e2e8f0]">Environments</h3>
          <button onClick={onClose} className="text-[#4a5568] hover:text-[#e2e8f0]">
            <X size={14} />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#2d3748]">
          {environments.length === 0 && (
            <p className="px-4 py-6 text-xs text-[#4a5568] text-center">
              No environments yet. Create one to use variables like {'{{HOST}}'} in your requests.
            </p>
          )}
          {environments.map((env) => {
            const varCount = Object.keys(env.variables ?? {}).length;
            const isActive = env.id === activeEnvironmentId;
            return (
              <div key={env.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#1e2132]">
                {/* Active indicator + select */}
                <button
                  onClick={() => setActiveEnvironment(isActive ? '' : env.id)}
                  title={isActive ? 'Deactivate' : 'Set active'}
                  className={`w-3 h-3 rounded-full border-2 shrink-0 transition-colors ${
                    isActive ? 'bg-green-400 border-green-400' : 'border-[#4a5568] hover:border-green-400'
                  }`}
                />

                {/* Name + var count */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium truncate ${isActive ? 'text-green-400' : 'text-[#e2e8f0]'}`}>
                      {env.name}
                    </span>
                    {isActive && (
                      <span className="text-[10px] text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">active</span>
                    )}
                  </div>
                  <p className="text-[10px] text-[#4a5568] mt-0.5">
                    {varCount === 0 ? 'No variables' : `${varCount} variable${varCount !== 1 ? 's' : ''}`}
                  </p>
                </div>

                {/* Actions */}
                {confirmDeleteId === env.id ? (
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-[#94a3b8]">Delete?</span>
                    <button
                      onClick={() => handleDelete(env.id)}
                      className="px-2 py-0.5 bg-[#e94560] text-white rounded text-[11px] hover:bg-[#c73652]"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="px-2 py-0.5 border border-[#2d3748] text-[#94a3b8] rounded text-[11px] hover:bg-[#1e2132]"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { setEditing(env); setShowEditor(true); }}
                      title="Edit"
                      className="p-1.5 text-[#4a5568] hover:text-[#e2e8f0] hover:bg-[#2d3748] rounded"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(env.id)}
                      title="Delete"
                      className="p-1.5 text-[#4a5568] hover:text-[#e94560] hover:bg-[#2d3748] rounded"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#2d3748]">
          <p className="text-[10px] text-[#4a5568]">Click ● to activate · {'{{VAR}}'} in request bodies</p>
          <button
            onClick={() => { setEditing(undefined); setShowEditor(true); }}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1 bg-[#e94560] text-white rounded hover:bg-[#c73652]"
          >
            <Plus size={11} /> New Environment
          </button>
        </div>
      </div>

      {showEditor && (
        <EnvEditor
          initial={editing}
          onClose={() => { setShowEditor(false); setEditing(undefined); }}
        />
      )}
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
  } = useAppStore();

  const { open, toggle, close, triggerRef, menuStyle } = usePortalMenu('left');
  const [showManager, setShowManager] = useState(false);

  useEffect(() => { loadEnvironments(); }, []);

  const active = environments.find((e) => e.id === activeEnvironmentId);

  return (
    <div className="relative">
      <button
        ref={triggerRef as React.RefObject<HTMLButtonElement>}
        onClick={toggle}
        className="flex items-center gap-1 px-2 py-1 bg-[#1a1a2e] border border-[#2d3748] rounded text-xs text-[#94a3b8] hover:border-[#4a5568] max-w-[160px]"
      >
        <span className={`w-2 h-2 rounded-full shrink-0 ${active ? 'bg-green-400' : 'bg-[#4a5568]'}`} />
        <span className="truncate flex-1">{active ? active.name : 'No Environment'}</span>
        <ChevronDown size={11} className="shrink-0" />
      </button>

      {open && createPortal(
        <div style={menuStyle} className="bg-[#16213e] border border-[#2d3748] rounded shadow-lg min-w-[200px]">
          {/* No env option */}
          <button
            onClick={() => { setActiveEnvironment(''); close(); }}
            className={`flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-[#1e2132] ${!active ? 'text-[#e94560]' : 'text-[#e2e8f0]'}`}
          >
            {!active && <Check size={11} />}
            <span className={!active ? '' : 'ml-[15px]'}>No Environment</span>
          </button>

          {environments.map((env) => (
            <button
              key={env.id}
              onClick={() => { setActiveEnvironment(env.id); close(); }}
              className={`flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left hover:bg-[#1e2132] ${
                activeEnvironmentId === env.id ? 'text-[#e94560]' : 'text-[#e2e8f0]'
              }`}
            >
              {activeEnvironmentId === env.id ? <Check size={11} /> : <span className="w-[11px]" />}
              <span className="truncate">{env.name}</span>
            </button>
          ))}

          <div className="border-t border-[#2d3748] mt-1">
            <button
              onClick={() => { close(); setShowManager(true); }}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[#1e2132]"
            >
              <Settings size={11} /> Manage Environments…
            </button>
          </div>
        </div>,
        document.body
      )}

      {showManager && <EnvManager onClose={() => setShowManager(false)} />}
    </div>
  );
}

