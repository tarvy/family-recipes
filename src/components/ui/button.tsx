import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * Shared Button primitive.
 *
 * Default width is content-sized (`w-fit`) so flex parents cannot stretch
 * actions into full-bleed bars. Pass `fullWidth` only for intentional primary
 * submits in narrow stacks (auth, empty states). See DESIGN.md
 * "Content-Width Action Rule".
 */

const base =
  'inline-flex shrink-0 items-center justify-center rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

const variants = {
  primary: 'bg-primary text-primary-foreground shadow hover:bg-pink-dark',
  secondary: 'bg-lavender text-white hover:bg-lavender-dark',
  destructive: 'bg-destructive text-destructive-foreground shadow hover:bg-destructive/90',
  ghost: 'text-muted-foreground hover:text-foreground hover:bg-pink-light',
  outline: 'border border-border bg-transparent text-foreground hover:bg-pink-light',
} as const;

const sizes = {
  default: 'min-h-touch px-4 py-2',
  /** Still meets 44px touch floor — denser padding only */
  sm: 'min-h-touch px-3 py-1.5 text-xs',
  icon: 'size-touch p-0',
} as const;

export interface ButtonProps extends React.ComponentProps<'button'> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  /** Stretch to container width — only for primary CTAs in narrow stacks */
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'default', fullWidth = false, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          base,
          fullWidth ? 'w-full' : 'w-fit',
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';
