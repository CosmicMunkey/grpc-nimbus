import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import Sidebar from './components/Sidebar/Sidebar';
import ConnectionBar from './components/ConnectionBar/ConnectionBar';
import RequestPanel from './components/RequestPanel/RequestPanel';
import ResponsePanel from './components/ResponsePanel/ResponsePanel';
import { useAppStore } from './store/appStore';

function ExportCollectionModal({ onClose }: { onClose: () => void }) {
  const { collections, exportCollection, loadCollections } = useAppStore();
  const [selectedId, setSelectedId] = useState(collections[0]?.id ?? '');

  useEffect(() => { loadCollections(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep selection in sync if collections load after mount
  useEffect(() => {
    if (!selectedId && collections[0]) setSelectedId(collections[0].id);
  }, [collections, selectedId]);

  const handleExport = async () => {
    if (selectedId) {
      await exportCollection(selectedId);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[#16213e] border border-[#2d3748] rounded-lg w-80 shadow-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[#e2e8f0]">Export Collection</h3>
          <button onClick={onClose} className="text-[#4a5568] hover:text-[#e2e8f0]">
            <X size={14} />
          </button>
        </div>

        {collections.length === 0 ? (
          <div>
            <p className="text-xs text-[#94a3b8] mb-4">
              No collections to export. Save some requests first using the <strong>Save</strong> button in the request panel.
            </p>
            <button
              onClick={onClose}
              className="w-full px-3 py-1.5 text-xs bg-[#1a1a2e] border border-[#2d3748] text-[#94a3b8] rounded hover:bg-[#2d3748]"
            >
              Close
            </button>
          </div>
        ) : (
          <div>
            <p className="text-xs text-[#94a3b8] mb-3">
              Protoset files are bundled into the export — recipients can import and use it without needing the original files.
            </p>
            <div className="space-y-1 mb-4 max-h-48 overflow-y-auto">
              {collections.map((col) => (
                <label
                  key={col.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-[#1e2132]"
                >
                  <input
                    type="radio"
                    name="exportCol"
                    value={col.id}
                    checked={selectedId === col.id}
                    onChange={() => setSelectedId(col.id)}
                    className="accent-[#e94560]"
                  />
                  <span className="text-xs text-[#e2e8f0] flex-1 truncate">{col.name}</span>
                  <span className="text-[10px] text-[#4a5568] shrink-0">
                    {col.requests?.length ?? 0} req{(col.requests?.length ?? 0) !== 1 ? 's' : ''}
                  </span>
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 px-3 py-1.5 text-xs bg-[#1a1a2e] border border-[#2d3748] text-[#94a3b8] rounded hover:bg-[#2d3748]"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                disabled={!selectedId}
                className="flex-1 px-3 py-1.5 text-xs bg-[#e94560] text-white rounded hover:bg-[#c73652] disabled:opacity-40"
              >
                Export…
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const { restoreLoadedState, importCollection } = useAppStore();
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    restoreLoadedState();

    // Listen for native File menu events (window.runtime is injected by Wails)
    const rt = window.runtime;
    if (!rt) return;
    const offImport = rt.EventsOn('menu:importCollection', () => {
      importCollection();
    });
    const offExport = rt.EventsOn('menu:exportCollection', () => {
      setShowExportModal(true);
    });

    return () => { offImport(); offExport(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col h-screen bg-[#1a1a2e] text-[#e2e8f0] overflow-hidden">
      {/* Top: connection bar */}
      <ConnectionBar />

      {/* Main content area */}
      <div className="flex flex-1 min-h-0">
        {/* Left: sidebar (service tree + collections) */}
        <Sidebar />

        {/* Right: request + response split pane */}
        <div className="flex flex-1 min-w-0 divide-x divide-[#2d3748]">
          {/* Request panel (left half) */}
          <div className="flex flex-col flex-1 min-w-0">
            <RequestPanel />
          </div>

          {/* Response panel (right half) */}
          <div className="flex flex-col flex-1 min-w-0">
            <ResponsePanel />
          </div>
        </div>
      </div>

      {showExportModal && <ExportCollectionModal onClose={() => setShowExportModal(false)} />}
    </div>
  );
}
