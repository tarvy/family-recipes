'use client';

/** Status indicator pill for weekly menu state — composes shared Badge. */

import { Badge, type BadgeProps } from '@/components/ui';

type MenuStatus = 'building' | 'survey-sent' | 'locked-in';

const STATUS_CONFIG: Record<
  MenuStatus,
  { label: string; variant: NonNullable<BadgeProps['variant']> }
> = {
  building: {
    label: 'Building',
    variant: 'accent',
  },
  'survey-sent': {
    label: 'Survey Sent',
    variant: 'muted',
  },
  'locked-in': {
    label: 'Locked In',
    variant: 'default',
  },
};

interface StatusBadgeProps {
  status: MenuStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { label, variant } = STATUS_CONFIG[status];
  return <Badge variant={variant}>{label}</Badge>;
}
