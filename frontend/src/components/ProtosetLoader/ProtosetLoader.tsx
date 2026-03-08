import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { Upload, FileCode, Radio, FileType, RefreshCw, X, Trash2, ChevronDown, ChevronRight } from 'lucide-react';

type LoadMode = 'protoset' | 'proto' | 'reflection';

export default function ProtosetLoader() {
  const {
    protosetPaths, loadMode,
    loadProtosets, loadProtoFiles, loadViaReflection,
    clearLoadedProtos, reloadProtos, removeProtoPath,
    isConnected, showConfirm,
  } = useAppStore();
  const [tab, setTab] = useState<LoadMode>('protoset');
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const withLoading = async (fn: () => Promise<void>) => {
    setError(null);
    setLoading(true);
    try { await fn(); } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  };

  const handlePickFiles = () => {
    if (tab === 'protoset') {
      withLoading(async () => {
        const paths = await window.go.main.App.PickProtosetFiles();
        if (paths?.length) await loadProtosets(paths);
      });
    } else {
      withLoading(async () => {
        const paths = await window.go.main.App.PickProtoFiles();
        if (paths?.length) await loadProtoFiles([], paths);
      });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const paths = Array.from(e.dataTransfer.files).map(
      (f) => (f as File & { path?: string }).path ?? f.name
    );
    if (!paths.length) return;
    if (tab === 'protoset') withLoading(() => loadProtosets(paths));
    else withLoading(() => loadProtoFiles([], paths));
  };

  const handleReload = async () => {
    setError(null);
    setReloading(true);
    try { await reloadProtos(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setReloading(false); }
  };

  const handleRemove = async (path: string) => {
    const name = path.split(/[/\\]/).pop() ?? path;
    const confirmed = await showConfirm(`Remove "${name}" from loaded files?`);
    if (!confirmed) return;
    setError(null);
    try { await removeProtoPath(path); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
  };

  const handleClear = async () => {
    const confirmed = await showConfirm('Clear all loaded files? The service list will be reset.');
    if (!confirmed) return;
    setError(null);
    try { await clearLoadedProtos(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
  };

  // Determine if the active loaded mode matches a reloadable type
  const canReload = loadMode === 'protoset' || loadMode === 'proto';
  const hasLoaded = loadMode === 'reflection' || protosetPaths.length > 0;

  return (
    <div className="p-3 border-b border-[#2d3748]">
      {/* Mode tabs */}
      <div className="flex mb-2 rounded overflow-hidden border border-[#2d3748]">
        {([
          { id: 'protoset',   label: '.protoset', icon: <FileCode size={10} /> },
          { id: 'proto',      label: '.proto',    icon: <FileType size={10} /> },
          { id: 'reflection', label: 'Reflect',   icon: <Radio size={10} /> },
        ] as { id: LoadMode; label: string; icon: React.ReactNode }[]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1 py-1 text-[10px] transition-colors ${
              tab === t.id ? 'bg-[#e94560] text-white' : 'text-[#94a3b8] hover:bg-[#1e2132]'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'reflection' ? (
        <button
          onClick={() => withLoading(loadViaReflection)}
          disabled={!isConnected || loading}
          className="flex items-center justify-center gap-2 w-full py-2 rounded border border-dashed border-[#2d3748] text-xs text-[#94a3b8] hover:border-[#e94560] hover:text-[#e2e8f0] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Loading…' : isConnected ? 'Load from server reflection' : 'Connect first'}
        </button>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={handlePickFiles}
          className={`flex flex-col items-center justify-center gap-1 rounded border-2 border-dashed cursor-pointer py-3 transition-colors ${
            dragging ? 'border-[#e94560] bg-[#e94560]/10' : 'border-[#2d3748] hover:border-[#4a5568] hover:bg-[#1e2132]'
          }`}
        >
          {loading
            ? <RefreshCw size={16} className="text-[#94a3b8] animate-spin" />
            : <Upload size={16} className="text-[#94a3b8]" />}
          <span className="text-xs text-[#94a3b8]">
            {loading ? 'Loading…' : `Drop ${tab === 'protoset' ? '.protoset' : '.proto'} files or click`}
          </span>
        </div>
      )}

      {error && (
        <div className="mt-2 flex items-start gap-2 bg-[#2d1a1a] border border-[#e94560]/40 rounded px-3 py-2">
          <p className="flex-1 text-xs text-[#e94560] leading-relaxed">{error}</p>
          <button
            onClick={() => setError(null)}
            className="shrink-0 text-[#e94560]/60 hover:text-[#e94560] mt-0.5"
            title="Dismiss"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* ── Loaded files panel ────────────────────────────────────────────── */}
      {hasLoaded && (
        <div className="mt-2 border border-[#2d3748] rounded overflow-hidden">
          {/* Header row — click to collapse/expand */}
          <div
            className="flex items-center justify-between px-2 py-1 bg-[#1a1a2e] cursor-pointer select-none"
            onClick={() => setCollapsed((v) => !v)}
          >
            <div className="flex items-center gap-1 text-[#4a5568]">
              {collapsed
                ? <ChevronRight size={11} />
                : <ChevronDown size={11} />}
              <span className="text-[10px] font-medium uppercase tracking-wide">
                {loadMode === 'reflection' ? 'Loaded via reflection' : `Loaded (${protosetPaths.length})`}
              </span>
            </div>
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              {canReload && (
                <button
                  onClick={handleReload}
                  disabled={reloading}
                  title="Re-read files from disk (picks up regenerated protosets)"
                  className="flex items-center gap-1 text-[10px] text-[#94a3b8] hover:text-[#e2e8f0] px-1.5 py-0.5 rounded hover:bg-[#2d3748]"
                >
                  <RefreshCw size={10} className={reloading ? 'animate-spin' : ''} />
                  Reload
                </button>
              )}
              <button
                onClick={handleClear}
                title="Clear all loaded files"
                className="flex items-center gap-1 text-[10px] text-[#e94560]/70 hover:text-[#e94560] px-1.5 py-0.5 rounded hover:bg-[#2d3748]"
              >
                <Trash2 size={10} />
                Clear
              </button>
            </div>
          </div>

          {!collapsed && protosetPaths.length > 0 && (
            <div className="divide-y divide-[#2d3748]">
              {protosetPaths.map((p) => {
                const name = p.split(/[/\\]/).pop() ?? p;
                return (
                  <div key={p} className="flex items-center gap-1.5 px-2 py-1 group hover:bg-[#1e2132]">
                    <FileCode size={10} className="shrink-0 text-[#e94560]" />
                    <span className="flex-1 truncate text-[11px] text-[#94a3b8]" title={p}>{name}</span>
                    <button
                      onClick={() => handleRemove(p)}
                      title="Remove this file"
                      className="opacity-0 group-hover:opacity-100 text-[#4a5568] hover:text-[#e94560] transition-opacity"
                    >
                      <X size={10} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
