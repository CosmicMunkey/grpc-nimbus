import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Settings, X } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { ThemeId, ThemeTokens, THEMES, DEFAULT_CUSTOM_THEME, FONT_SIZE_PRESETS } from '../../themes';

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

// ── Theme preset card ─────────────────────────────────────────────────────────

const THEME_META: { id: ThemeId; label: string }[] = [
  { id: 'nimbus',  label: 'Nimbus' },
  { id: 'dark',    label: 'Dark'   },
  { id: 'light',   label: 'Light'  },
  { id: 'custom',  label: 'Custom' },
];

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

function ThemeCard({
  id, label, active, onClick,
}: { id: ThemeId; label: string; active: boolean; onClick: () => void }) {
  const tokens = id === 'custom' ? DEFAULT_CUSTOM_THEME : THEMES[id as keyof typeof THEMES];
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-start px-3 py-2 rounded border text-left transition-colors ${
        active
          ? 'border-c-accent bg-c-hover'
          : 'border-c-border bg-c-input hover:bg-c-hover'
      }`}
    >
      <span className={`text-xs font-medium ${active ? 'text-c-accent' : 'text-c-text'}`}>{label}</span>
      <ThemeSwatches tokens={tokens} />
    </button>
  );
}

// ── Custom colour editor ───────────────────────────────────────────────────────

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

function CustomEditor({
  tokens, onChange,
}: { tokens: Partial<ThemeTokens>; onChange: (t: Partial<ThemeTokens>) => void }) {
  const merged = { ...DEFAULT_CUSTOM_THEME, ...tokens };
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3">
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
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export default function SettingsPanel() {
  const [open, setOpen] = useState(false);
  const { confirmDeletes, setConfirmDeletes, timestampInputLocal, setTimestampInputLocal, theme, customTheme, setTheme, fontSize, setFontSize } = useAppStore();

  // Local draft so colour picker changes apply live while custom is active
  const [draftCustom, setDraftCustom] = useState<Partial<ThemeTokens>>(customTheme);

  function handleThemeCardClick(id: ThemeId) {
    if (id === 'custom') {
      setTheme('custom', draftCustom);
    } else {
      setTheme(id);
    }
  }

  function handleCustomChange(tokens: Partial<ThemeTokens>) {
    setDraftCustom(tokens);
    setTheme('custom', tokens);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Settings"
        className="p-1.5 text-c-text3 hover:text-c-text2 rounded transition-colors"
      >
        <Settings size={15} />
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-[9000] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative z-10 bg-c-panel border border-c-border rounded-lg shadow-xl w-[520px] max-w-[90vw] max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-c-border sticky top-0 bg-c-panel z-10">
              <h2 className="text-sm font-semibold text-c-text">Settings</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-c-text3 hover:text-c-text rounded p-0.5"
              >
                <X size={14} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-6">
              {/* Appearance section */}
              <div>
                <p className="text-xs font-medium text-c-text3 uppercase tracking-wider mb-2">Appearance</p>
                <div className="grid grid-cols-4 gap-2">
                  {THEME_META.map(({ id, label }) => (
                    <ThemeCard
                      key={id}
                      id={id}
                      label={label}
                      active={theme === id}
                      onClick={() => handleThemeCardClick(id)}
                    />
                  ))}
                </div>
                {theme === 'custom' && (
                  <CustomEditor tokens={draftCustom} onChange={handleCustomChange} />
                )}
                <div className="flex items-center justify-between mt-3">
                  <div>
                    <p className="text-xs font-medium text-c-text">Font size</p>
                    <p className="text-[11px] text-c-text3 mt-0.5">Controls the base text size throughout the app.</p>
                  </div>
                  <div className="flex gap-1">
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
              </div>

              {/* Behavior section */}
              <div>
                <p className="text-xs font-medium text-c-text3 uppercase tracking-wider mb-2">Behavior</p>
                <div className="flex flex-col">
                  <div className="flex items-center justify-between py-3">
                    <div className="pr-4">
                      <p className="text-xs font-medium text-c-text">Confirm before delete</p>
                      <p className="text-[11px] text-c-text3 mt-0.5">Show a confirmation dialog before deleting requests, collections, and environments.</p>
                    </div>
                    <Toggle checked={confirmDeletes} onChange={setConfirmDeletes} />
                  </div>
                  <div className="flex items-center justify-between py-3 border-t border-c-border/40">
                    <div className="pr-4">
                      <p className="text-xs font-medium text-c-text">Enter timestamps in local time</p>
                      <p className="text-[11px] text-c-text3 mt-0.5">When on, timestamp fields accept local time and convert to UTC. When off, enter UTC directly.</p>
                    </div>
                    <Toggle checked={timestampInputLocal} onChange={setTimestampInputLocal} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
