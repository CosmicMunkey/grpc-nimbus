import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../../store/appStore';

export default function ConfirmDialog() {
  const { confirmDialog, resolveConfirm } = useAppStore();

  useEffect(() => {
    if (!confirmDialog) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') resolveConfirm(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [confirmDialog, resolveConfirm]);

  if (!confirmDialog) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={() => resolveConfirm(false)} />
      {/* Dialog */}
      <div className="relative z-10 bg-c-panel border border-c-border rounded-lg shadow-xl p-5 w-80 max-w-[90vw]">
        <p className="text-sm text-c-text mb-5">{confirmDialog.message}</p>
        <div className="flex justify-end gap-2">
          <button
            autoFocus
            onClick={() => resolveConfirm(false)}
            className="px-3 py-1.5 text-xs rounded bg-c-border text-c-text hover:bg-c-border"
          >
            Cancel
          </button>
          <button
            onClick={() => resolveConfirm(true)}
            className="px-3 py-1.5 text-xs rounded bg-c-accent text-white hover:bg-c-accent2"
          >
            Delete
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
