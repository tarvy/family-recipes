'use client';

/** Status-driven action buttons for menu workflow transitions. */

import { useState } from 'react';
import { Button } from '@/components/ui';

type MenuStatus = 'building' | 'survey-sent' | 'locked-in';

interface PlannerActionsProps {
  status: MenuStatus;
  menuId: string;
  onStatusChange: (newStatus: MenuStatus) => void;
  /** Called with a user-facing message (an error, or finalize alerts), or null to clear it. */
  onMessage: (message: string | null) => void;
}

/** Response body from POST /api/menu/[id]/finalize. */
interface FinalizeResponse {
  alerts?: Array<{ recipeTitle: string; reason: string }>;
}

/**
 * Call a status-transition endpoint. Returns the parsed JSON body on success;
 * on failure reports the server's error message via `onMessage` and returns null.
 */
async function callStatusAction(
  url: string,
  method: string,
  onMessage: (message: string | null) => void,
): Promise<Record<string, unknown> | null> {
  try {
    const resp = await fetch(url, { method });
    const body = (await resp.json().catch(() => ({}))) as Record<string, unknown>;
    if (!resp.ok) {
      const message = typeof body['error'] === 'string' ? body['error'] : 'Something went wrong';
      onMessage(message);
      return null;
    }
    onMessage(null);
    return body;
  } catch {
    onMessage('Network error. Please try again.');
    return null;
  }
}

function describeFinalizeAlerts(body: FinalizeResponse): string | null {
  const alerts = body.alerts ?? [];
  if (alerts.length === 0) {
    return null;
  }
  const titles = alerts.map((alert) => alert.recipeTitle).join(', ');
  return `Menu locked in. Left off the shopping list (ingredients could not be read): ${titles}`;
}

function BuildingActions({
  menuId,
  onStatusChange,
  onMessage,
  isLoading,
  setIsLoading,
}: ActionGroupProps) {
  async function handleSendSurvey() {
    setIsLoading(true);
    const ok = await callStatusAction(`/api/menu/${menuId}/survey`, 'POST', onMessage);
    if (ok) {
      onStatusChange('survey-sent');
    }
    setIsLoading(false);
  }

  return (
    <Button variant="primary" disabled={isLoading} onClick={handleSendSurvey}>
      {isLoading ? 'Sending...' : 'Send Survey'}
    </Button>
  );
}

function SurveySentActions({
  menuId,
  onStatusChange,
  onMessage,
  isLoading,
  setIsLoading,
}: ActionGroupProps) {
  async function handleCancelSurvey() {
    if (!window.confirm('Are you sure you want to cancel the survey?')) {
      return;
    }
    setIsLoading(true);
    const ok = await callStatusAction(`/api/menu/${menuId}/survey`, 'DELETE', onMessage);
    if (ok) {
      onStatusChange('building');
    }
    setIsLoading(false);
  }

  async function handleFinalize() {
    setIsLoading(true);
    const result = await callStatusAction(`/api/menu/${menuId}/finalize`, 'POST', onMessage);
    if (result) {
      onMessage(describeFinalizeAlerts(result as FinalizeResponse));
      onStatusChange('locked-in');
    }
    setIsLoading(false);
  }

  return (
    <>
      <Button variant="secondary" disabled={isLoading} onClick={handleCancelSurvey}>
        Cancel Survey
      </Button>
      <Button variant="primary" disabled={isLoading} onClick={handleFinalize}>
        {isLoading ? 'Finalizing...' : 'Finalize'}
      </Button>
    </>
  );
}

function LockedInActions({
  menuId,
  onStatusChange,
  onMessage,
  isLoading,
  setIsLoading,
}: ActionGroupProps) {
  async function handleUnlock() {
    if (!window.confirm('Are you sure you want to unlock and edit this menu?')) {
      return;
    }
    setIsLoading(true);
    const ok = await callStatusAction(`/api/menu/${menuId}/unlock`, 'POST', onMessage);
    if (ok) {
      onStatusChange('building');
    }
    setIsLoading(false);
  }

  return (
    <Button variant="secondary" disabled={isLoading} onClick={handleUnlock}>
      {isLoading ? 'Unlocking...' : 'Unlock & Edit'}
    </Button>
  );
}

interface ActionGroupProps {
  menuId: string;
  onStatusChange: (newStatus: MenuStatus) => void;
  onMessage: (message: string | null) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export function PlannerActions({ status, menuId, onStatusChange, onMessage }: PlannerActionsProps) {
  const [isLoading, setIsLoading] = useState(false);

  const groupProps: ActionGroupProps = {
    menuId,
    onStatusChange,
    onMessage,
    isLoading,
    setIsLoading,
  };

  return (
    <div className="flex flex-wrap gap-2">
      {status === 'building' && <BuildingActions {...groupProps} />}
      {status === 'survey-sent' && <SurveySentActions {...groupProps} />}
      {status === 'locked-in' && <LockedInActions {...groupProps} />}
    </div>
  );
}
