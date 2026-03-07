import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Settings, X } from 'lucide-react';
import { useAppStore } from '../../store/appStore';

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        checked ? 'bg-[#e94560]' : 'bg-[#2d3748]'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export default function SettingsPanel() {
  const [open, setOpen] = useState(false);
  const { confirmDeletes, setConfirmDeletes } = useAppStore();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Settings"
        className="p-1.5 text-[#4a5568] hover:text-[#94a3b8] rounded transition-colors"
      >
        <Settings size={15} />
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-[9000] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative z-10 bg-[#16213e] border border-[#2d3748] rounded-lg shadow-xl w-96 max-w-[90vw]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#2d3748]">
              <h2 className="text-sm font-semibold text-[#e2e8f0]">Settings</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-[#4a5568] hover:text-[#e2e8f0] rounded p-0.5"
              >
                <X size={14} />
              </button>
            </div>

            {/* Body */}
            <div className="px-4 py-4 space-y-4">
              {/* Behaviour section */}
              <div>
                <p className="text-xs font-medium text-[#4a5568] uppercase tracking-wider mb-3">Behaviour</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#e2e8f0]">Confirm before delete</p>
                    <p className="text-xs text-[#4a5568] mt-0.5">
                      Show a confirmation dialog before deleting requests, collections, and environments.
                    </p>
                  </div>
                  <Toggle checked={confirmDeletes} onChange={setConfirmDeletes} />
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
