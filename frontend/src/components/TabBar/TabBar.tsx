import React, { useRef, useState } from 'react';
import { Plus, X, Copy } from 'lucide-react';
import { useAppStore } from '../../store/appStore';

export default function TabBar() {
  const { tabs, activeTabId, newTab, closeTab, setActiveTab, duplicateTab, renameRequest } = useAppStore();
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = (tabId: string, currentLabel: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTabId(tabId);
    setEditValue(currentLabel);
    // Focus happens via autoFocus on the input
  };

  const commitEdit = (tabId: string) => {
    const val = editValue.trim();
    if (val) renameRequest(tabId, val);
    setEditingTabId(null);
  };

  return (
    <div className="flex items-stretch bg-[#1a1a2e] border-b border-[#2d3748] shrink-0 overflow-x-auto">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        const isEditing = editingTabId === tab.id;
        return (
          <div
            key={tab.id}
            onClick={() => !isEditing && setActiveTab(tab.id)}
            className={`group relative flex items-center gap-1.5 px-3 py-2 text-xs cursor-pointer border-r border-[#2d3748] shrink-0 max-w-[200px] min-w-[100px] select-none transition-colors ${
              isActive
                ? 'bg-[#16213e] text-[#e2e8f0]'
                : 'text-[#94a3b8] hover:bg-[#1e2132] hover:text-[#e2e8f0]'
            }`}
          >
            {/* Active indicator */}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#e94560]" />
            )}

            {isEditing ? (
              <input
                ref={inputRef}
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); commitEdit(tab.id); }
                  if (e.key === 'Escape') { setEditingTabId(null); }
                }}
                onBlur={() => commitEdit(tab.id)}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 min-w-0 bg-[#1a1a2e] border border-[#e94560] rounded px-1 py-0 text-[11px] text-[#e2e8f0] outline-none"
              />
            ) : (
              <span
                className="truncate flex-1 text-[11px]"
                title={tab.savedRequestId ? `${tab.label} — double-click to rename` : tab.label}
                onDoubleClick={(e) => startEdit(tab.id, tab.label, e)}
              >
                {tab.label}
              </span>
            )}

            {/* Per-tab controls, visible on hover */}
            {!isEditing && (
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); duplicateTab(tab.id); }}
                  title="Duplicate tab"
                  className="text-[#4a5568] hover:text-[#94a3b8] rounded p-0.5"
                >
                  <Copy size={9} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                  title="Close tab"
                  className="text-[#4a5568] hover:text-[#e94560] rounded p-0.5"
                >
                  <X size={10} />
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* New tab button */}
      <button
        onClick={newTab}
        title="New tab"
        className="flex items-center px-3 text-[#4a5568] hover:text-[#e2e8f0] hover:bg-[#1e2132] shrink-0 transition-colors"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
