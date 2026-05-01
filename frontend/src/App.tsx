import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import Sidebar from './components/Sidebar/Sidebar';
import ConnectionBar from './components/ConnectionBar/ConnectionBar';
import TabBar from './components/TabBar/TabBar';
import RequestPanel from './components/RequestPanel/RequestPanel';
import ResponsePanel from './components/ResponsePanel/ResponsePanel';
import ConfirmDialog from './components/ConfirmDialog/ConfirmDialog';
import SettingsPanel from './components/Settings/SettingsPanel';
import AboutDialog from './components/AboutDialog/AboutDialog';
import HelpDialog from './components/HelpDialog/HelpDialog';
import { useAppStore } from './store/appStore';

function ExportCollectionModal({ onClose }: { onClose: () => void }) {
  const { collections, exportCollection, loadCollections } = useAppStore();
  const [selectedId, setSelectedId] = useState(collections[0]?.id ?? '');

  useEffect(() => { loadCollections(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep selection in sync if collections load after mount
  useEffect(() => {
    if (!selectedId || !collections.find(c => c.id === selectedId)) {
      if (collections[0]) setSelectedId(collections[0].id);
    }
  }, [collections, selectedId]);

  const handleExport = async () => {
    if (selectedId) {
      await exportCollection(selectedId);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-c-panel border border-c-border rounded-lg w-80 shadow-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-c-text">Export Collection</h3>
          <button onClick={onClose} className="text-c-text3 hover:text-c-text">
            <X size={14} />
          </button>
        </div>

        {collections.length === 0 ? (
          <div>
            <p className="text-xs text-c-text2 mb-4">
              No collections to export. Save some requests first using the <strong>Save</strong> button in the request panel.
            </p>
            <button
              onClick={onClose}
              className="w-full px-3 py-1.5 text-xs bg-c-bg border border-c-border text-c-text2 rounded hover:bg-c-border"
            >
              Close
            </button>
          </div>
        ) : (
          <div>
            <p className="text-xs text-c-text2 mb-3">
              Protoset files are bundled into the export — recipients can import and use it without needing the original files.
            </p>
            <div className="space-y-1 mb-4 max-h-48 overflow-y-auto">
              {collections.map((col) => (
                <label
                  key={col.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-c-hover"
                >
                  <input
                    type="radio"
                    name="exportCol"
                    value={col.id}
                    checked={selectedId === col.id}
                    onChange={() => setSelectedId(col.id)}
                    className="accent-c-accent"
                  />
                  <span className="text-xs text-c-text flex-1 truncate">{col.name}</span>
                  <span className="text-[10px] text-c-text3 shrink-0">
                    {col.requests?.length ?? 0} req{(col.requests?.length ?? 0) !== 1 ? 's' : ''}
                  </span>
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 px-3 py-1.5 text-xs bg-c-bg border border-c-border text-c-text2 rounded hover:bg-c-border"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                disabled={!selectedId}
                className="flex-1 px-3 py-1.5 text-xs bg-c-accent text-white rounded hover:bg-c-accent2 disabled:opacity-40"
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

function ColumnResizer({ onDrag }: { onDrag: (startX: number, currentX: number, phase: 'start' | 'move' | 'end') => void }) {
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => { cleanupRef.current?.(); };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const startX = e.clientX;
    onDrag(startX, startX, 'start');
    const onMove = (ev: PointerEvent) => onDrag(startX, ev.clientX, 'move');
    const cleanup = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      cleanupRef.current = null;
    };
    const onUp = (ev: PointerEvent) => {
      cleanup();
      onDrag(startX, ev.clientX, 'end');
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    cleanupRef.current = cleanup;
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      className="w-1 shrink-0 cursor-col-resize bg-c-border hover:bg-c-accent/30 transition-colors"
    />
  );
}

export default function App() {
  const { restoreLoadedState, importCollection, sidebarWidth, panelSplit, setSidebarWidth, setPanelSplit } = useAppStore();
  const [showExportModal, setShowExportModal] = useState(false);
  const [showAboutDialog, setShowAboutDialog] = useState(false);
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const sidebarStartRef = useRef(0);
  const splitStartRef = useRef(0);
  const splitContainerRef = useRef<HTMLDivElement>(null);

  const handleSidebarDrag = useCallback((startX: number, currentX: number, phase: 'start' | 'move' | 'end') => {
    if (phase === 'start') sidebarStartRef.current = useAppStore.getState().sidebarWidth;
    const newWidth = Math.max(180, Math.min(500, sidebarStartRef.current + (currentX - startX)));
    useAppStore.setState({ sidebarWidth: newWidth });
    if (phase === 'end') setSidebarWidth(newWidth);
  }, [setSidebarWidth]);

  const handlePanelDrag = useCallback((startX: number, currentX: number, phase: 'start' | 'move' | 'end') => {
    if (phase === 'start') splitStartRef.current = useAppStore.getState().panelSplit;
    const containerWidth = splitContainerRef.current?.offsetWidth ?? 1;
    const newSplit = Math.max(0.2, Math.min(0.8, splitStartRef.current + (currentX - startX) / containerWidth));
    useAppStore.setState({ panelSplit: newSplit });
    if (phase === 'end') setPanelSplit(newSplit);
  }, [setPanelSplit]);

  useEffect(() => {
    restoreLoadedState();

    const rt = window.runtime;
    if (!rt) return;

    const offImport = rt.EventsOn('menu:importCollection', () => importCollection());
    const offExport = rt.EventsOn('menu:exportCollection', () => setShowExportModal(true));

    // Zoom — adjust root font size in 10% increments
    const STEP = 0.1;
    const getZoom = () => parseFloat(document.documentElement.style.fontSize || '100') / 100;
    const offZoomIn    = rt.EventsOn('menu:zoomIn',    () => {
      const next = Math.min(2.0, getZoom() + STEP);
      document.documentElement.style.fontSize = `${Math.round(next * 100)}%`;
    });
    const offZoomOut   = rt.EventsOn('menu:zoomOut',   () => {
      const next = Math.max(0.5, getZoom() - STEP);
      document.documentElement.style.fontSize = `${Math.round(next * 100)}%`;
    });
    const offZoomReset = rt.EventsOn('menu:zoomReset', () => {
      document.documentElement.style.fontSize = '';
    });

    // Tab management — read latest tabs/activeTabId via store getState() to avoid stale closure
    const { getState } = useAppStore;
    const offNewTab   = rt.EventsOn('menu:newTab',   () => getState().newTab());
    const offCloseTab = rt.EventsOn('menu:closeTab', () => {
      const { tabs: t, activeTabId: aid } = getState();
      const idx = t.findIndex((tab) => tab.id === aid);
      if (idx !== -1) getState().closeTab(t[idx].id);
    });
    const offNextTab  = rt.EventsOn('menu:nextTab',  () => {
      const { tabs: t, activeTabId: aid, setActiveTab: sat } = getState();
      if (t.length === 0) return;
      const idx = t.findIndex((tab) => tab.id === aid);
      sat(t[(idx + 1) % t.length].id);
    });
    const offPrevTab  = rt.EventsOn('menu:prevTab',  () => {
      const { tabs: t, activeTabId: aid, setActiveTab: sat } = getState();
      if (t.length === 0) return;
      const idx = t.findIndex((tab) => tab.id === aid);
      sat(t[(idx - 1 + t.length) % t.length].id);
    });

    const offAbout = rt.EventsOn('menu:about', () => setShowAboutDialog(true));
    const offHelp  = rt.EventsOn('menu:help',  () => setShowHelpDialog(true));
    const offCloseAllTabs = rt.EventsOn('menu:closeAllTabs', () => getState().closeAllTabs());

    return () => {
      offImport(); offExport();
      offZoomIn(); offZoomOut(); offZoomReset();
      offNewTab(); offCloseTab(); offNextTab(); offPrevTab();
      offAbout(); offHelp(); offCloseAllTabs();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col h-screen bg-c-bg text-c-text overflow-hidden">
      {/* Top: connection bar */}
      <ConnectionBar />

      {/* Main content area */}
      <div className="flex flex-1 min-h-0">
        {/* Left: sidebar (service tree + collections) */}
        <div style={{ width: sidebarWidth }} className="shrink-0 min-w-0">
          <Sidebar />
        </div>

        {/* Sidebar resize handle */}
        <ColumnResizer onDrag={handleSidebarDrag} />

        {/* Right: tab bar + request/response split pane */}
        <div className="flex flex-col flex-1 min-w-0 min-h-0">
          <TabBar />
          <div ref={splitContainerRef} className="flex flex-1 min-h-0">
            {/* Request panel */}
            <div style={{ flex: panelSplit }} className="flex flex-col min-w-0">
              <RequestPanel />
            </div>

            {/* Panel split resize handle */}
            <ColumnResizer onDrag={handlePanelDrag} />

            {/* Response panel */}
            <div style={{ flex: 1 - panelSplit }} className="flex flex-col min-w-0">
              <ResponsePanel />
            </div>
          </div>
        </div>
      </div>

      {showExportModal && <ExportCollectionModal onClose={() => setShowExportModal(false)} />}
      {showAboutDialog && <AboutDialog onClose={() => setShowAboutDialog(false)} />}
      {showHelpDialog  && <HelpDialog  onClose={() => setShowHelpDialog(false)} />}
      <ConfirmDialog />
    </div>
  );
}
