import React from 'react';
import { Layers, CalendarCheck2, Store, Gauge } from 'lucide-react';

export type ActiveTab = 'budget' | 'timeline' | 'vendors' | 'simulator';

interface NavigationTabsProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  taskCount: number;
  vendorSlotCount: number;
}

export const NavigationTabs: React.FC<NavigationTabsProps> = ({
  activeTab,
  onTabChange,
  taskCount,
  vendorSlotCount,
}) => {
  const tabs: Array<{
    id: ActiveTab;
    label: string;
    icon: React.ElementType;
    badge?: number | string;
  }> = [
    {
      id: 'budget',
      label: 'Budget Architecture',
      icon: Layers,
      badge: '8 Categories',
    },
    {
      id: 'timeline',
      label: 'Multi-Day Timeline',
      icon: CalendarCheck2,
      badge: taskCount,
    },
    {
      id: 'vendors',
      label: 'Vendor Comparator',
      icon: Store,
      badge: `${vendorSlotCount} Slots`,
    },
    {
      id: 'simulator',
      label: 'What-If & Risk Radar',
      icon: Gauge,
      badge: 'Bit 3 Preview',
    },
  ];

  return (
    <nav aria-label="Main Application Sections" className="border-b border-stone-800/80 bg-stone-950/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div role="tablist" className="flex space-x-2 sm:space-x-4 overflow-x-auto py-2.5 no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                role="tab"
                id={`tab-${tab.id}`}
                aria-controls={`panel-${tab.id}`}
                aria-selected={isActive}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-stone-800/90 text-gold-300 border border-gold-500/30 shadow-md shadow-black/40'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900/60 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-gold-400' : 'text-stone-400'}`} aria-hidden="true" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider ${
                      isActive
                        ? 'bg-gold-500/20 text-gold-300 border border-gold-500/30'
                        : 'bg-stone-800 text-stone-400'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
