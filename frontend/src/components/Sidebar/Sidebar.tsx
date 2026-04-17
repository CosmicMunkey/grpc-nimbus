import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore, useActiveTab } from '../../store/appStore';
import { Collection, MethodInfo, SavedRequest, ServiceInfo } from '../../types';
import {
  ChevronRight, ChevronDown, Zap, ArrowLeftRight, ArrowDown, ArrowUp,
  FolderOpen, Folder, Trash2, Book, BookOpen, Download, Upload, MoreVertical, X, AlertTriangle, Pencil,
} from 'lucide-react';
import ProtosetLoader from '../ProtosetLoader/ProtosetLoader';
import { usePortalMenu } from '../../hooks/usePortalMenu';

function StreamBadge({ method }: { method: MethodInfo }) {
  const isDark = useAppStore(s => s.isDark);
  if (method.clientStreaming && method.serverStreaming)
    return <span title="Bidirectional streaming"><ArrowLeftRight size={11} className={isDark ? 'text-purple-400 shrink-0' : 'text-purple-600 shrink-0'} /></span>;
  if (method.clientStreaming)
    return <span title="Client streaming"><ArrowUp size={11} className={isDark ? 'text-blue-400 shrink-0' : 'text-blue-600 shrink-0'} /></span>;
  if (method.serverStreaming)
    return <span title="Server streaming"><ArrowDown size={11} className={isDark ? 'text-green-400 shrink-0' : 'text-green-600 shrink-0'} /></span>;
  return <span title="Unary"><Zap size={11} className={isDark ? 'text-yellow-400 shrink-0' : 'text-yellow-600 shrink-0'} /></span>;
}

function ServiceNode({ svc }: { svc: ServiceInfo }) {
  const [expanded, setExpanded] = useState(true);
  const { selectedMethod } = useActiveTab();
  const { openMethodInNewTab } = useAppStore();
  const shortName = svc.name.split('.').pop() ?? svc.name;

  if (svc.unresolvable) {
    return (
      <div
        className="flex items-center gap-1 w-full px-2 py-1 text-xs text-c-text3 rounded"
        title={`${svc.name} — descriptor unavailable via reflection. Load a .protoset or .proto file to use this service.`}
      >
        <AlertTriangle size={12} className="text-yellow-500 shrink-0" />
        <span className="font-semibold truncate opacity-60">{shortName}</span>
        <span className="ml-auto text-c-text3 text-[10px] opacity-60">no descriptor</span>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1 w-full px-2 py-1 text-xs text-c-text2 hover:text-c-text hover:bg-c-hover rounded transition-colors"
      >
        {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        <span className="font-semibold truncate" title={svc.name}>{shortName}</span>
        <span className="ml-auto text-c-text3 text-[10px]">{svc.methods.length}</span>
      </button>
      {expanded && (
        <div className="ml-3 space-y-0.5">
          {svc.methods.map((m) => {
            const active = selectedMethod?.fullName === m.fullName;
            return (
              <button
                key={m.fullName}
                onClick={() => openMethodInNewTab(m)}
                title={m.fullName}
                className={`flex items-center gap-1.5 w-full px-2 py-1 text-xs rounded transition-colors text-left ${
                  active ? 'bg-c-accent/20 text-c-accent' : 'text-c-text hover:bg-c-hover'
                }`}
              >
                <StreamBadge method={m} />
                <span className="truncate">{m.methodName}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CollectionMenu({ colId, colName }: { colId: string; colName: string }) {
  const { open, toggle, close, triggerRef, menuRef, menuStyle } = usePortalMenu('right');
  const { exportCollection, importCollection, deleteCollection } = useAppStore();

  return (
    <div className="relative">
      <button
        ref={triggerRef as React.RefObject<HTMLButtonElement>}
        onClick={(e) => { e.stopPropagation(); toggle(); }}
        className="hover:text-c-text p-0.5 rounded opacity-0 group-hover:opacity-100"
        title="Collection options"
      >
        <MoreVertical size={11} />
      </button>
      {open && createPortal(
        <div ref={menuRef as React.RefObject<HTMLDivElement>} style={menuStyle} className="bg-c-panel border border-c-border rounded shadow-lg w-44">
          <button
            onClick={() => { exportCollection(colId); close(); }}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-c-text hover:bg-c-hover"
          >
            <Download size={11} /> Export "{colName}"
          </button>
          <button
            onClick={() => { importCollection(); close(); }}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-c-text hover:bg-c-hover"
          >
            <Upload size={11} /> Import collection
          </button>
          <div className="border-t border-c-border my-0.5" />
          <button
            onClick={() => { deleteCollection(colId); close(); }}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-c-accent hover:bg-c-hover"
          >
            <Trash2 size={11} /> Delete
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}

function RenameRequestModal({
  name,
  setName,
  onClose,
  onSave,
}: {
  name: string;
  setName: (name: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return createPortal(
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-c-panel border border-c-border rounded-lg p-4 w-72 shadow-xl">
        <h3 className="text-sm font-semibold text-c-text mb-3">Rename Request</h3>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSave();
            if (e.key === 'Escape') onClose();
          }}
          placeholder="Request name"
          className="w-full bg-c-bg border border-c-border rounded px-2 py-1.5 text-xs text-c-text placeholder-c-text3 outline-none focus:border-c-accent"
        />
        <div className="flex gap-2 mt-4">
          <button
            onClick={onClose}
            className="flex-1 py-1.5 text-xs text-c-text2 border border-c-border rounded hover:bg-c-hover"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={!name.trim()}
            className="flex-1 py-1.5 text-xs bg-c-accent text-white rounded hover:bg-c-accent2 disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function CollectionsPanel() {
  const { collections, loadCollections, importCollection, openSavedRequest, deleteRequest, renameCollection, renameCollectionRequest } = useAppStore();
  const [expanded, setExpanded] = useState(true);
  const [collapsedCollections, setCollapsedCollections] = useState<Set<string>>(new Set());
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [renamingRequest, setRenamingRequest] = useState<{ colId: string; reqId: string } | null>(null);
  const [requestName, setRequestName] = useState('');

  React.useEffect(() => { loadCollections(); }, []);

  const startCollectionRename = (colId: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingRequest(null);
    setEditingCollectionId(colId);
    setEditValue(currentName);
  };

  const startRequestRename = (reqId: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const colId = (e.currentTarget as HTMLElement).dataset.collectionId;
    if (!colId) return;
    setEditingCollectionId(null);
    setRenamingRequest({ colId, reqId });
    setRequestName(currentName);
  };

  const commitCollectionRename = (colId: string) => {
    if (editValue.trim()) renameCollection(colId, editValue.trim());
    setEditingCollectionId(null);
  };

  const commitRename = () => {
    if (!renamingRequest || !requestName.trim()) return;
    renameCollectionRequest(renamingRequest.colId, renamingRequest.reqId, requestName.trim());
    setRenamingRequest(null);
  };

  const handleLoadRequest = async (col: Collection, req: SavedRequest) => {
    await openSavedRequest(col, req);
  };

  const toggleCollectionCollapsed = (colId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedCollections((prev) => {
      const next = new Set(prev);
      if (next.has(colId)) next.delete(colId);
      else next.add(colId);
      return next;
    });
  };

  return (
    <div className="border-t border-c-border">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1 w-full px-2 py-2 text-xs text-c-text2 hover:text-c-text"
      >
        {expanded ? <FolderOpen size={13} /> : <Folder size={13} />}
        <span className="font-semibold">Collections</span>
        <span className="ml-auto text-c-text3 text-[10px]">{collections.length}</span>
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>

      {expanded && (
        <div className="space-y-1 pb-2">
          {collections.length === 0 && (
            <p className="px-3 text-xs text-c-text3">No saved collections</p>
          )}
          {collections.map((col) => (
            <div key={col.id} className="px-2">
              <div className="flex items-center gap-1 text-xs text-c-text2 py-0.5 group">
                <button
                  onClick={(e) => toggleCollectionCollapsed(col.id, e)}
                  className="shrink-0 hover:text-c-text p-0.5 rounded"
                  title={collapsedCollections.has(col.id) ? 'Expand collection' : 'Collapse collection'}
                >
                  {collapsedCollections.has(col.id) ? <Book size={11} /> : <BookOpen size={11} />}
                </button>
                {editingCollectionId === col.id ? (
                  <input
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); commitCollectionRename(col.id); }
                      if (e.key === 'Escape') setEditingCollectionId(null);
                    }}
                    onBlur={() => commitCollectionRename(col.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 min-w-0 bg-c-bg border border-c-accent rounded px-1.5 py-0.5 text-xs text-c-text outline-none"
                  />
                ) : (
                  <>
                    <span
                      className="font-medium truncate flex-1"
                      title={`${col.name} — double-click to rename`}
                      onDoubleClick={(e) => startCollectionRename(col.id, col.name, e)}
                    >
                      {col.name}
                    </span>
                    <CollectionMenu colId={col.id} colName={col.name} />
                  </>
                )}
              </div>
              {!collapsedCollections.has(col.id) && (
                <div className="ml-3 space-y-0.5">
                  {(col.requests ?? []).map((req) => (
                    <div key={req.id} className="group flex items-center rounded hover:bg-c-hover">
                      <button
                        onClick={() => handleLoadRequest(col, req)}
                        className="flex items-center gap-1 flex-1 min-w-0 text-left text-xs text-c-text px-2 py-0.5 truncate"
                        title={req.name}
                      >
                        <Zap size={10} className="text-yellow-400 shrink-0" />
                        <span className="truncate" title={req.name}>{req.name}</span>
                      </button>
                      <button
                        data-collection-id={col.id}
                        onClick={(e) => startRequestRename(req.id, req.name, e)}
                        title="Rename request"
                        className="opacity-0 group-hover:opacity-100 shrink-0 px-1 py-0.5 text-c-text3 hover:text-c-text transition-opacity"
                      >
                        <Pencil size={10} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteRequest(col.id, req.id); }}
                        title="Delete request"
                        className="opacity-0 group-hover:opacity-100 shrink-0 px-1.5 py-0.5 text-c-text3 hover:text-c-accent transition-opacity"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Import button at bottom */}
          <button
            onClick={() => importCollection()}
            className="flex items-center gap-1.5 mx-2 mt-1 px-2 py-1 rounded border border-dashed border-c-border text-xs text-c-text3 hover:border-c-text3 hover:text-c-text2 w-[calc(100%-16px)]"
          >
            <Upload size={11} /> Import collection…
          </button>
        </div>
      )}
      {renamingRequest && (
        <RenameRequestModal
          name={requestName}
          setName={setRequestName}
          onClose={() => setRenamingRequest(null)}
          onSave={commitRename}
        />
      )}
    </div>
  );
}

export default function Sidebar() {
  const { services } = useAppStore();

  return (
    <aside className="flex flex-col h-full bg-c-panel overflow-hidden">
      <ProtosetLoader />
      <div className="flex-1 overflow-y-auto py-1 space-y-0.5">
        {services.length === 0 ? (
          <p className="px-3 py-4 text-xs text-c-text3 text-center">
            Load a .protoset or .proto file to browse services
          </p>
        ) : (
          services.map((svc) => <ServiceNode key={svc.name} svc={svc} />)
        )}
      </div>
      <CollectionsPanel />
    </aside>
  );
}
