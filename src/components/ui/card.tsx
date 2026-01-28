import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

const variants = {
  default: 'rounded-lg bg-card shadow-sm ring-1 ring-border',
  section: 'rounded-xl border border-border bg-card p-6 shadow-sm',
} as const;

export interface CardProps extends React.ComponentProps<'div'> {
  variant?: keyof typeof variants;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return <div ref={ref} className={cn(variants[variant], className)} {...props} />;
  },
);
Card.displayName = 'Card';
