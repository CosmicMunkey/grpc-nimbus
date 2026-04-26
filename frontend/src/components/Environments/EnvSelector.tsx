import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../../store/appStore';
import { Environment } from '../../types';
import { Plus, X, Check, ChevronDown, Settings, Lock, Unlock } from 'lucide-react';
import { usePortalMenu } from '../../hooks/usePortalMenu';

export const TLS_OPTIONS = [
  { value: 'none',   label: 'No TLS',      Icon: Unlock },
  { value: 'system', label: 'TLS (System)', Icon: Lock   },
] as const;

// ─── Environment Editor Modal ────────────────────────────────────────────────

interface EnvEditorProps {
  initial?: Environment;
  onClose: () => void;
}

export function EnvEditor({ initial, onClose }: EnvEditorProps) {
  const { saveEnvironment } = useAppStore();
  const [name, setName] = useState(initial?.name ?? '');
  const [target, setTarget] = useState(initial?.target ?? '');
  const [tls, setTls] = useState<string>(initial?.tls ?? 'none');
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
      target: target.trim() || undefined,
      tls: target.trim() ? tls : undefined,
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

        {/* Optional connection config */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-c-text2 font-medium">Connection <span className="text-c-text3 font-normal">(optional — applied when environment is activated)</span></span>
          <div className="flex gap-2">
            <input
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="host:port (optional)"
              className="flex-1 bg-c-bg border border-c-border rounded px-3 py-2 text-sm text-c-text placeholder-c-text3 outline-none focus:border-c-accent font-mono"
            />
            <select
              value={tls}
              onChange={(e) => setTls(e.target.value)}
              disabled={!target.trim()}
              className="bg-c-bg border border-c-border rounded px-2 py-2 text-xs text-c-text outline-none focus:border-c-accent disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {TLS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

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

// ─── Environment Selector Dropdown ───────────────────────────────────────────

export default function EnvSelector() {
  const {
    environments,
    activeEnvironmentId,
    loadEnvironments,
    setActiveEnvironment,
    openSettings,
  } = useAppStore();

  const { open, toggle, close, triggerRef, menuRef, menuStyle } = usePortalMenu('right');

  useEffect(() => { loadEnvironments(); }, [loadEnvironments]);

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
              onClick={() => { close(); openSettings('environments'); }}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-c-text2 hover:text-c-text hover:bg-c-hover"
            >
              <Settings size={11} /> Manage Environments…
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
