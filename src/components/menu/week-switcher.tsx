'use client';

/** Two-tab pill toggle for switching between current and next week. */

import { cn } from '@/lib/utils';

type WeekValue = 'current' | 'next';

interface WeekSwitcherProps {
  activeWeek: WeekValue;
  onSwitch: (week: WeekValue) => void;
  currentLabel: string;
  nextLabel: string;
}

interface WeekTab {
  value: WeekValue;
  title: string;
}

export function WeekSwitcher({ activeWeek, onSwitch, currentLabel, nextLabel }: WeekSwitcherProps) {
  const tabs: WeekTab[] = [
    { value: 'current', title: 'This Week' },
    { value: 'next', title: 'Next Week' },
  ];

  function getDateLabel(value: WeekValue): string {
    return value === 'current' ? currentLabel : nextLabel;
  }

  return (
    <div className="flex gap-1 rounded-full bg-pink-light p-1">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onSwitch(tab.value)}
          className={cn(
            'rounded-full px-4 py-1.5 text-sm transition-colors',
            activeWeek === tab.value
              ? 'bg-pink text-foreground font-medium'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <span>{tab.title}</span>
          <span className="ml-1.5 text-xs opacity-70">{getDateLabel(tab.value)}</span>
        </button>
      ))}
    </div>
  );
}
