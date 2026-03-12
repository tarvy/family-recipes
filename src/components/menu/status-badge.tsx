'use client';

/** Status indicator pill for weekly menu state. */

type MenuStatus = 'building' | 'survey-sent' | 'locked-in';

const STATUS_CONFIG: Record<MenuStatus, { label: string; className: string }> = {
  building: {
    label: 'Building',
    className: 'bg-yellow-light text-foreground',
  },
  'survey-sent': {
    label: 'Survey Sent',
    className: 'bg-lavender-light text-foreground',
  },
  'locked-in': {
    label: 'Locked In',
    className: 'bg-pink text-foreground',
  },
};

interface StatusBadgeProps {
  status: MenuStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { label, className } = STATUS_CONFIG[status];

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}
