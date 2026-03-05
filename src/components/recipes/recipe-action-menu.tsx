/**
 * Recipe action menu (3-dot dropdown).
 *
 * Replaces the stacked action buttons on the recipe detail page
 * with a compact popover triggered by a vertical ellipsis icon.
 */

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useCookingSession } from '@/components/cooking-session';
import {
  CameraIcon,
  EditIcon,
  MoreVerticalIcon,
  PinIcon,
  TrashIcon,
} from '@/components/media/icons';

interface RecipeActionMenuProps {
  slug: string;
  recipeTitle: string;
  canDelete: boolean;
  isFamily: boolean;
  onCoverPhoto: () => void;
  onDelete: () => void;
}

export function RecipeActionMenu({
  slug,
  recipeTitle,
  canDelete,
  isFamily,
  onCoverPhoto,
  onDelete,
}: RecipeActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { isPinned, pinRecipe, unpinRecipe } = useCookingSession();
  const pinned = isPinned(slug);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handlePin = useCallback(() => {
    if (pinned) {
      unpinRecipe(slug);
    } else {
      pinRecipe(slug, recipeTitle);
    }
    setIsOpen(false);
  }, [pinned, slug, recipeTitle, pinRecipe, unpinRecipe]);

  const handleCoverPhoto = useCallback(() => {
    setIsOpen(false);
    onCoverPhoto();
  }, [onCoverPhoto]);

  const handleDelete = useCallback(() => {
    setIsOpen(false);
    onDelete();
  }, [onDelete]);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Recipe actions"
        aria-expanded={isOpen}
        className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-pink-light hover:text-foreground"
      >
        <MoreVerticalIcon className="h-5 w-5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          <div className="py-1">
            {isFamily && (
              <Link
                href={`/recipes/${slug}/edit`}
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-pink-light"
                onClick={() => setIsOpen(false)}
              >
                <EditIcon className="h-4 w-4 text-muted-foreground" />
                Edit
              </Link>
            )}

            <button
              type="button"
              onClick={handlePin}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-foreground hover:bg-pink-light"
            >
              <PinIcon className="h-4 w-4 text-muted-foreground" />
              {pinned ? 'Unpin Recipe' : 'Pin Recipe'}
            </button>

            {isFamily && (
              <button
                type="button"
                onClick={handleCoverPhoto}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-foreground hover:bg-pink-light"
              >
                <CameraIcon className="h-4 w-4 text-muted-foreground" />
                Cover Photo
              </button>
            )}

            {canDelete && (
              <>
                <div className="mx-3 my-1 border-t border-border" />
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-destructive hover:bg-pink-light"
                >
                  <TrashIcon className="h-4 w-4" />
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
