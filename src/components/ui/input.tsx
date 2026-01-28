import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

const inputBase =
  'w-full rounded-lg border border-input bg-card px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-lavender focus:outline-none focus:ring-1 focus:ring-lavender';

export const Input = forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, ...props }, ref) => {
    return <input ref={ref} className={cn(inputBase, className)} {...props} />;
  },
);
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({ className, ...props }, ref) => {
    return <textarea ref={ref} className={cn(inputBase, 'resize-y', className)} {...props} />;
  },
);
Textarea.displayName = 'Textarea';

export const Select = forwardRef<HTMLSelectElement, React.ComponentProps<'select'>>(
  ({ className, ...props }, ref) => {
    return <select ref={ref} className={cn(inputBase, className)} {...props} />;
  },
);
Select.displayName = 'Select';
