import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { Wifi, WifiOff, ChevronDown, Lock, Unlock, AlertTriangle, X } from 'lucide-react';
import EnvSelector from '../Environments/EnvSelector';
import SettingsPanel from '../Settings/SettingsPanel';

const TLS_OPTIONS = [
  { value: 'none',          label: 'Plaintext (h2c)' },
  { value: 'system',        label: 'TLS (system CA)' },
  { value: 'insecure_skip', label: 'TLS (skip verify)' },
] as const;

type ConnStatus = 'disconnected' | 'idle' | 'connecting' | 'ready' | 'transient_failure';

const STATUS_DOT: Record<ConnStatus, { color: string; title: string; pulse?: boolean }> = {
  disconnected:      { color: 'bg-[#4a5568]',  title: 'Not connected' },
  idle:              { color: 'bg-yellow-400',  title: 'Connected (idle)', pulse: true },
  connecting:        { color: 'bg-yellow-400',  title: 'Connecting…',     pulse: true },
  ready:             { color: 'bg-green-400',   title: 'Connected and ready' },
  transient_failure: { color: 'bg-red-400',     title: 'Connection failed — retrying' },
};

function StatusDot({ status }: { status: ConnStatus }) {
  const { color, title, pulse } = STATUS_DOT[status] ?? STATUS_DOT.disconnected;
  return (
    <div
      title={title}
      className={`w-2 h-2 rounded-full ${color} ${pulse ? 'animate-pulse' : ''}`}
    />
  );
}

export default function ConnectionBar() {
  const {
    connectionConfig,
    isConnected,
    connectionStatus,
    connectionError,
    setConnectionConfig,
    connect,
    disconnect,
  } = useAppStore();

  const [tlsOpen, setTlsOpen] = useState(false);
  const [errorOpen, setErrorOpen] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const selectedTls = TLS_OPTIONS.find((o) => o.value === connectionConfig.tls) ?? TLS_OPTIONS[0];

  useEffect(() => {
    if (!errorOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (errorRef.current && !errorRef.current.contains(e.target as Node)) {
        setErrorOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [errorOpen]);

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-[#16213e] border-b border-[#2d3748]">
      {/* Target input */}
      <div className="flex items-center flex-1 min-w-0 bg-[#1a1a2e] border border-[#2d3748] rounded px-2 py-1 focus-within:border-[#e94560]">
        <input
          type="text"
          value={connectionConfig.target}
          onChange={(e) => setConnectionConfig({ target: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && !isConnected && connect()}
          placeholder="host:port"
          className="flex-1 bg-transparent text-[#e2e8f0] placeholder-[#4a5568] text-sm outline-none font-mono"
          spellCheck={false}
        />
      </div>

      {/* TLS dropdown */}
      <div className="relative">
        <button
          onClick={() => setTlsOpen((v) => !v)}
          className="flex items-center gap-1 px-2 py-1 bg-[#1a1a2e] border border-[#2d3748] rounded text-xs text-[#94a3b8] hover:border-[#4a5568] whitespace-nowrap"
        >
          {connectionConfig.tls === 'none' ? <Unlock size={12} /> : <Lock size={12} />}
          {selectedTls.label}
          <ChevronDown size={12} />
        </button>
        {tlsOpen && (
          <div className="absolute top-full left-0 mt-1 z-50 bg-[#16213e] border border-[#2d3748] rounded shadow-lg min-w-[170px]">
            {TLS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setConnectionConfig({ tls: opt.value }); setTlsOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-[#1e2132] ${connectionConfig.tls === opt.value ? 'text-[#e94560]' : 'text-[#e2e8f0]'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Connect / Disconnect */}
      <button
        onClick={() => isConnected ? disconnect() : connect()}
        className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
          isConnected ? 'bg-[#2d3748] text-[#e2e8f0] hover:bg-[#374151]' : 'bg-[#e94560] text-white hover:bg-[#c73652]'
        }`}
      >
        {isConnected ? <WifiOff size={13} /> : <Wifi size={13} />}
        {isConnected ? 'Disconnect' : 'Connect'}
      </button>

      {/* Connection status indicator */}
      <div ref={errorRef} className="relative flex items-center gap-1">
        <StatusDot status={connectionStatus} />
        {connectionError && (
          <>
            <button
              onClick={() => setErrorOpen((v) => !v)}
              className="text-[#e94560] hover:text-red-400 focus:outline-none"
              title="Click to see error details"
            >
              <AlertTriangle size={14} />
            </button>
            {errorOpen && (
              <div className="absolute top-full right-0 mt-2 z-50 w-96 max-w-[90vw] bg-[#16213e] border border-red-900/60 rounded shadow-xl">
                <div className="flex items-center justify-between px-3 py-2 border-b border-red-900/40">
                  <span className="text-xs font-medium text-[#e94560]">Connection Error</span>
                  <button
                    onClick={() => setErrorOpen(false)}
                    className="text-[#4a5568] hover:text-[#e2e8f0]"
                  >
                    <X size={12} />
                  </button>
                </div>
                <pre className="p-3 text-xs text-[#e94560] font-mono whitespace-pre-wrap break-all max-h-64 overflow-y-auto">
                  {connectionError}
                </pre>
              </div>
            )}
          </>
        )}
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-[#2d3748]" />

      {/* Environment selector */}
      <EnvSelector />

      {/* Settings */}
      <SettingsPanel />
    </div>
  );
}
