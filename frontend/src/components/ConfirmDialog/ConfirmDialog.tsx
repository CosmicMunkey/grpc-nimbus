import { createPortal } from 'react-dom';
import { useAppStore } from '../../store/appStore';

export default function ConfirmDialog() {
  const { confirmDialog, resolveConfirm } = useAppStore();
  if (!confirmDialog) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={() => resolveConfirm(false)} />
      {/* Dialog */}
      <div className="relative z-10 bg-[#16213e] border border-[#2d3748] rounded-lg shadow-xl p-5 w-80 max-w-[90vw]">
        <p className="text-sm text-[#e2e8f0] mb-5">{confirmDialog.message}</p>
        <div className="flex justify-end gap-2">
          <button
            autoFocus
            onClick={() => resolveConfirm(false)}
            className="px-3 py-1.5 text-xs rounded bg-[#2d3748] text-[#e2e8f0] hover:bg-[#374151]"
          >
            Cancel
          </button>
          <button
            onClick={() => resolveConfirm(true)}
            className="px-3 py-1.5 text-xs rounded bg-[#e94560] text-white hover:bg-[#c73652]"
          >
            Delete
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
