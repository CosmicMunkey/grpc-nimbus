import React from 'react';
import { Plus, X, Copy } from 'lucide-react';
import { useAppStore } from '../../store/appStore';

export default function TabBar() {
  const { tabs, activeTabId, newTab, closeTab, setActiveTab, duplicateTab } = useAppStore();

  return (
    <div className="flex items-stretch bg-[#1a1a2e] border-b border-[#2d3748] shrink-0 overflow-x-auto">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`group relative flex items-center gap-1.5 px-3 py-2 text-xs cursor-pointer border-r border-[#2d3748] shrink-0 max-w-[200px] min-w-[100px] select-none transition-colors ${
              isActive
                ? 'bg-[#16213e] text-[#e2e8f0] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#e94560]'
                : 'text-[#94a3b8] hover:bg-[#1e2132] hover:text-[#e2e8f0]'
            }`}
          >
            {/* Active indicator line rendered via Tailwind after: pseudo — fallback inline */}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#e94560]" />
            )}

            <span className="truncate flex-1 text-[11px]" title={tab.label}>
              {tab.label}
            </span>

            {/* Per-tab controls, visible on hover */}
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); duplicateTab(tab.id); }}
                title="Duplicate tab"
                className="text-[#4a5568] hover:text-[#94a3b8] rounded p-0.5"
              >
                <Copy size={9} />
              </button>
              {tabs.length > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                  title="Close tab"
                  className="text-[#4a5568] hover:text-[#e94560] rounded p-0.5"
                >
                  <X size={10} />
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* New tab button */}
      <button
        onClick={newTab}
        title="New tab  (opens a blank request)"
        className="flex items-center px-3 text-[#4a5568] hover:text-[#e2e8f0] hover:bg-[#1e2132] shrink-0 transition-colors"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
