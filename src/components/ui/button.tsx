import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

const base =
  'inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

const variants = {
  primary: 'bg-primary text-primary-foreground shadow hover:bg-pink-dark',
  secondary: 'bg-lavender text-white hover:bg-lavender-dark',
  destructive: 'bg-destructive text-destructive-foreground shadow hover:bg-destructive/90',
  ghost: 'text-muted-foreground hover:text-foreground hover:bg-pink-light',
  outline: 'border border-border bg-transparent text-foreground hover:bg-pink-light',
} as const;

const sizes = {
  default: 'min-h-touch px-4 py-2',
  sm: 'min-h-10 px-3 py-1.5 text-xs',
  icon: 'size-touch p-0',
} as const;

export interface ButtonProps extends React.ComponentProps<'button'> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'default', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';
