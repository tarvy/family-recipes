/**
 * Shuffle button for the Random recipes section.
 *
 * Clears the random-recipes cookie and triggers a server re-render
 * so a fresh $sample is fetched.
 */

'use client';

import { useRouter } from 'next/navigation';
import { RANDOM_RECIPES_COOKIE_NAME } from '@/lib/constants/random-recipes';

/** SVG icon size in pixels */
const ICON_SIZE_PX = 18;

/** SVG stroke width */
const ICON_STROKE_WIDTH = 2;

export function ShuffleButton() {
  const router = useRouter();

  function handleShuffle() {
    cookieStore.delete({ name: RANDOM_RECIPES_COOKIE_NAME, path: '/' }).then(() => {
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleShuffle}
      className="text-muted-foreground transition-colors hover:text-foreground"
      aria-label="Shuffle random recipes"
    >
      <ShuffleIcon />
    </button>
  );
}

function ShuffleIcon() {
  return (
    <svg
      width={ICON_SIZE_PX}
      height={ICON_SIZE_PX}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={ICON_STROKE_WIDTH}
        d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"
      />
    </svg>
  );
}
