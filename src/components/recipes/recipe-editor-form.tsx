'use client';

/**
 * Cooklang-first recipe editor form
 *
 * Combines metadata bar, Cooklang editor, and live preview
 * for a streamlined recipe editing experience.
 */

import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useCookingSession } from '@/components/cooking-session';
import { Button } from '@/components/ui';
import { NAV_Z_INDEX } from '@/lib/constants/navigation';
import { DECIMAL_RADIX } from '@/lib/cooklang/constants';
import {
  buildCooklangContent,
  type CooklangMetadata,
  splitMetadataAndBody,
} from '@/lib/cooklang/metadata';
import { cn } from '@/lib/utils';
import { CooklangEditor, insertTextAtPosition } from './cooklang-editor';
import { CooklangPreview } from './cooklang-preview';
import { IngredientPopover } from './ingredient-popover';
import { MetadataBar, type RecipeMetadata } from './metadata-bar';

interface RecipeEditorFormProps {
  /** Initial raw Cooklang content for edit mode */
  initialContent?: string;
  /** Initial category for edit mode */
  initialCategory?: string;
  /** Recipe slug for edit mode */
  slug?: string;
  /** Mode: 'create' or 'edit' */
  mode: 'create' | 'edit';
}

/**
 * Convert CooklangMetadata to form metadata
 */
function cooklangMetadataToForm(meta: CooklangMetadata): RecipeMetadata {
  return {
    title: meta.title || '',
    category: '', // Category is stored separately, not in Cooklang content
    servings: meta.servings?.toString() || '',
    prepTime: meta.prepTime?.toString() || '',
    cookTime: meta.cookTime?.toString() || '',
  };
}

/**
 * Convert form metadata to CooklangMetadata
 */
function formMetadataToCooklang(meta: RecipeMetadata): CooklangMetadata {
  const result: CooklangMetadata = { title: meta.title };

  if (meta.servings) {
    const servings = Number.parseInt(meta.servings, DECIMAL_RADIX);
    if (!Number.isNaN(servings)) {
      result.servings = servings;
    }
  }

  if (meta.prepTime) {
    const prepTime = Number.parseInt(meta.prepTime, DECIMAL_RADIX);
    if (!Number.isNaN(prepTime)) {
      result.prepTime = prepTime;
    }
  }

  if (meta.cookTime) {
    const cookTime = Number.parseInt(meta.cookTime, DECIMAL_RADIX);
    if (!Number.isNaN(cookTime)) {
      result.cookTime = cookTime;
    }
  }

  return result;
}

export function RecipeEditorForm({
  initialContent = '',
  initialCategory = '',
  slug,
  mode,
}: RecipeEditorFormProps) {
  const router = useRouter();
  const { hasContent: hasCookingContent } = useCookingSession();

  // Parse initial content into metadata and body
  const initialParts = useMemo(() => {
    if (!initialContent) {
      return { metadata: { title: '' }, body: '' };
    }
    return splitMetadataAndBody(initialContent);
  }, [initialContent]);

  // Form state
  const [metadata, setMetadata] = useState<RecipeMetadata>(() => ({
    ...cooklangMetadataToForm(initialParts.metadata),
    category: initialCategory,
  }));
  const [body, setBody] = useState(initialParts.body);
  const [showIngredientPopover, setShowIngredientPopover] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track cursor position for insertions
  const cursorPositionRef = useRef(0);
  const _editorRef = useRef<HTMLTextAreaElement | null>(null);

  /**
   * Handle ingredient insertion from popover
   */
  const handleInsertIngredient = useCallback(
    (formatted: string) => {
      const { newValue, newPosition } = insertTextAtPosition(
        body,
        formatted,
        cursorPositionRef.current,
      );
      setBody(newValue);

      // Focus back on editor and set cursor after inserted text
      requestAnimationFrame(() => {
        const textarea = document.querySelector(
          'textarea[aria-label="Recipe content editor"]',
        ) as HTMLTextAreaElement;
        if (textarea) {
          textarea.focus();
          textarea.setSelectionRange(newPosition, newPosition);
        }
      });
    },
    [body],
  );

  /**
   * Open ingredient popover, capturing current cursor position
   */
  const handleOpenIngredientPopover = useCallback(() => {
    const textarea = document.querySelector(
      'textarea[aria-label="Recipe content editor"]',
    ) as HTMLTextAreaElement;
    if (textarea) {
      cursorPositionRef.current = textarea.selectionStart;
    }
    setShowIngredientPopover(true);
  }, []);

  /**
   * Validate form before submission
   */
  function validateForm(): string | null {
    if (!metadata.title.trim()) {
      return 'Title is required';
    }
    if (!metadata.category) {
      return 'Category is required';
    }
    if (!body.trim()) {
      return 'Recipe content is required';
    }
    return null;
  }

  /**
   * Build the full Cooklang content from metadata and body
   */
  function buildContent(): string {
    const cooklangMeta = formMetadataToCooklang(metadata);
    return buildCooklangContent(cooklangMeta, body);
  }

  /**
   * Handle form submission
   */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const content = buildContent();
      const url = mode === 'create' ? '/api/recipes' : `/api/recipes/${slug}`;
      const method = mode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          category: metadata.category,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? 'Failed to save recipe');
      }

      const result = (await response.json()) as { slug: string };
      router.push(`/recipes/${result.slug}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save recipe');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-6', hasCookingContent && 'pb-20')}>
      {/* Error display */}
      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Metadata bar */}
      <MetadataBar metadata={metadata} onChange={setMetadata} />

      {/* Editor and preview split */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Editor */}
        <div className="flex flex-col">
          <CooklangEditor
            value={body}
            onChange={setBody}
            onInsertIngredient={handleOpenIngredientPopover}
            className="flex-1"
          />
        </div>

        {/* Preview */}
        <div className="rounded-lg border border-border bg-card p-4">
          <CooklangPreview content={body} />
        </div>
      </div>

      {/* Submit bar */}
      <div
        className="sticky bottom-0 border-t border-border bg-background py-4"
        style={{ zIndex: NAV_Z_INDEX.editorSaveBar }}
      >
        <div className="flex justify-end gap-4">
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" variant="secondary" disabled={isSubmitting} className="px-6">
            {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Recipe' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Ingredient popover */}
      <IngredientPopover
        isOpen={showIngredientPopover}
        onClose={() => setShowIngredientPopover(false)}
        onInsert={handleInsertIngredient}
      />
    </form>
  );
}
