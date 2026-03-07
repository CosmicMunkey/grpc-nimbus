import React, { useCallback, useRef, useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { Upload, FileCode, X } from 'lucide-react';

export default function ProtosetLoader() {
  const { protosetPaths, loadProtosets } = useAppStore();
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handlePaths = useCallback(
    async (paths: string[]) => {
      setError(null);
      try {
        await loadProtosets(paths);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [loadProtosets]
  );

  // Wails injects a file dialog; on web/dev we fall back to input element.
  const openFilePicker = () => inputRef.current?.click();

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    // In Wails runtime, we can get full OS paths via the file object.
    // During dev (browser), we only get the filename.
    const paths = files.map((f) => (f as File & { path?: string }).path ?? f.name);
    await handlePaths(paths);
    e.target.value = '';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    const paths = files.map((f) => (f as File & { path?: string }).path ?? f.name);
    await handlePaths(paths);
  };

  return (
    <div className="p-3 border-b border-[#2d3748]">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={openFilePicker}
        className={`flex flex-col items-center justify-center gap-1 rounded border-2 border-dashed cursor-pointer py-3 transition-colors ${
          dragging
            ? 'border-[#e94560] bg-[#e94560]/10'
            : 'border-[#2d3748] hover:border-[#4a5568] hover:bg-[#1e2132]'
        }`}
      >
        <Upload size={18} className="text-[#94a3b8]" />
        <span className="text-xs text-[#94a3b8]">Drop .protoset files or click to browse</span>
      </div>

      {error && (
        <p className="mt-2 text-xs text-[#e94560]">{error}</p>
      )}

      {protosetPaths.length > 0 && (
        <div className="mt-2 space-y-1">
          {protosetPaths.map((p) => (
            <div key={p} className="flex items-center gap-1 text-xs text-[#94a3b8]">
              <FileCode size={12} className="shrink-0 text-[#e94560]" />
              <span className="truncate">{p.split(/[/\\]/).pop()}</span>
            </div>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".protoset,.pb,.bin"
        multiple
        className="hidden"
        onChange={handleFileInput}
      />
    </div>
  );
}
