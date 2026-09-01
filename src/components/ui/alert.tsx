import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const variants = {
  destructive: 'border-destructive/20 bg-destructive/10 text-destructive',
  success: 'border-success/30 bg-success-soft text-success',
  warning: 'border-warning/30 bg-warning-soft text-warning-foreground',
  info: 'border-info/30 bg-info-soft text-info-foreground',
} as const;

export interface AlertProps {
  children: ReactNode;
  variant?: keyof typeof variants;
  className?: string;
  title?: string;
}

/**
 * Soft status banner for form/page feedback.
 * Replaces ad-hoc destructive/success box copies.
 */
export function Alert({ children, variant = 'info', className, title }: AlertProps) {
  return (
    <div
      className={cn('rounded-md border p-3 text-sm', variants[variant], className)}
      role={variant === 'destructive' ? 'alert' : 'status'}
    >
      {title ? <p className="mb-1 font-medium">{title}</p> : null}
      <div>{children}</div>
    </div>
  );
}
