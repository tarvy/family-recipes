/**
 * Star rating input component.
 *
 * Renders 5 clickable stars for setting a 1-5 rating.
 * Click a star to set that rating; click the same star to clear it.
 * Includes hover preview state for visual feedback.
 */

'use client';

import { useCallback, useState } from 'react';

/** Total number of stars displayed */
const STAR_COUNT = 5;

/** Star SVG dimensions */
const STAR_SIZE = 28;

/** SVG stroke width for star outlines */
const STAR_STROKE_WIDTH = 1.5;

interface StarRatingProps {
  rating: number | null;
  onRate: (rating: number | null) => void;
  disabled?: boolean;
}

function StarIcon({ filled, size }: { filled: boolean; size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={STAR_STROKE_WIDTH}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
      />
    </svg>
  );
}

export function StarRating({ rating, onRate, disabled = false }: StarRatingProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const handleClick = useCallback(
    (starIndex: number) => {
      if (disabled) {
        return;
      }
      // Click same star = clear; otherwise set
      const newRating = rating === starIndex ? null : starIndex;
      onRate(newRating);
    },
    [disabled, rating, onRate],
  );

  const handleMouseEnter = useCallback(
    (starIndex: number) => {
      if (!disabled) {
        setHoverIndex(starIndex);
      }
    },
    [disabled],
  );

  const handleMouseLeave = useCallback(() => {
    setHoverIndex(null);
  }, []);

  const displayRating = hoverIndex ?? rating ?? 0;

  return (
    <div
      className="flex items-center gap-1"
      role="radiogroup"
      aria-label="Recipe rating"
      onMouseLeave={handleMouseLeave}
    >
      {Array.from({ length: STAR_COUNT }, (_, i) => {
        const starValue = i + 1;
        const filled = starValue <= displayRating;

        return (
          <button
            key={starValue}
            type="button"
            onClick={() => handleClick(starValue)}
            onMouseEnter={() => handleMouseEnter(starValue)}
            disabled={disabled}
            className={`transition-colors ${
              filled ? 'text-amber-400' : 'text-muted-foreground/40'
            } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-110'}`}
            aria-label={`Rate ${starValue} star${starValue !== 1 ? 's' : ''}`}
          >
            <StarIcon filled={filled} size={STAR_SIZE} />
          </button>
        );
      })}
    </div>
  );
}
