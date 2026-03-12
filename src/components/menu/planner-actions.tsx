'use client';

/** Status-driven action buttons for menu workflow transitions. */

import { useState } from 'react';
import { Button } from '@/components/ui';

type MenuStatus = 'building' | 'survey-sent' | 'locked-in';

interface PlannerActionsProps {
  status: MenuStatus;
  menuId: string;
  onStatusChange: (newStatus: MenuStatus) => void;
}

async function callStatusAction(url: string, method: string): Promise<boolean> {
  const resp = await fetch(url, { method });
  return resp.ok;
}

function BuildingActions({ menuId, onStatusChange, isLoading, setIsLoading }: ActionGroupProps) {
  async function handleSendSurvey() {
    setIsLoading(true);
    const ok = await callStatusAction(`/api/menu/${menuId}/survey`, 'POST');
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

function SurveySentActions({ menuId, onStatusChange, isLoading, setIsLoading }: ActionGroupProps) {
  async function handleCancelSurvey() {
    if (!window.confirm('Are you sure you want to cancel the survey?')) {
      return;
    }
    setIsLoading(true);
    const ok = await callStatusAction(`/api/menu/${menuId}/survey`, 'DELETE');
    if (ok) {
      onStatusChange('building');
    }
    setIsLoading(false);
  }

  async function handleFinalize() {
    setIsLoading(true);
    const ok = await callStatusAction(`/api/menu/${menuId}/finalize`, 'POST');
    if (ok) {
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

function LockedInActions({ menuId, onStatusChange, isLoading, setIsLoading }: ActionGroupProps) {
  async function handleUnlock() {
    if (!window.confirm('Are you sure you want to unlock and edit this menu?')) {
      return;
    }
    setIsLoading(true);
    const ok = await callStatusAction(`/api/menu/${menuId}/unlock`, 'POST');
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
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export function PlannerActions({ status, menuId, onStatusChange }: PlannerActionsProps) {
  const [isLoading, setIsLoading] = useState(false);

  const groupProps: ActionGroupProps = { menuId, onStatusChange, isLoading, setIsLoading };

  return (
    <div className="flex flex-wrap gap-2">
      {status === 'building' && <BuildingActions {...groupProps} />}
      {status === 'survey-sent' && <SurveySentActions {...groupProps} />}
      {status === 'locked-in' && <LockedInActions {...groupProps} />}
    </div>
  );
}
