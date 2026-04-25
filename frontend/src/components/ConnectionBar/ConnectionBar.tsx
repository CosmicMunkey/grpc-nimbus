import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { Wifi, WifiOff, ChevronDown, Lock, Unlock, AlertTriangle, X, RefreshCw } from 'lucide-react';
import EnvSelector from '../Environments/EnvSelector';
import SettingsPanel from '../Settings/SettingsPanel';

const TLS_OPTIONS = [
  { value: 'none',   label: 'Plaintext (h2c)' },
  { value: 'system', label: 'TLS (system CA)' },
] as const;

type ConnStatus = 'disconnected' | 'idle' | 'connecting' | 'ready' | 'transient_failure';

const STATUS_DOT: Record<ConnStatus, { color: string; title: string; pulse?: boolean }> = {
  disconnected:      { color: 'bg-c-text3',  title: 'Not connected' },
  idle:              { color: 'bg-green-400',   title: 'Connected' },
  connecting:        { color: 'bg-yellow-400',  title: 'Connecting…',     pulse: true },
  ready:             { color: 'bg-green-400',   title: 'Connected' },
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
    connectionStatus,
    connectionError,
    setConnectionConfig,
    connect,
    disconnect,
  } = useAppStore();
  const effectiveConnected = connectionStatus !== 'disconnected';

  const [tlsOpen, setTlsOpen] = useState(false);
  const [errorOpen, setErrorOpen] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const tlsRef = useRef<HTMLDivElement>(null);

  // Track the config that was active when we last connected
  const connectedConfigRef = useRef<{ target: string; tls: string } | null>(null);
  const [isStale, setIsStale] = useState(false);

  // Snapshot config on connect; clear on disconnect
  useEffect(() => {
    if (effectiveConnected) {
      connectedConfigRef.current = { target: connectionConfig.target, tls: connectionConfig.tls };
      setIsStale(false);
    } else {
      connectedConfigRef.current = null;
      setIsStale(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveConnected]);

  // Check staleness whenever config changes while connected
  useEffect(() => {
    if (!effectiveConnected || !connectedConfigRef.current) return;
    const { target, tls } = connectedConfigRef.current;
    setIsStale(connectionConfig.target !== target || connectionConfig.tls !== tls);
  }, [connectionConfig.target, connectionConfig.tls, effectiveConnected]);

  const handleReconnect = async () => { await disconnect(); await connect(); };

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

  useEffect(() => {
    if (!tlsOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (tlsRef.current && !tlsRef.current.contains(e.target as Node)) {
        setTlsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [tlsOpen]);

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-c-panel border-b border-c-border">
      {/* Target input */}
      <div className="flex items-center flex-1 min-w-0 bg-c-bg border border-c-border rounded px-2 py-1 focus-within:border-c-accent">
        <input
          type="text"
          value={connectionConfig.target}
          onChange={(e) => setConnectionConfig({ target: e.target.value })}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            if (isStale) { void handleReconnect(); }
            else if (!effectiveConnected) { void connect(); }
          }}
          placeholder="host:port"
          className="flex-1 bg-transparent text-c-text placeholder-c-text3 text-sm outline-none font-mono"
          spellCheck={false}
        />
      </div>

      {/* TLS dropdown */}
      <div ref={tlsRef} className="relative">
        <button
          onClick={() => setTlsOpen((v) => !v)}
          className="flex items-center gap-1 px-2 py-1 bg-c-bg border border-c-border rounded text-xs text-c-text2 hover:border-c-text3 whitespace-nowrap"
        >
          {connectionConfig.tls === 'none' ? <Unlock size={12} /> : <Lock size={12} />}
          {selectedTls.label}
          <ChevronDown size={12} />
        </button>
        {tlsOpen && (
          <div className="absolute top-full left-0 mt-1 z-50 bg-c-panel border border-c-border rounded shadow-lg min-w-[170px]">
            {TLS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setConnectionConfig({ tls: opt.value }); setTlsOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-c-hover ${connectionConfig.tls === opt.value ? 'text-c-accent' : 'text-c-text'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Connect / Disconnect / Reconnect */}
      {isStale ? (
        <button
          onClick={() => { void handleReconnect(); }}
          title="Settings changed — click to reconnect with new config"
          disabled={connectionStatus === 'connecting'}
          className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 hover:bg-yellow-500/30"
        >
          <RefreshCw size={13} /> Reconnect
        </button>
      ) : (
        <button
          onClick={() => { void (effectiveConnected ? disconnect() : connect()); }}
          disabled={connectionStatus === 'connecting'}
          className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
            effectiveConnected ? 'bg-c-border text-c-text hover:bg-c-border' : 'bg-c-accent text-white hover:bg-c-accent2'
          }`}
        >
          {effectiveConnected ? <WifiOff size={13} /> : <Wifi size={13} />}
          {effectiveConnected ? 'Disconnect' : 'Connect'}
        </button>
      )}

      {/* Connection status indicator */}
      <div ref={errorRef} className="relative flex items-center gap-1">
        <StatusDot status={connectionStatus} />
        {connectionError && (
          <>
            <button
              onClick={() => setErrorOpen((v) => !v)}
              className="text-c-accent hover:text-red-400 focus:outline-none"
              title="Click to see error details"
            >
              <AlertTriangle size={14} />
            </button>
            {errorOpen && (
              <div className="absolute top-full right-0 mt-2 z-50 w-96 max-w-[90vw] bg-c-panel border border-red-900/60 rounded shadow-xl">
                <div className="flex items-center justify-between px-3 py-2 border-b border-red-900/40">
                  <span className="text-xs font-medium text-c-accent">Connection Error</span>
                  <button
                    onClick={() => setErrorOpen(false)}
                    className="text-c-text3 hover:text-c-text"
                  >
                    <X size={12} />
                  </button>
                </div>
                <pre className="p-3 text-xs text-c-accent font-mono whitespace-pre-wrap break-all max-h-64 overflow-y-auto">
                  {connectionError}
                </pre>
              </div>
            )}
          </>
        )}
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-c-border" />

      {/* Environment selector */}
      <EnvSelector />

      {/* Settings */}
      <SettingsPanel />
    </div>
  );
}
