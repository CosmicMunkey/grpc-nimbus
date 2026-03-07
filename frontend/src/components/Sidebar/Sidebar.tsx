import React, { useRef, useState } from 'react';
import { useAppStore, useActiveTab } from '../../store/appStore';
import { MethodInfo, MetadataEntry, ServiceInfo } from '../../types';
import {
  ChevronRight, ChevronDown, Zap, ArrowLeftRight, ArrowDown, ArrowUp,
  FolderOpen, Folder, Trash2, BookOpen, Download, Upload, MoreVertical, X,
} from 'lucide-react';
import ProtosetLoader from '../ProtosetLoader/ProtosetLoader';

function StreamBadge({ method }: { method: MethodInfo }) {
  if (method.clientStreaming && method.serverStreaming)
    return <span title="Bidirectional streaming"><ArrowLeftRight size={11} className="text-purple-400 shrink-0" /></span>;
  if (method.clientStreaming)
    return <span title="Client streaming"><ArrowUp size={11} className="text-blue-400 shrink-0" /></span>;
  if (method.serverStreaming)
    return <span title="Server streaming"><ArrowDown size={11} className="text-green-400 shrink-0" /></span>;
  return <span title="Unary"><Zap size={11} className="text-yellow-400 shrink-0" /></span>;
}

function ServiceNode({ svc }: { svc: ServiceInfo }) {
  const [expanded, setExpanded] = useState(true);
  const { selectedMethod } = useActiveTab();
  const { openMethodInNewTab } = useAppStore();
  const shortName = svc.name.split('.').pop() ?? svc.name;

  return (
    <div>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1 w-full px-2 py-1 text-xs text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[#1e2132] rounded transition-colors"
      >
        {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        <span className="font-semibold truncate" title={svc.name}>{shortName}</span>
        <span className="ml-auto text-[#4a5568] text-[10px]">{svc.methods.length}</span>
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
                  active ? 'bg-[#e94560]/20 text-[#e94560]' : 'text-[#e2e8f0] hover:bg-[#1e2132]'
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
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { exportCollection, importCollection, deleteCollection } = useAppStore();

  React.useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="hover:text-[#e2e8f0] p-0.5 rounded opacity-0 group-hover:opacity-100"
        title="Collection options"
      >
        <MoreVertical size={11} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-[#16213e] border border-[#2d3748] rounded shadow-lg w-44">
          <button
            onClick={() => { exportCollection(colId); setOpen(false); }}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-[#e2e8f0] hover:bg-[#1e2132]"
          >
            <Download size={11} /> Export "{colName}"
          </button>
          <button
            onClick={() => { importCollection(); setOpen(false); }}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-[#e2e8f0] hover:bg-[#1e2132]"
          >
            <Upload size={11} /> Import collection
          </button>
          <div className="border-t border-[#2d3748] my-0.5" />
          <button
            onClick={() => { deleteCollection(colId); setOpen(false); }}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-[#e94560] hover:bg-[#1e2132]"
          >
            <Trash2 size={11} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

function CollectionsPanel() {
  const { collections, loadCollections, importCollection, services, openMethodInNewTab, deleteRequest, renameCollectionRequest } = useAppStore();
  const [expanded, setExpanded] = useState(true);
  const [editingReqId, setEditingReqId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  React.useEffect(() => { loadCollections(); }, []);

  const startRename = (reqId: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingReqId(reqId);
    setEditValue(currentName);
  };

  const commitRename = (colId: string, reqId: string) => {
    if (editValue.trim()) renameCollectionRequest(colId, reqId, editValue.trim());
    setEditingReqId(null);
  };

  const handleLoadRequest = (methodPath: string, requestJson?: string, metadata?: MetadataEntry[], reqId?: string, reqName?: string) => {
    for (const svc of services) {
      const m = svc.methods.find((m) => m.fullName === methodPath);
      if (m) { openMethodInNewTab(m, requestJson, metadata, reqId, reqName); return; }
    }
  };

  return (
    <div className="border-t border-[#2d3748]">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1 w-full px-2 py-2 text-xs text-[#94a3b8] hover:text-[#e2e8f0]"
      >
        {expanded ? <FolderOpen size={13} /> : <Folder size={13} />}
        <span className="font-semibold">Collections</span>
        <span className="ml-auto text-[#4a5568] text-[10px]">{collections.length}</span>
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>

      {expanded && (
        <div className="space-y-1 pb-2">
          {collections.length === 0 && (
            <p className="px-3 text-xs text-[#4a5568]">No saved collections</p>
          )}
          {collections.map((col) => (
            <div key={col.id} className="px-2">
              <div className="flex items-center gap-1 text-xs text-[#94a3b8] py-0.5 group">
                <BookOpen size={11} />
                <span className="font-medium truncate flex-1">{col.name}</span>
                <CollectionMenu colId={col.id} colName={col.name} />
              </div>
              <div className="ml-3 space-y-0.5">
                {(col.requests ?? []).map((req) => (
                  <div key={req.id} className="group flex items-center rounded hover:bg-[#1e2132]">
                    {editingReqId === req.id ? (
                      <input
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); commitRename(col.id, req.id); }
                          if (e.key === 'Escape') setEditingReqId(null);
                        }}
                        onBlur={() => commitRename(col.id, req.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 min-w-0 mx-2 my-0.5 bg-[#1a1a2e] border border-[#e94560] rounded px-1.5 py-0.5 text-xs text-[#e2e8f0] outline-none"
                      />
                    ) : (
                      <button
                        onClick={() => handleLoadRequest(req.methodPath, req.requestJson, req.metadata, req.id, req.name)}
                        onDoubleClick={(e) => startRename(req.id, req.name, e)}
                        className="flex items-center gap-1 flex-1 min-w-0 text-left text-xs text-[#e2e8f0] px-2 py-0.5 truncate"
                        title="Click to open · Double-click to rename"
                      >
                        <Zap size={10} className="text-yellow-400 shrink-0" />
                        <span className="truncate">{req.name}</span>
                      </button>
                    )}
                    {editingReqId !== req.id && (
                      <button
                        onClick={() => deleteRequest(col.id, req.id)}
                        title="Delete request"
                        className="opacity-0 group-hover:opacity-100 shrink-0 px-1.5 py-0.5 text-[#4a5568] hover:text-[#e94560] transition-opacity"
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Import button at bottom */}
          <button
            onClick={() => importCollection()}
            className="flex items-center gap-1.5 mx-2 mt-1 px-2 py-1 rounded border border-dashed border-[#2d3748] text-xs text-[#4a5568] hover:border-[#4a5568] hover:text-[#94a3b8] w-[calc(100%-16px)]"
          >
            <Upload size={11} /> Import collection…
          </button>
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const { services } = useAppStore();

  return (
    <aside className="flex flex-col h-full bg-[#16213e] border-r border-[#2d3748] w-64 shrink-0 overflow-hidden">
      <div className="px-3 py-2 border-b border-[#2d3748]">
        <h1 className="text-sm font-bold text-[#e2e8f0] tracking-wide">GRPC Nimbus</h1>
        <p className="text-[10px] text-[#4a5568]">gRPC Client</p>
      </div>
      <ProtosetLoader />
      <div className="flex-1 overflow-y-auto py-1 space-y-0.5">
        {services.length === 0 ? (
          <p className="px-3 py-4 text-xs text-[#4a5568] text-center">
            Load a .protoset file to browse services
          </p>
        ) : (
          services.map((svc) => <ServiceNode key={svc.name} svc={svc} />)
        )}
      </div>
      <CollectionsPanel />
    </aside>
  );
}
