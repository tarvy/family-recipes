'use client';

/** Debounced search input for filtering recipes. */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui';
import { cn } from '@/lib/utils';

const DEBOUNCE_DELAY_MS = 300;

interface RecipeSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function RecipeSearch({ value, onChange }: RecipeSearchProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDisplayValue(value);
  }, [value]);

  const debouncedOnChange = useCallback(
    (next: string) => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        onChange(next);
        timerRef.current = null;
      }, DEBOUNCE_DELAY_MS);
    },
    [onChange],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const next = event.target.value;
    setDisplayValue(next);
    debouncedOnChange(next);
  }

  function handleClear() {
    setDisplayValue('');
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    onChange('');
  }

  return (
    <div className="relative">
      <Input
        type="text"
        value={displayValue}
        onChange={handleChange}
        placeholder="Search recipes..."
        className="pr-8"
      />
      {displayValue.length > 0 && (
        <button
          type="button"
          onClick={handleClear}
          className={cn(
            'absolute right-2 top-1/2 -translate-y-1/2',
            'flex h-5 w-5 items-center justify-center rounded-full',
            'text-muted-foreground hover:text-foreground transition-colors',
          )}
          aria-label="Clear search"
        >
          <span aria-hidden="true">&times;</span>
        </button>
      )}
    </div>
  );
}
