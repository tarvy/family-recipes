import type { ReactNode } from 'react';
import { type ContentMaxWidth, contentMaxWidth } from '@/lib/design-system';
import { cn } from '@/lib/utils';

export interface PageShellProps {
  children: ReactNode;
  /** Max width preset — defaults to browse (max-w-6xl) */
  width?: ContentMaxWidth;
  className?: string;
  /** Omit default vertical padding when the page manages its own rhythm */
  flush?: boolean;
}

/**
 * Consistent page frame: horizontal padding + max-width centering.
 * Use on every authenticated content page for cohesive rhythm.
 */
export function PageShell({
  children,
  width = 'browse',
  className,
  flush = false,
}: PageShellProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full px-6',
        flush ? undefined : 'py-6',
        contentMaxWidth[width],
        className,
      )}
    >
      {children}
    </div>
  );
}
