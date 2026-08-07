import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

const variants = {
  default: 'bg-pink-light text-foreground',
  active: 'bg-lavender text-white',
  accent: 'bg-yellow-light text-foreground',
  muted: 'bg-muted text-muted-foreground',
  success: 'bg-success-soft text-success',
  destructive: 'bg-destructive/15 text-destructive',
} as const;

export interface BadgeProps extends React.ComponentProps<'span'> {
  variant?: keyof typeof variants;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium',
          variants[variant],
          className,
        )}
        {...props}
      />
    );
  },
);
Badge.displayName = 'Badge';
