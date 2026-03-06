/**
 * Recipe detail page actions (3-dot menu with edit, pin, photo, delete).
 *
 * Client component that wraps the action menu, cover photo upload,
 * and delete confirmation into a single cohesive unit.
 */

'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';
import { CameraCapture } from '@/components/media/camera-capture';
import { uploadRecipePhoto } from '@/lib/media/upload-photo';
import { RecipeActionMenu } from './recipe-action-menu';

interface RecipeActionsProps {
  slug: string;
  recipeTitle: string;
  canDelete: boolean;
  isFamily: boolean;
}

export function RecipeActions({ slug, recipeTitle, canDelete, isFamily }: RecipeActionsProps) {
  const router = useRouter();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteState, setDeleteState] = useState<'idle' | 'deleting'>('idle');
  const deleteRef = useRef<HTMLDivElement>(null);

  const handleCoverPhoto = useCallback(() => {
    // Show camera capture directly (mobile-first)
    setCameraOpen(true);
  }, []);

  const handleCameraCapture = useCallback(
    async (blob: Blob) => {
      await uploadRecipePhoto({
        file: blob,
        filename: `${slug}-cover-${Date.now()}.jpg`,
        recipeSlug: slug,
        setCover: true,
      });
    },
    [slug],
  );

  const handleDelete = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    setDeleteState('deleting');
    try {
      const response = await fetch(`/api/recipes/${slug}`, { method: 'DELETE' });
      if (response.ok) {
        router.push('/recipes');
      }
    } catch {
      setDeleteState('idle');
      setShowDeleteConfirm(false);
    }
  }, [slug, router]);

  return (
    <>
      <RecipeActionMenu
        slug={slug}
        recipeTitle={recipeTitle}
        canDelete={canDelete}
        isFamily={isFamily}
        onCoverPhoto={handleCoverPhoto}
        onDelete={handleDelete}
      />

      {/* Camera capture overlay */}
      <CameraCapture
        isOpen={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={handleCameraCapture}
      />

      {/* Delete confirmation overlay */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
          <div
            ref={deleteRef}
            className="w-full max-w-xs rounded-xl border border-border bg-card p-5 shadow-xl"
          >
            <p className="text-sm text-foreground">
              Delete &ldquo;{recipeTitle}&rdquo;? This can&rsquo;t be undone.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleteState === 'deleting'}
                className="flex-1 rounded-lg bg-destructive px-3 py-2 text-sm font-medium text-white hover:bg-destructive/90 disabled:opacity-50"
              >
                {deleteState === 'deleting' ? 'Deleting...' : 'Delete'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteState('idle');
                }}
                className="flex-1 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-pink-light"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
