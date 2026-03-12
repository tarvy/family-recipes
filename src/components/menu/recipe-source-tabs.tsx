'use client';

/** Two-tab pill toggle for switching between recipe sources. */

import { cn } from '@/lib/utils';

type TabValue = 'cookbook' | 'discovery';

const TABS: { value: TabValue; label: string }[] = [
  { value: 'cookbook', label: 'Recipe Book' },
  { value: 'discovery', label: 'Discovery' },
];

interface RecipeSourceTabsProps {
  activeTab: TabValue;
  onTabChange: (tab: TabValue) => void;
}

export function RecipeSourceTabs({ activeTab, onTabChange }: RecipeSourceTabsProps) {
  return (
    <div className="flex gap-1 rounded-full bg-pink-light p-1">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onTabChange(tab.value)}
          className={cn(
            'rounded-full px-4 py-1.5 text-sm transition-colors',
            activeTab === tab.value
              ? 'bg-pink text-foreground font-medium'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
