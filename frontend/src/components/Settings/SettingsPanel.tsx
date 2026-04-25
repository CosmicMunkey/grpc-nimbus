import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Settings, X, Palette, SlidersHorizontal, Send, Plus, Pencil, Trash2, Copy, Paintbrush, Globe, ArrowLeft } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { ThemeId, ThemeTokens, CustomThemeEntry, THEMES, DEFAULT_CUSTOM_THEME, FONT_SIZE_PRESETS } from '../../themes';
import { MetadataEntry, Environment } from '../../types';
import { TLS_OPTIONS } from '../Environments/EnvSelector';

// ── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full p-0.5 transition-colors ${
        checked ? 'bg-c-accent' : 'bg-c-border'
      }`}
    >
      <span
        className={`h-4 w-4 shrink-0 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

// ── Theme swatches preview ────────────────────────────────────────────────────

function ThemeSwatches({ tokens }: { tokens: Partial<ThemeTokens> }) {
  const t = { ...DEFAULT_CUSTOM_THEME, ...tokens };
  return (
    <div className="flex gap-0.5 mt-1">
      {([t.bg, t.panel, t.border, t.accent, t.text] as string[]).map((c, i) => (
        <span key={i} className="w-3 h-3 rounded-sm border border-white/10" style={{ background: c }} />
      ))}
    </div>
  );
}

// ── Preset theme card ─────────────────────────────────────────────────────────

const PRESET_META: { id: Exclude<ThemeId, 'custom'>; label: string; group?: string }[] = [
  { id: 'nimbus',       label: 'Nimbus'        },
  { id: 'dark',         label: 'Dark'          },
  { id: 'light',        label: 'Light'         },
  { id: 'deuteranopia', label: 'Deuteranopia',  group: 'colorblind' },
  { id: 'tritanopia',   label: 'Tritanopia',    group: 'colorblind' },
  { id: 'highcontrast', label: 'High Contrast', group: 'colorblind' },
];

function PresetCard({
  id, label, active, onSelect, onFork,
}: {
  id: Exclude<ThemeId, 'custom'>;
  label: string;
  active: boolean;
  onSelect: () => void;
  onFork: () => void;
}) {
  return (
    <div className={`flex flex-col px-2.5 py-2 rounded border transition-colors group relative ${
      active ? 'border-c-accent bg-c-hover' : 'border-c-border bg-c-input hover:bg-c-hover'
    }`}>
      <div className="flex items-center gap-1.5 w-full">
        <button
          onClick={onSelect}
          title={active ? 'Active' : 'Set active'}
          className={`w-3 h-3 rounded-full border-2 shrink-0 transition-colors ${
            active ? 'bg-c-accent border-c-accent' : 'border-c-text3 hover:border-c-accent'
          }`}
        />
        <button onClick={onSelect} className="flex-1 text-left min-w-0">
          <span className={`text-xs font-medium leading-tight ${active ? 'text-c-accent' : 'text-c-text'}`}>{label}</span>
        </button>
        <button
          onClick={onFork}
          title="Fork this theme"
          className="opacity-0 group-hover:opacity-100 p-0.5 text-c-text3 hover:text-c-text transition-opacity"
        >
          <Copy size={11} />
        </button>
      </div>
      <div className="pl-[18px]">
        <ThemeSwatches tokens={THEMES[id]} />
      </div>
    </div>
  );
}

// ── Custom theme card ─────────────────────────────────────────────────────────

function CustomThemeCard({
  entry, active, onActivate, onFork, onRename, onDelete, onEditTokens,
}: {
  entry: CustomThemeEntry;
  active: boolean;
  onActivate: () => void;
  onFork: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onEditTokens: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(entry.name);
  const inputRef = useRef<HTMLInputElement>(null);

  function commitRename() {
    if (draft.trim()) onRename(draft.trim());
    setEditing(false);
  }

  return (
    <div className={`flex flex-col px-2.5 py-2 rounded border transition-colors group relative ${
      active ? 'border-c-accent bg-c-hover' : 'border-c-border bg-c-input hover:bg-c-hover'
    }`}>
      <div className="flex items-center gap-1.5 w-full">
        <button
          onClick={onActivate}
          title={active ? 'Active' : 'Set active'}
          className={`w-3 h-3 rounded-full border-2 shrink-0 transition-colors ${
            active ? 'bg-c-accent border-c-accent' : 'border-c-text3 hover:border-c-accent'
          }`}
        />
        {editing ? (
          <input
            ref={inputRef}
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditing(false); }}
            className="flex-1 bg-c-bg border border-c-accent rounded px-1.5 py-0.5 text-xs text-c-text outline-none"
          />
        ) : (
          <button onClick={onActivate} className="flex-1 text-left min-w-0">
            <span className={`text-xs font-medium truncate block ${active ? 'text-c-accent' : 'text-c-text'}`}>
              {entry.name}
            </span>
          </button>
        )}
        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => { setDraft(entry.name); setEditing(true); }} title="Rename" className="p-0.5 text-c-text3 hover:text-c-text">
            <Pencil size={11} />
          </button>
          <button onClick={onFork} title="Duplicate" className="p-0.5 text-c-text3 hover:text-c-text">
            <Copy size={11} />
          </button>
          <button onClick={onDelete} title="Delete" className="p-0.5 text-c-text3 hover:text-c-accent">
            <Trash2 size={11} />
          </button>
        </div>
      </div>
      <button onClick={onEditTokens} className="text-left pl-[18px]">
        <ThemeSwatches tokens={entry.tokens} />
      </button>
    </div>
  );
}

// ── Color token editor ─────────────────────────────────────────────────────────

const TOKEN_LABELS: { key: keyof ThemeTokens; label: string }[] = [
  { key: 'bg',      label: 'Background'     },
  { key: 'panel',   label: 'Panel'          },
  { key: 'input',   label: 'Input'          },
  { key: 'hover',   label: 'Hover'          },
  { key: 'border',  label: 'Border'         },
  { key: 'text',    label: 'Text'           },
  { key: 'text2',   label: 'Text secondary' },
  { key: 'text3',   label: 'Text dim'       },
  { key: 'accent',  label: 'Accent'         },
  { key: 'accent2', label: 'Accent hover'   },
];

function TokenEditor({
  tokens, onChange, onClose,
}: {
  tokens: Partial<ThemeTokens>;
  onChange: (t: Partial<ThemeTokens>) => void;
  onClose: () => void;
}) {
  const merged = { ...DEFAULT_CUSTOM_THEME, ...tokens };
  return (
    <div className="mt-2 border border-c-border rounded p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-c-text3 font-medium uppercase tracking-wider">Edit colors</span>
        <button onClick={onClose} className="text-c-text3 hover:text-c-text p-0.5"><X size={11} /></button>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {TOKEN_LABELS.map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 cursor-pointer">
            <input
              type="color"
              value={merged[key]}
              onChange={(e) => onChange({ ...tokens, [key]: e.target.value })}
              className="w-6 h-6 rounded cursor-pointer border border-c-border bg-c-input p-0"
            />
            <span className="text-xs text-c-text2">{label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

// ── Themes section ────────────────────────────────────────────────────────────

function ThemesSection() {
  const { theme, customThemes, activeCustomThemeId, setTheme, forkTheme, updateCustomTheme, renameCustomTheme, deleteCustomTheme } = useAppStore();
  const [editingTokensId, setEditingTokensId] = useState<string | null>(null);

  function handlePresetSelect(id: Exclude<ThemeId, 'custom'>) {
    setTheme(id);
    setEditingTokensId(null);
  }

  function handleCustomActivate(id: string) {
    setTheme('custom', id);
    setEditingTokensId(null);
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Preset themes */}
        <div>
          <p className="text-xs font-medium text-c-text3 uppercase tracking-wider mb-2">Presets</p>
          <div className="grid grid-cols-3 gap-2">
            {PRESET_META.filter((p) => !p.group).map(({ id, label }) => (
              <PresetCard
                key={id}
                id={id}
                label={label}
                active={theme === id}
                onSelect={() => handlePresetSelect(id)}
                onFork={() => forkTheme(id)}
              />
            ))}
          </div>
        </div>

        {/* Colorblind-friendly themes */}
        <div>
          <p className="text-xs font-medium text-c-text3 uppercase tracking-wider mb-2">Colorblind-friendly</p>
          <div className="grid grid-cols-3 gap-2">
            {PRESET_META.filter((p) => p.group === 'colorblind').map(({ id, label }) => (
              <PresetCard
                key={id}
                id={id}
                label={label}
                active={theme === id}
                onSelect={() => handlePresetSelect(id)}
                onFork={() => forkTheme(id)}
              />
            ))}
          </div>
        </div>

        {/* Custom themes */}
        <div>
          <p className="text-xs font-medium text-c-text3 uppercase tracking-wider mb-2">Custom themes</p>
          {customThemes.length === 0 ? (
            <p className="text-xs text-c-text3">No custom themes yet — create one below or fork a preset using the copy icon.</p>
          ) : (
            <div className="space-y-2">
              {customThemes.map((entry) => (
                <div key={entry.id}>
                  <CustomThemeCard
                    entry={entry}
                    active={theme === 'custom' && activeCustomThemeId === entry.id}
                    onActivate={() => handleCustomActivate(entry.id)}
                    onFork={() => forkTheme(entry.id)}
                    onRename={(name) => renameCustomTheme(entry.id, name)}
                    onDelete={() => deleteCustomTheme(entry.id)}
                    onEditTokens={() => setEditingTokensId(editingTokensId === entry.id ? null : entry.id)}
                  />
                  {editingTokensId === entry.id && (
                    <TokenEditor
                      tokens={entry.tokens}
                      onChange={(tokens) => updateCustomTheme(entry.id, tokens)}
                      onClose={() => setEditingTokensId(null)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-c-border shrink-0">
        <p className="text-[10px] text-c-text3">Tip: use the copy icon on any preset or custom theme to fork it</p>
        <button
          onClick={() => forkTheme('nimbus')}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1 bg-c-accent text-white rounded hover:bg-c-accent2"
        >
          <Plus size={11} /> New Theme
        </button>
      </div>
    </div>
  );
}

// ── Appearance section ────────────────────────────────────────────────────────

function AppearanceSection() {
  const { fontSize, setFontSize, responseWordWrap, setResponseWordWrap, responseIndent, setResponseIndent } = useAppStore();

  return (
    <div className="space-y-5">
      {/* Font size */}
      <div className="space-y-2">
        <div>
          <p className="text-xs font-medium text-c-text">Font size</p>
          <p className="text-[11px] text-c-text3 mt-0.5">Controls the base text size throughout the app.</p>
        </div>
        <div className="flex gap-1 flex-wrap">
          {FONT_SIZE_PRESETS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setFontSize(value)}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                fontSize === value
                  ? 'bg-c-accent text-white'
                  : 'bg-c-input text-c-text2 hover:bg-c-hover hover:text-c-text border border-c-border'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Response word wrap */}
      <div className="flex items-center justify-between py-3 border-t border-c-border/40">
        <div className="pr-4">
          <p className="text-xs font-medium text-c-text">Response word wrap</p>
          <p className="text-[11px] text-c-text3 mt-0.5">Wrap long lines in stream message and history response panels.</p>
        </div>
        <Toggle checked={responseWordWrap} onChange={setResponseWordWrap} />
      </div>

      {/* JSON indent */}
      <div className="flex items-center justify-between py-3 border-t border-c-border/40">
        <div className="pr-4">
          <p className="text-xs font-medium text-c-text">JSON indent</p>
          <p className="text-[11px] text-c-text3 mt-0.5">Spaces used for pretty-printing JSON in stream and history panels.</p>
        </div>
        <div className="flex gap-1">
          {[2, 4].map((n) => (
            <button
              key={n}
              onClick={() => setResponseIndent(n)}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                responseIndent === n
                  ? 'bg-c-accent text-white'
                  : 'bg-c-input text-c-text2 hover:bg-c-hover hover:text-c-text border border-c-border'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Behavior section ──────────────────────────────────────────────────────────

const HISTORY_LIMIT_OPTIONS: { label: string; value: number }[] = [
  { label: '25',  value: 25  },
  { label: '50',  value: 50  },
  { label: '100', value: 100 },
  { label: '200', value: 200 },
  { label: '∞',   value: -1  },
];

function BehaviorSection() {
  const {
    confirmDeletes, setConfirmDeletes,
    confirmClearHistory, setConfirmClearHistory,
    timestampInputLocal, setTimestampInputLocal,
    autoConnectOnStartup, setAutoConnectOnStartup,
    historyLimit, setHistoryLimit,
  } = useAppStore();
  return (
    <div className="flex flex-col divide-y divide-c-border/40">
      <div className="flex items-center justify-between py-3">
        <div className="pr-4">
          <p className="text-xs font-medium text-c-text">Confirm before delete</p>
          <p className="text-[11px] text-c-text3 mt-0.5">Show a confirmation dialog before deleting requests, collections, and environments.</p>
        </div>
        <Toggle checked={confirmDeletes} onChange={setConfirmDeletes} />
      </div>
      <div className="flex items-center justify-between py-3">
        <div className="pr-4">
          <p className="text-xs font-medium text-c-text">Confirm before clearing history</p>
          <p className="text-[11px] text-c-text3 mt-0.5">Show a confirmation dialog before clearing request history for a method.</p>
        </div>
        <Toggle checked={confirmClearHistory} onChange={setConfirmClearHistory} />
      </div>
      <div className="flex items-center justify-between py-3">
        <div className="pr-4">
          <p className="text-xs font-medium text-c-text">Enter timestamps in local time</p>
          <p className="text-[11px] text-c-text3 mt-0.5">When on, timestamp fields accept local time and convert to UTC. When off, enter UTC directly.</p>
        </div>
        <Toggle checked={timestampInputLocal} onChange={setTimestampInputLocal} />
      </div>
      <div className="flex items-center justify-between py-3">
        <div className="pr-4">
          <p className="text-xs font-medium text-c-text">Auto-connect on startup</p>
          <p className="text-[11px] text-c-text3 mt-0.5">Automatically reconnect to the last used target when the app launches.</p>
        </div>
        <Toggle checked={autoConnectOnStartup} onChange={setAutoConnectOnStartup} />
      </div>
      <div className="flex items-start justify-between py-3">
        <div className="pr-4">
          <p className="text-xs font-medium text-c-text">History limit per method</p>
          <p className="text-[11px] text-c-text3 mt-0.5">Maximum number of past requests to keep per gRPC method. ∞ keeps all.</p>
        </div>
        <div className="flex gap-1 shrink-0">
          {HISTORY_LIMIT_OPTIONS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setHistoryLimit(value)}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                historyLimit === value
                  ? 'bg-c-accent text-white'
                  : 'bg-c-input text-c-text2 hover:bg-c-hover hover:text-c-text border border-c-border'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Requests section ──────────────────────────────────────────────────────────

const MAX_STREAM_OPTIONS: { label: string; value: number }[] = [
  { label: '100', value: 100  },
  { label: '200', value: 200  },
  { label: '500', value: 500  },
  { label: '∞',   value: -1   },
];

function RequestsSection() {
  const {
    defaultTimeoutSeconds, setDefaultTimeoutSeconds,
    maxStreamMessages, setMaxStreamMessages,
    allowShellCommands, setAllowShellCommands,
    defaultMetadata, setDefaultMetadata,
  } = useAppStore();

  const handleAddMetadata = () => {
    setDefaultMetadata([...defaultMetadata, { key: '', value: '' }]);
  };

  const handleMetadataChange = (i: number, field: 'key' | 'value', v: string) => {
    const updated = defaultMetadata.map((e, idx) => idx === i ? { ...e, [field]: v } : e);
    setDefaultMetadata(updated);
  };

  const handleMetadataRemove = (i: number) => {
    setDefaultMetadata(defaultMetadata.filter((_, idx) => idx !== i));
  };

  return (
    <div className="flex flex-col divide-y divide-c-border/40">
      {/* Default timeout */}
      <div className="flex items-center justify-between py-3">
        <div className="pr-4">
          <p className="text-xs font-medium text-c-text">Default timeout</p>
          <p className="text-[11px] text-c-text3 mt-0.5">Pre-fill the timeout field on new tabs. 0 means no timeout.</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <input
            type="number"
            min={0}
            step={1}
            value={defaultTimeoutSeconds}
            onChange={(e) => setDefaultTimeoutSeconds(Math.max(0, Number(e.target.value)))}
            className="w-16 px-2 py-1 rounded border border-c-border bg-c-input text-c-text text-xs text-right focus:outline-none focus:border-c-accent"
          />
          <span className="text-xs text-c-text3">s</span>
        </div>
      </div>

      {/* Max stream messages */}
      <div className="flex items-start justify-between py-3">
        <div className="pr-4">
          <p className="text-xs font-medium text-c-text">Max stream messages</p>
          <p className="text-[11px] text-c-text3 mt-0.5">Maximum number of stream events kept in memory per stream. ∞ keeps all.</p>
        </div>
        <div className="flex gap-1 shrink-0">
          {MAX_STREAM_OPTIONS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setMaxStreamMessages(value)}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                maxStreamMessages === value
                  ? 'bg-c-accent text-white'
                  : 'bg-c-input text-c-text2 hover:bg-c-hover hover:text-c-text border border-c-border'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Shell command interpolation */}
      <div className="flex items-center justify-between py-3">
        <div className="pr-4">
          <p className="text-xs font-medium text-c-text">Allow shell commands in metadata</p>
          <p className="text-[11px] text-c-text3 mt-0.5">Enables $(command) interpolation in metadata values. Keep off unless you trust the source.</p>
        </div>
        <Toggle checked={allowShellCommands} onChange={setAllowShellCommands} />
      </div>

      {/* Default metadata */}
      <div className="py-3 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-c-text">Default metadata</p>
            <p className="text-[11px] text-c-text3 mt-0.5">Headers sent with every request. Overridden by environment and per-request metadata.</p>
          </div>
          <button
            onClick={handleAddMetadata}
            className="flex items-center gap-1 text-xs text-c-text2 hover:text-c-text px-1.5 py-0.5 rounded hover:bg-c-hover border border-c-border"
          >
            <Plus size={11} /> Add
          </button>
        </div>
        {defaultMetadata.length === 0 ? (
          <p className="text-xs text-c-text3">No default metadata — click Add to create a header.</p>
        ) : (
          <div className="space-y-1">
            {defaultMetadata.map((entry, i) => {
              const dynamic = entry.value.includes('${') || entry.value.includes('$(');
              return (
                <div key={i} className="flex gap-1.5 items-center">
                  <input
                    type="text"
                    placeholder="key"
                    value={entry.key}
                    onChange={(e) => handleMetadataChange(i, 'key', e.target.value)}
                    onBlur={() => setDefaultMetadata(defaultMetadata)}
                    className="flex-1 min-w-0 px-2 py-1 rounded border border-c-border bg-c-input text-c-text text-xs font-mono focus:outline-none focus:border-c-accent"
                  />
                  <span className="text-c-text3 text-sm shrink-0">:</span>
                  <div className="relative flex-1 min-w-0">
                    <input
                      type="text"
                      placeholder="value"
                      value={entry.value}
                      onChange={(e) => handleMetadataChange(i, 'value', e.target.value)}
                      onBlur={() => setDefaultMetadata(defaultMetadata)}
                      className={`w-full px-2 py-1 rounded border border-c-border bg-c-input text-c-text text-xs font-mono focus:outline-none focus:border-c-accent ${dynamic ? 'pr-6' : ''}`}
                    />
                    {dynamic && (
                      <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] font-mono text-c-accent bg-c-accent/10 px-1 rounded leading-tight pointer-events-none">$</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleMetadataRemove(i)}
                    className="p-1 text-c-text3 hover:text-c-accent rounded transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <p className="text-[10px] text-c-text3 leading-relaxed">
          Values support <span className="font-mono text-c-accent/80">${'{VAR}'}</span> (OS env variable) and <span className="font-mono text-c-accent/80">$(command)</span> (shell output when enabled above) — resolved fresh on each send.
        </p>
      </div>
    </div>
  );
}

// ── Environments section ──────────────────────────────────────────────────────

// ── Inline Environment Editor ────────────────────────────────────────────────

interface InlineEnvEditorProps {
  initial?: Environment;
  onBack: () => void;
}

function InlineEnvEditor({ initial, onBack }: InlineEnvEditorProps) {
  const { saveEnvironment } = useAppStore();
  const [name, setName] = useState(initial?.name ?? '');
  const [target, setTarget] = useState(initial?.target ?? '');
  const [tls, setTls] = useState<string>(initial?.tls ?? 'none');
  const [rows, setRows] = useState<{ key: string; value: string }[]>(
    initial?.headers?.length
      ? initial.headers.map((h) => ({ key: h.key, value: h.value }))
      : [{ key: '', value: '' }]
  );

  const updateRow = (i: number, field: 'key' | 'value', val: string) =>
    setRows((r) => r.map((row, idx) => idx === i ? { ...row, [field]: val } : row));
  const addRow = () => setRows((r) => [...r, { key: '', value: '' }]);
  const removeRow = (i: number) =>
    setRows((r) => (r.length > 1 ? r.filter((_, idx) => idx !== i) : [{ key: '', value: '' }]));

  const handleSave = async () => {
    if (!name.trim()) return;
    const now = new Date().toISOString();
    await saveEnvironment({
      id: initial?.id ?? crypto.randomUUID(),
      name: name.trim(),
      target: target.trim() || undefined,
      tls: target.trim() ? tls : undefined,
      headers: rows.filter((h) => h.key.trim()),
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
    });
    onBack();
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-c-border shrink-0">
        <button onClick={onBack} className="p-1 text-c-text3 hover:text-c-text rounded hover:bg-c-hover">
          <ArrowLeft size={14} />
        </button>
        <span className="text-sm font-medium text-c-text">
          {initial ? 'Edit Environment' : 'New Environment'}
        </span>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-c-text2 font-medium">Name</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Production"
            className="bg-c-bg border border-c-border rounded px-3 py-2 text-sm text-c-text placeholder-c-text3 outline-none focus:border-c-accent"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-c-text2 font-medium">
            Connection <span className="text-c-text3 font-normal">(optional)</span>
          </label>
          <div className="flex gap-2">
            <input
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="host:port"
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

        <div className="flex flex-col gap-2">
          <label className="text-xs text-c-text2 font-medium">Default Headers</label>
          <div className="space-y-2">
            {rows.map((row, i) => {
              const dynamic = row.value.includes('${') || row.value.includes('$(');
              return (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={row.key}
                    onChange={(e) => updateRow(i, 'key', e.target.value)}
                    placeholder="Header-Name"
                    className="w-2/5 bg-c-bg border border-c-border rounded px-3 py-2 text-sm text-c-text placeholder-c-text3 outline-none focus:border-c-accent font-mono"
                  />
                  <span className="text-c-text3 text-sm shrink-0">:</span>
                  <div className="relative flex-1">
                    <input
                      value={row.value}
                      onChange={(e) => updateRow(i, 'value', e.target.value)}
                      placeholder="value or ${VAR}"
                      className={`w-full bg-c-bg border border-c-border rounded px-3 py-2 text-sm text-c-text placeholder-c-text3 outline-none focus:border-c-accent font-mono ${dynamic ? 'pr-7' : ''}`}
                    />
                    {dynamic && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-c-accent bg-c-accent/10 px-1 rounded leading-tight pointer-events-none">$</span>
                    )}
                  </div>
                  <button
                    onClick={() => removeRow(i)}
                    className="shrink-0 text-c-text3 hover:text-c-accent p-1 rounded hover:bg-c-hover"
                  >
                    <X size={13} />
                  </button>
                </div>
              );
            })}
          </div>
          <button
            onClick={addRow}
            className="flex items-center gap-1.5 self-start text-xs text-c-text2 hover:text-c-text px-2 py-1 rounded hover:bg-c-hover"
          >
            <Plus size={11} /> Add header
          </button>
          <p className="text-[10px] text-c-text3 leading-relaxed">
            Values support dynamic syntax — <span className="font-mono text-c-accent/80">${'{MY_VAR}'}</span> reads an OS environment variable, <span className="font-mono text-c-accent/80">$(command)</span> runs a shell command and uses its output.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex gap-2 px-5 py-3 border-t border-c-border shrink-0">
        <button onClick={onBack} className="flex-1 py-2 text-xs text-c-text2 border border-c-border rounded hover:bg-c-hover">
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!name.trim()}
          className="flex-1 py-2 text-xs bg-c-accent text-white rounded hover:bg-c-accent2 disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </div>
  );
}

// ── Environments List ─────────────────────────────────────────────────────────

function EnvironmentsSection() {
  const { environments, activeEnvironmentId, setActiveEnvironment, deleteEnvironment } = useAppStore();
  const [editingEnv, setEditingEnv] = useState<Environment | undefined>(undefined);
  const [showEditor, setShowEditor] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    await deleteEnvironment(id);
    setConfirmDeleteId(null);
  };

  if (showEditor) {
    return (
      <InlineEnvEditor
        initial={editingEnv}
        onBack={() => { setShowEditor(false); setEditingEnv(undefined); }}
      />
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y divide-c-border">
        {environments.length === 0 && (
          <p className="px-5 py-6 text-xs text-c-text3 text-center">
            No environments yet. Create one to add default headers like Authorization.
          </p>
        )}
        {environments.map((env) => {
          const headerCount = (env.headers ?? []).filter((h) => h.key.trim()).length;
          const isActive = env.id === activeEnvironmentId;
          return (
            <div key={env.id} className="flex items-center gap-3 px-5 py-3 hover:bg-c-hover">
              <button
                onClick={() => setActiveEnvironment(isActive ? '' : env.id)}
                title={isActive ? 'Deactivate' : 'Set active'}
                className={`w-3 h-3 rounded-full border-2 shrink-0 transition-colors ${
                  isActive ? 'bg-green-400 border-green-400' : 'border-c-text3 hover:border-green-400'
                }`}
              />
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
                  {[
                    env.target && <span key="target" className="font-mono">{env.target}</span>,
                    headerCount > 0 && `${headerCount} header${headerCount !== 1 ? 's' : ''}`,
                  ].filter(Boolean).reduce<React.ReactNode[]>((acc, item, i) => {
                    if (i > 0) acc.push(' · ');
                    acc.push(item);
                    return acc;
                  }, []) || 'No connection or headers'}
                </p>
              </div>
              {confirmDeleteId === env.id ? (
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-c-text2">Delete?</span>
                  <button onClick={() => handleDelete(env.id)} className="px-2 py-0.5 bg-c-accent text-white rounded text-[11px] hover:bg-c-accent2">Yes</button>
                  <button onClick={() => setConfirmDeleteId(null)} className="px-2 py-0.5 border border-c-border text-c-text2 rounded text-[11px] hover:bg-c-hover">No</button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setEditingEnv(env); setShowEditor(true); }}
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
      <div className="flex items-center justify-between px-5 py-3 border-t border-c-border shrink-0">
        <p className="text-[10px] text-c-text3">Click ● to activate an environment</p>
        <button
          onClick={() => { setEditingEnv(undefined); setShowEditor(true); }}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1 bg-c-accent text-white rounded hover:bg-c-accent2"
        >
          <Plus size={11} /> New Environment
        </button>
      </div>
    </div>
  );
}

// ── Category nav ──────────────────────────────────────────────────────────────

type Category = 'appearance' | 'themes' | 'behavior' | 'requests' | 'environments';

const CATEGORIES: { id: Category; label: string; icon: React.ReactNode }[] = [
  { id: 'appearance',   label: 'Appearance',   icon: <Palette size={14} /> },
  { id: 'themes',       label: 'Themes',       icon: <Paintbrush size={14} /> },
  { id: 'behavior',     label: 'Behavior',     icon: <SlidersHorizontal size={14} /> },
  { id: 'requests',     label: 'Requests',     icon: <Send size={14} /> },
  { id: 'environments', label: 'Environments', icon: <Globe size={14} /> },
];

// ── Main panel ────────────────────────────────────────────────────────────────

export default function SettingsPanel() {
  const { settingsOpen, settingsTarget, openSettings, closeSettings } = useAppStore();
  const [category, setCategory] = useState<Category>('appearance');

  // When the panel opens with a target tab, switch to it
  useEffect(() => {
    if (settingsOpen && settingsTarget) {
      const valid = CATEGORIES.find((c) => c.id === settingsTarget);
      if (valid) setCategory(valid.id);
    }
  }, [settingsOpen, settingsTarget]);

  return (
    <>
      <button
        onClick={() => openSettings('appearance')}
        title="Settings"
        className="p-1.5 text-c-text3 hover:text-c-text2 rounded transition-colors"
      >
        <Settings size={15} />
      </button>

      {settingsOpen && createPortal(
        <div className="fixed inset-0 z-[9000] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={closeSettings} />
          <div className="relative z-10 bg-c-panel border border-c-border rounded-lg shadow-xl w-[780px] max-w-[95vw] h-[640px] max-h-[85vh] flex overflow-hidden">
            {/* Left category nav */}
            <div className="w-44 shrink-0 border-r border-c-border bg-c-bg flex flex-col py-3">
              <p className="px-4 pb-2 text-[10px] font-semibold text-c-text3 uppercase tracking-wider">Settings</p>
              {CATEGORIES.map(({ id, label, icon }) => (
                <button
                  key={id}
                  onClick={() => setCategory(id)}
                  className={`flex items-center gap-2.5 px-4 py-2 text-xs transition-colors ${
                    category === id
                      ? 'text-c-text bg-c-hover border-r-2 border-c-accent'
                      : 'text-c-text2 hover:text-c-text hover:bg-c-hover/50'
                  }`}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>

            {/* Right content */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-c-border">
                <h2 className="text-sm font-semibold text-c-text capitalize">{category}</h2>
                <button onClick={closeSettings} className="text-c-text3 hover:text-c-text rounded p-0.5">
                  <X size={14} />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                {category !== 'environments' && category !== 'themes' && (
                  <div className="flex-1 overflow-y-auto px-5 py-4">
                    {category === 'appearance'   && <AppearanceSection />}
                    {category === 'behavior'     && <BehaviorSection />}
                    {category === 'requests'     && <RequestsSection />}
                  </div>
                )}
                {category === 'themes'       && <ThemesSection />}
                {category === 'environments' && <EnvironmentsSection />}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
