import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  onClose: () => void;
}

export default function AboutDialog({ onClose }: Props) {
  const [version, setVersion] = useState('dev');

  useEffect(() => {
    window.go?.main?.App?.GetVersion?.().then((v: string) => setVersion(v)).catch(() => {});

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 bg-c-panel border border-c-border rounded-lg shadow-xl p-8 w-80 max-w-[90vw] flex flex-col items-center gap-4">
        <img
          src="/appicon.png"
          alt="GRPC Nimbus"
          className="w-20 h-20 rounded-2xl"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        <div className="text-center">
          <div className="text-lg font-semibold text-c-text">GRPC Nimbus</div>
          <div className="text-xs text-c-text2 mt-1">{version}</div>
        </div>
        <div className="text-xs text-c-text2 text-center leading-relaxed">
          A cross-platform desktop gRPC client with first-class support for protoset files.
        </div>
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            window.runtime?.BrowserOpenURL('https://github.com/CosmicMunkey/grpc-nimbus');
          }}
          className="text-xs text-c-accent hover:text-c-accent2 underline"
        >
          github.com/CosmicMunkey/grpc-nimbus
        </a>
        <button
          onClick={onClose}
          className="mt-1 px-4 py-1.5 text-xs rounded bg-c-border text-c-text hover:bg-c-border/80"
        >
          Close
        </button>
      </div>
    </div>,
    document.body
  );
}
