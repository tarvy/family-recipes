/**
 * Recipe interactions section — rating and cook log.
 *
 * Rendered below recipe content on the detail page.
 * Manages local state and calls API endpoints for persistence.
 */

'use client';

import { useCallback, useState } from 'react';
import { StarRating } from './star-rating';

/** Maximum star rating value */
const MAX_RATING = 5;

/** Number of visible rows in the cook note textarea */
const COOK_NOTE_TEXTAREA_ROWS = 2;

/** Maximum character length for cook log notes */
const MAX_NOTE_LENGTH = 500;

/** Format a date string for display in the cook log */
function formatCookDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface CookLogEntry {
  id: string;
  cookedAt: string;
  note?: string;
}

interface RecipeInteractionsProps {
  slug: string;
  initialRating: number | null;
  initialCookLog: CookLogEntry[];
}

export function RecipeInteractions({
  slug,
  initialRating,
  initialCookLog,
}: RecipeInteractionsProps) {
  const [rating, setRating] = useState<number | null>(initialRating);
  const [cookLog, setCookLog] = useState<CookLogEntry[]>(initialCookLog);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [showCookForm, setShowCookForm] = useState(false);
  const [cookNote, setCookNote] = useState('');
  const [cookLoading, setCookLoading] = useState(false);

  const handleRate = useCallback(
    async (newRating: number | null) => {
      setRatingLoading(true);
      const previousRating = rating;
      setRating(newRating);

      try {
        const response = await fetch(`/api/recipes/${slug}/rate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rating: newRating }),
        });

        if (!response.ok) {
          setRating(previousRating);
          // Rating save failed — API returned error
        }
      } catch {
        setRating(previousRating);
        // Rating save failed — network error
      } finally {
        setRatingLoading(false);
      }
    },
    [slug, rating],
  );

  const handleCookSubmit = useCallback(async () => {
    setCookLoading(true);
    const trimmedNote = cookNote.trim();

    try {
      const response = await fetch(`/api/recipes/${slug}/cook-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trimmedNote ? { note: trimmedNote } : {}),
      });

      if (response.ok) {
        const newEntry: CookLogEntry = {
          id: Date.now().toString(),
          cookedAt: new Date().toISOString(),
        };
        if (trimmedNote) {
          newEntry.note = trimmedNote;
        }
        setCookLog((prev) => [newEntry, ...prev]);
        setCookNote('');
        setShowCookForm(false);
      } else {
        // Cook log save failed — API returned error
      }
    } catch {
      // Cook log save failed — network error
    } finally {
      setCookLoading(false);
    }
  }, [slug, cookNote]);

  const cookCount = cookLog.length;
  const lastCook = cookCount > 0 ? cookLog[0] : null;

  return (
    <section className="mt-10 border-t border-border pt-6">
      <h2 className="text-xl font-semibold text-foreground">Family Notes</h2>

      {/* Star Rating */}
      <div className="mt-4 flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Rating:</span>
        <StarRating rating={rating} onRate={handleRate} disabled={ratingLoading} />
        {rating && (
          <span className="text-sm text-muted-foreground">
            {rating}/{MAX_RATING}
          </span>
        )}
      </div>

      {/* Cook Log Summary + Button */}
      <div className="mt-6">
        {cookCount > 0 && (
          <p className="mb-3 text-sm text-muted-foreground">
            Cooked {cookCount} time{cookCount !== 1 ? 's' : ''}
            {lastCook && ` \u00B7 Last on ${formatCookDate(lastCook.cookedAt)}`}
          </p>
        )}

        {showCookForm ? (
          <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
            <textarea
              value={cookNote}
              onChange={(e) => setCookNote(e.target.value)}
              placeholder="Add a note (optional) — tips, tweaks, who loved it..."
              className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-pink focus:outline-none"
              rows={COOK_NOTE_TEXTAREA_ROWS}
              maxLength={MAX_NOTE_LENGTH}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCookSubmit}
                disabled={cookLoading}
                className="rounded-lg bg-pink px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-pink/80 disabled:opacity-50"
              >
                {cookLoading ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCookForm(false);
                  setCookNote('');
                }}
                className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowCookForm(true)}
            className="rounded-lg bg-pink px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-pink/80"
          >
            I Cooked This!
          </button>
        )}
      </div>

      {/* Cook Log List */}
      {cookCount > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-foreground">Cook Log</h3>
          <ul className="mt-2 max-h-64 space-y-2 overflow-y-auto">
            {cookLog.map((entry) => (
              <li key={entry.id} className="rounded-md border border-border px-3 py-2">
                <span className="text-sm text-muted-foreground">
                  {formatCookDate(entry.cookedAt)}
                </span>
                {entry.note && <p className="mt-1 text-sm text-foreground">{entry.note}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
