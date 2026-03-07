import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { Upload, FileCode, Radio, FileType, RefreshCw } from 'lucide-react';

type LoadMode = 'protoset' | 'proto' | 'reflection';

export default function ProtosetLoader() {
  const { protosetPaths, loadProtosets, loadProtoFiles, loadViaReflection, isConnected } = useAppStore();
  const [mode, setMode] = useState<LoadMode>('protoset');
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const withLoading = async (fn: () => Promise<void>) => {
    setError(null);
    setLoading(true);
    try { await fn(); } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  };

  const handlePickFiles = () => {
    if (mode === 'protoset') {
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
    if (mode === 'protoset') withLoading(() => loadProtosets(paths));
    else withLoading(() => loadProtoFiles([], paths));
  };

  return (
    <div className="p-3 border-b border-[#2d3748]">
      {/* Mode tabs */}
      <div className="flex mb-2 rounded overflow-hidden border border-[#2d3748]">
        {([
          { id: 'protoset',   label: '.protoset', icon: <FileCode size={10} /> },
          { id: 'proto',      label: '.proto',    icon: <FileType size={10} /> },
          { id: 'reflection', label: 'Reflect',   icon: <Radio size={10} /> },
        ] as { id: LoadMode; label: string; icon: React.ReactNode }[]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setMode(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1 py-1 text-[10px] transition-colors ${
              mode === tab.id ? 'bg-[#e94560] text-white' : 'text-[#94a3b8] hover:bg-[#1e2132]'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {mode === 'reflection' ? (
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
            {loading ? 'Loading…' : `Drop ${mode === 'protoset' ? '.protoset' : '.proto'} files or click`}
          </span>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-[#e94560]">{error}</p>}

      {protosetPaths.length > 0 && (
        <div className="mt-2 space-y-0.5">
          {protosetPaths.map((p) => (
            <div key={p} className="flex items-center gap-1 text-xs text-[#94a3b8]">
              <FileCode size={11} className="shrink-0 text-[#e94560]" />
              <span className="truncate">{p.split(/[/\\]/).pop()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
