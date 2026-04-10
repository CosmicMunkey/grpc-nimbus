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
  const [rows, setRows] = useState<string[]>(
    initial?.headers?.length
      ? initial.headers.map((h) => `${h.key}: ${h.value}`)
      : ['']
  );

  const updateRow = (i: number, val: string) =>
    setRows((r) => r.map((v, idx) => (idx === i ? val : v)));
  const addRow = () => setRows((r) => [...r, '']);
  const removeRow = (i: number) =>
    setRows((r) => r.length > 1 ? r.filter((_, idx) => idx !== i) : ['']);

  const parseRow = (line: string): { key: string; value: string } | null => {
    const idx = line.indexOf(':');
    if (idx < 1) return null;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    return key ? { key, value } : null;
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    const now = new Date().toISOString();
    await saveEnvironment({
      id: initial?.id ?? crypto.randomUUID(),
      name: name.trim(),
      headers: rows.map(parseRow).filter((h): h is { key: string; value: string } => h !== null),
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-c-panel border border-c-border rounded-lg p-5 w-[36rem] shadow-xl flex flex-col gap-4 max-h-[85vh]">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-c-text">
            {initial ? 'Edit Environment' : 'New Environment'}
          </h3>
          <button onClick={onClose} className="text-c-text3 hover:text-c-text">
            <X size={14} />
          </button>
        </div>

        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Environment name (e.g. Production)"
          className="bg-c-bg border border-c-border rounded px-3 py-2 text-sm text-c-text placeholder-c-text3 outline-none focus:border-c-accent"
        />

        <div className="flex flex-col gap-2 min-h-0">
          <div className="flex items-center justify-between">
            <span className="text-xs text-c-text2 font-medium">Default Headers</span>
            <span className="text-[10px] text-c-text3 font-mono">Header-Name: value</span>
          </div>
          <div className="overflow-y-auto space-y-2 max-h-72">
            {rows.map((row, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={row}
                  onChange={(e) => updateRow(i, e.target.value)}
                  placeholder="Authorization: Bearer eyJhbGci..."
                  className="flex-1 bg-c-bg border border-c-border rounded px-3 py-2 text-sm text-c-text placeholder-c-text3 outline-none focus:border-c-accent font-mono"
                />
                <button
                  onClick={() => removeRow(i)}
                  className="shrink-0 text-c-text3 hover:text-c-accent p-1 rounded hover:bg-c-hover"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={addRow}
            className="flex items-center gap-1.5 self-start text-xs text-c-text2 hover:text-c-text px-2 py-1 rounded hover:bg-c-hover"
          >
            <Plus size={11} /> Add header
          </button>
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2 text-xs text-c-text2 border border-c-border rounded hover:bg-c-hover">
            Cancel
          </button>
          <button onClick={handleSave} disabled={!name.trim()} className="flex-1 py-2 text-xs bg-c-accent text-white rounded hover:bg-c-accent2 disabled:opacity-40">
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
      <div className="bg-c-panel border border-c-border rounded-lg shadow-xl w-[480px] max-h-[70vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-c-border">
          <h3 className="text-sm font-semibold text-c-text">Environments</h3>
          <button onClick={onClose} className="text-c-text3 hover:text-c-text">
            <X size={14} />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-c-border">
          {environments.length === 0 && (
            <p className="px-4 py-6 text-xs text-c-text3 text-center">
              No environments yet. Create one to add default headers like Authorization.
            </p>
          )}
          {environments.map((env) => {
            const headerCount = (env.headers ?? []).filter((h) => h.key.trim()).length;
            const isActive = env.id === activeEnvironmentId;
            return (
              <div key={env.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-c-hover">
                {/* Active indicator + select */}
                <button
                  onClick={() => setActiveEnvironment(isActive ? '' : env.id)}
                  title={isActive ? 'Deactivate' : 'Set active'}
                  className={`w-3 h-3 rounded-full border-2 shrink-0 transition-colors ${
                    isActive ? 'bg-green-400 border-green-400' : 'border-c-text3 hover:border-green-400'
                  }`}
                />

                {/* Name + header count */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium truncate ${isActive ? 'text-green-400' : 'text-c-text'}`} title={env.name}>
                      {env.name}
                    </span>
                    {isActive && (
                      <span className="text-[10px] text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">active</span>
                    )}
                  </div>
                  <p className="text-[10px] text-c-text3 mt-0.5">
                    {headerCount === 0 ? 'No headers' : `${headerCount} header${headerCount !== 1 ? 's' : ''}`}
                  </p>
                </div>

                {/* Actions */}
                {confirmDeleteId === env.id ? (
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-c-text2">Delete?</span>
                    <button
                      onClick={() => handleDelete(env.id)}
                      className="px-2 py-0.5 bg-c-accent text-white rounded text-[11px] hover:bg-c-accent2"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="px-2 py-0.5 border border-c-border text-c-text2 rounded text-[11px] hover:bg-c-hover"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { setEditing(env); setShowEditor(true); }}
                      title="Edit"
                      className="p-1.5 text-c-text3 hover:text-c-text hover:bg-c-border rounded"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(env.id)}
                      title="Delete"
                      className="p-1.5 text-c-text3 hover:text-c-accent hover:bg-c-border rounded"
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
        <div className="flex items-center justify-between px-4 py-3 border-t border-c-border">
          <p className="text-[10px] text-c-text3">Click ● to activate an environment</p>
          <button
            onClick={() => { setEditing(undefined); setShowEditor(true); }}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1 bg-c-accent text-white rounded hover:bg-c-accent2"
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

  const { open, toggle, close, triggerRef, menuRef, menuStyle } = usePortalMenu('right');
  const [showManager, setShowManager] = useState(false);

  useEffect(() => { loadEnvironments(); }, []);

  const active = environments.find((e) => e.id === activeEnvironmentId);

  return (
    <div className="relative">
      <button
        ref={triggerRef as React.RefObject<HTMLButtonElement>}
        onClick={toggle}
        className="flex items-center gap-1 px-2 py-1 bg-c-bg border border-c-border rounded text-xs text-c-text2 hover:border-c-text3 max-w-[160px]"
      >
        <span className={`w-2 h-2 rounded-full shrink-0 ${active ? 'bg-green-400' : 'bg-c-text3'}`} />
        <span className="truncate flex-1" title={active ? active.name : 'No Environment'}>{active ? active.name : 'No Environment'}</span>
        <ChevronDown size={11} className="shrink-0" />
      </button>

      {open && createPortal(
        <div ref={menuRef as React.RefObject<HTMLDivElement>} style={menuStyle} className="bg-c-panel border border-c-border rounded shadow-lg min-w-[200px]">
          {/* No env option */}
          <button
            onClick={() => { setActiveEnvironment(''); close(); }}
            className={`flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-c-hover ${!active ? 'text-c-accent' : 'text-c-text'}`}
          >
            {!active && <Check size={11} />}
            <span className={!active ? '' : 'ml-[15px]'}>No Environment</span>
          </button>

          {environments.map((env) => (
            <button
              key={env.id}
              onClick={() => { setActiveEnvironment(env.id); close(); }}
              className={`flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left hover:bg-c-hover ${
                activeEnvironmentId === env.id ? 'text-c-accent' : 'text-c-text'
              }`}
            >
              {activeEnvironmentId === env.id ? <Check size={11} /> : <span className="w-[11px]" />}
              <span className="truncate" title={env.name}>{env.name}</span>
            </button>
          ))}

          <div className="border-t border-c-border mt-1">
            <button
              onClick={() => { close(); setShowManager(true); }}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-c-text2 hover:text-c-text hover:bg-c-hover"
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

