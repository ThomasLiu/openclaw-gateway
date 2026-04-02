'use client';

import type { RightPanelTabId } from './right-panel/types';

interface TabDef {
  id: RightPanelTabId;
  label: string;
}

interface RightPanelTabBarProps {
  tabs: ReadonlyArray<TabDef>;
  activeTab: RightPanelTabId;
  onTabChange: (tabId: RightPanelTabId) => void;
}

export function RightPanelTabBar({ tabs, activeTab, onTabChange }: RightPanelTabBarProps) {
  return (
    <div className="flex-shrink-0 flex items-center overflow-x-auto min-w-0 border-b border-zinc-800 bg-zinc-900/80">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex-shrink-0 px-3 py-2 text-xs whitespace-nowrap border-b-2 transition-colors ${
            tab.id === activeTab
              ? 'border-green-500 text-white'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
