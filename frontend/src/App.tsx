import React, { useEffect } from 'react';
import Sidebar from './components/Sidebar/Sidebar';
import ConnectionBar from './components/ConnectionBar/ConnectionBar';
import RequestPanel from './components/RequestPanel/RequestPanel';
import ResponsePanel from './components/ResponsePanel/ResponsePanel';
import { useAppStore } from './store/appStore';

export default function App() {
  const { restoreLoadedState } = useAppStore();

  // Restore protoset paths and last-used connection on first load
  useEffect(() => {
    restoreLoadedState();
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
    </div>
  );
}
