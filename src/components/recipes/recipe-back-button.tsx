/**
 * Back button for recipe detail page.
 *
 * Renders a left arrow that calls router.back() to return to the
 * recipes browse page with filters and scroll position preserved.
 * Only rendered when the user navigated from the browse page.
 */

'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { ArrowLeftIcon } from '@/components/media/icons';

export function RecipeBackButton() {
  const router = useRouter();

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <button
      type="button"
      onClick={handleBack}
      aria-label="Back to recipes"
      className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-pink-light hover:text-foreground"
    >
      <ArrowLeftIcon className="h-5 w-5" />
    </button>
  );
}
