'use client';

/** Client root for the weekly menu planner UI. */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getCurrentWeekLabel, getNextWeekLabel, parseWeekLabel } from '@/lib/menu/week-utils';
import type { RecipePreview } from '@/lib/recipes/loader';
import { CalendarGrid } from './calendar-grid';
import { CardFanOverlay } from './card-fan-overlay';
import { type DraggedRecipe, DragProvider } from './drag-context';
import { PlannerActions } from './planner-actions';
import { RecipeSourcePanel } from './recipe-source-panel';
import { StatusBadge } from './status-badge';
import { WeekSwitcher } from './week-switcher';

// --- Client-side serialized types (mirrors Mongoose .toJSON() output) ---

export interface SerializedAssignment {
  _id: string;
  recipeId?: string;
  discoveryRecipeId?: string;
  title: string;
  thumbnailUrl?: string;
  source: 'cookbook' | 'discovery';
  day: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
  mealSlot: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  addedAt: string;
}

export interface SerializedMenu {
  _id: string;
  ownerId: string;
  weekLabel: string;
  weekStartDate: string;
  status: 'building' | 'survey-sent' | 'locked-in';
  assignments: SerializedAssignment[];
  votes: Array<{
    _id: string;
    voterName: string;
    voterToken: string;
    picks: string[];
    votedAt: string;
  }>;
  votingToken?: string;
  votingOpenedAt?: string;
  votingClosesAt?: string;
  finalizedAt?: string;
  shoppingListId?: string;
  createdAt: string;
  updatedAt: string;
}

const ACTIVE_TAB_KEY = 'planner:activeTab';
const SEARCH_QUERY_KEY = 'planner:searchQuery';
const DAYS_PER_WEEK = 7;
/** January 4th is always in ISO week 1 — used as the anchor for week computation. */
const JAN_4TH_DAY = 4;
const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

type ActiveWeek = 'current' | 'next';
type ActiveTab = 'cookbook' | 'discovery';

interface PlannerPageProps {
  initialMenu: SerializedMenu;
  recipes: RecipePreview[];
  userId: string;
}

function getWeekDateRange(weekLabel: string): string {
  const { year, week } = parseWeekLabel(weekLabel);

  const jan4 = new Date(Date.UTC(year, 0, JAN_4TH_DAY));
  const jan4Day = jan4.getUTCDay() || DAYS_PER_WEEK;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - jan4Day + 1 + (week - 1) * DAYS_PER_WEEK);

  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + DAYS_PER_WEEK - 1);

  const monMonth = MONTH_NAMES[monday.getUTCMonth()];
  const monDay = monday.getUTCDate();
  const sunDay = sunday.getUTCDate();

  if (monday.getUTCMonth() === sunday.getUTCMonth()) {
    return `${monMonth} ${monDay} \u2013 ${sunDay}`;
  }

  const sunMonth = MONTH_NAMES[sunday.getUTCMonth()];
  return `${monMonth} ${monDay} \u2013 ${sunMonth} ${sunDay}`;
}

export function PlannerPage({ initialMenu, recipes, userId: _userId }: PlannerPageProps) {
  const [menu, setMenu] = useState(initialMenu);
  const [activeWeek, setActiveWeek] = useState<ActiveWeek>('current');
  const [activeTab, setActiveTab] = useState<ActiveTab>('cookbook');
  const [searchQuery, setSearchQuery] = useState('');
  const [overlayAssignments, setOverlayAssignments] = useState<SerializedAssignment[] | null>(null);

  const currentWeekLabel = useMemo(() => getCurrentWeekLabel(), []);
  const nextWeekLabel = useMemo(() => getNextWeekLabel(), []);
  const currentDateRange = useMemo(() => getWeekDateRange(currentWeekLabel), [currentWeekLabel]);
  const nextDateRange = useMemo(() => getWeekDateRange(nextWeekLabel), [nextWeekLabel]);

  useEffect(() => {
    const savedTab = sessionStorage.getItem(ACTIVE_TAB_KEY);
    if (savedTab === 'cookbook' || savedTab === 'discovery') {
      setActiveTab(savedTab);
    }

    const savedSearch = sessionStorage.getItem(SEARCH_QUERY_KEY);
    if (savedSearch !== null) {
      setSearchQuery(savedSearch);
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem(ACTIVE_TAB_KEY, activeTab);
  }, [activeTab]);

  useEffect(() => {
    sessionStorage.setItem(SEARCH_QUERY_KEY, searchQuery);
  }, [searchQuery]);

  const handleWeekSwitch = useCallback(
    async (week: ActiveWeek) => {
      const label = week === 'current' ? currentWeekLabel : nextWeekLabel;
      const res = await fetch(`/api/menu?week=${label}`);
      if (res.ok) {
        const data = (await res.json()) as { menu: SerializedMenu };
        setMenu(data.menu);
        setActiveWeek(week);
      }
    },
    [currentWeekLabel, nextWeekLabel],
  );

  const handleStatusChange = useCallback(
    async (_newStatus: 'building' | 'survey-sent' | 'locked-in') => {
      const res = await fetch(`/api/menu/${menu._id}`);
      if (res.ok) {
        const data = (await res.json()) as { menu: SerializedMenu };
        setMenu(data.menu);
      }
    },
    [menu._id],
  );

  const handleAssign = useCallback(
    async (recipe: DraggedRecipe, day: string, slot: string) => {
      const body: Record<string, string> = {
        title: recipe.title,
        source: recipe.source,
        day,
        mealSlot: slot,
      };
      if (recipe.source === 'cookbook') {
        body['recipeId'] = recipe.id;
      }
      if (recipe.source === 'discovery') {
        body['discoveryRecipeId'] = recipe.id;
      }
      if (recipe.thumbnailUrl) {
        body['thumbnailUrl'] = recipe.thumbnailUrl;
      }

      const res = await fetch(`/api/menu/${menu._id}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = (await res.json()) as { assignment: SerializedAssignment };
        setMenu((prev) => ({
          ...prev,
          assignments: [...prev.assignments, data.assignment],
        }));
      }
    },
    [menu._id],
  );

  const handleRemoveAssignment = useCallback(
    async (assignmentId: string) => {
      const res = await fetch(`/api/menu/${menu._id}/assignments`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId }),
      });

      if (res.ok) {
        setMenu((prev) => ({
          ...prev,
          assignments: prev.assignments.filter((a) => a._id !== assignmentId),
        }));
      }
    },
    [menu._id],
  );

  const handleFanTap = useCallback((fanAssignments: SerializedAssignment[]) => {
    setOverlayAssignments(fanAssignments);
  }, []);

  const handleOverlayClose = useCallback(() => {
    setOverlayAssignments(null);
  }, []);

  return (
    <DragProvider>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <WeekSwitcher
            activeWeek={activeWeek}
            onSwitch={handleWeekSwitch}
            currentLabel={currentDateRange}
            nextLabel={nextDateRange}
          />
          <StatusBadge status={menu.status} />
        </div>

        <RecipeSourcePanel
          recipes={recipes}
          activeTab={activeTab}
          searchQuery={searchQuery}
          onTabChange={setActiveTab}
          onSearchChange={setSearchQuery}
        />

        <CalendarGrid
          assignments={menu.assignments}
          onAssign={handleAssign}
          onRemove={handleRemoveAssignment}
          onFanTap={handleFanTap}
          menuStatus={menu.status}
        />

        <PlannerActions
          status={menu.status}
          menuId={menu._id}
          onStatusChange={handleStatusChange}
        />

        {overlayAssignments && (
          <CardFanOverlay
            assignments={overlayAssignments}
            onClose={handleOverlayClose}
            onRemove={handleRemoveAssignment}
          />
        )}
      </div>
    </DragProvider>
  );
}
