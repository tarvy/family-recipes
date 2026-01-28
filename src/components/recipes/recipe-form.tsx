'use client';

/**
 * Recipe create/edit form component
 *
 * Shared form for creating and editing recipes. Handles validation
 * and submission to API routes.
 */

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  createEmptyIngredients,
  IngredientInput,
  type IngredientRow,
} from '@/components/recipes/ingredient-input';
import { createEmptySteps, StepInput, type StepRow } from '@/components/recipes/step-input';
import { Button, Input, Select, Textarea } from '@/components/ui';

/** Available recipe categories */
const CATEGORIES = ['breakfast', 'desserts', 'entrees', 'salads', 'sides', 'soups'] as const;

/** Difficulty options */
const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

/** Icon stroke width for consistent styling */
const ICON_STROKE_WIDTH = 2;

/** Default number of rows for textarea inputs */
const TEXTAREA_ROWS = 3;

/** Counter for generating unique IDs */
let cookwareIdCounter = 0;

function generateCookwareId(): string {
  cookwareIdCounter += 1;
  return `cw-${cookwareIdCounter}`;
}

export interface RecipeFormData {
  title: string;
  category: string;
  description: string;
  servings: string;
  prepTime: string;
  cookTime: string;
  difficulty: string;
  cuisine: string;
  course: string;
  tags: string;
  ingredients: IngredientRow[];
  cookware: CookwareRow[];
  steps: StepRow[];
}

interface CookwareRow {
  id: string;
  name: string;
  quantity: string;
}

interface RecipeFormProps {
  /** Initial data for edit mode */
  initialData?: RecipeFormData;
  /** Recipe slug for edit mode */
  slug?: string;
  /** Mode: 'create' or 'edit' */
  mode: 'create' | 'edit';
}

/**
 * Create empty form data for create mode
 */
export function createEmptyFormData(): RecipeFormData {
  return {
    title: '',
    category: '',
    description: '',
    servings: '',
    prepTime: '',
    cookTime: '',
    difficulty: '',
    cuisine: '',
    course: '',
    tags: '',
    ingredients: createEmptyIngredients(),
    cookware: [{ id: generateCookwareId(), name: '', quantity: '' }],
    steps: createEmptySteps(),
  };
}

/**
 * Validate form data
 */
function validateFormData(formData: RecipeFormData): string | null {
  if (!formData.title.trim()) {
    return 'Title is required';
  }
  if (!formData.category) {
    return 'Category is required';
  }
  const hasIngredient = formData.ingredients.some((ing) => ing.name.trim());
  if (!hasIngredient) {
    return 'At least one ingredient is required';
  }
  const hasStep = formData.steps.some((step) => step.text.trim());
  if (!hasStep) {
    return 'At least one step is required';
  }
  return null;
}

/**
 * Build API request body from form data
 */
function buildRequestBody(formData: RecipeFormData): object {
  const ingredients = formData.ingredients
    .filter((ing) => ing.name.trim())
    .map((ing) => ({
      name: ing.name.trim(),
      quantity: ing.quantity.trim() || undefined,
      unit: ing.unit.trim() || undefined,
    }));

  const cookware = formData.cookware
    .filter((cw) => cw.name.trim())
    .map((cw) => ({
      name: cw.name.trim(),
      quantity: cw.quantity ? Number(cw.quantity) : undefined,
    }));

  const steps = formData.steps
    .filter((step) => step.text.trim())
    .map((step) => ({ text: step.text }));

  const tags = formData.tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  return {
    title: formData.title.trim(),
    category: formData.category,
    description: formData.description.trim() || undefined,
    servings: formData.servings ? Number(formData.servings) : undefined,
    prepTime: formData.prepTime ? Number(formData.prepTime) : undefined,
    cookTime: formData.cookTime ? Number(formData.cookTime) : undefined,
    difficulty: formData.difficulty || undefined,
    cuisine: formData.cuisine.trim() || undefined,
    course: formData.course.trim() || undefined,
    tags: tags.length > 0 ? tags : undefined,
    ingredients,
    cookware: cookware.length > 0 ? cookware : undefined,
    steps,
  };
}

/**
 * Recipe create/edit form
 */
export function RecipeForm({ initialData, slug, mode }: RecipeFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<RecipeFormData>(initialData ?? createEmptyFormData());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField<K extends keyof RecipeFormData>(field: K, value: RecipeFormData[K]) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  function handleCookwareChange(id: string, field: 'name' | 'quantity', value: string) {
    const updated = formData.cookware.map((cw) => (cw.id === id ? { ...cw, [field]: value } : cw));
    updateField('cookware', updated);
  }

  function handleAddCookware() {
    updateField('cookware', [
      ...formData.cookware,
      { id: generateCookwareId(), name: '', quantity: '' },
    ]);
  }

  function handleRemoveCookware(id: string) {
    if (formData.cookware.length <= 1) {
      return;
    }
    updateField(
      'cookware',
      formData.cookware.filter((cw) => cw.id !== id),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validationError = validateFormData(formData);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const body = buildRequestBody(formData);
      const url = mode === 'create' ? '/api/recipes' : `/api/recipes/${slug}`;
      const method = mode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Two-column layout on desktop */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Left column: Metadata */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-foreground">Details</h2>

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-foreground">
              Title <span className="text-destructive">*</span>
            </label>
            <Input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="Recipe title"
              className="mt-1.5"
            />
          </div>

          {/* Category */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-foreground">
              Category <span className="text-destructive">*</span>
            </label>
            <Select
              id="category"
              value={formData.category}
              onChange={(e) => updateField('category', e.target.value)}
              className="mt-1.5"
            >
              <option value="">Select a category</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat} className="capitalize">
                  {cat}
                </option>
              ))}
            </Select>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-foreground">
              Description
            </label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Brief description of the recipe"
              rows={TEXTAREA_ROWS}
              className="mt-1.5"
            />
          </div>

          {/* Time and servings row */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="servings" className="block text-sm font-medium text-foreground">
                Servings
              </label>
              <Input
                type="number"
                id="servings"
                value={formData.servings}
                onChange={(e) => updateField('servings', e.target.value)}
                min={1}
                placeholder="4"
                className="mt-1.5"
              />
            </div>
            <div>
              <label htmlFor="prepTime" className="block text-sm font-medium text-foreground">
                Prep (min)
              </label>
              <Input
                type="number"
                id="prepTime"
                value={formData.prepTime}
                onChange={(e) => updateField('prepTime', e.target.value)}
                min={0}
                placeholder="15"
                className="mt-1.5"
              />
            </div>
            <div>
              <label htmlFor="cookTime" className="block text-sm font-medium text-foreground">
                Cook (min)
              </label>
              <Input
                type="number"
                id="cookTime"
                value={formData.cookTime}
                onChange={(e) => updateField('cookTime', e.target.value)}
                min={0}
                placeholder="30"
                className="mt-1.5"
              />
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <label htmlFor="difficulty" className="block text-sm font-medium text-foreground">
              Difficulty
            </label>
            <Select
              id="difficulty"
              value={formData.difficulty}
              onChange={(e) => updateField('difficulty', e.target.value)}
              className="mt-1.5"
            >
              <option value="">Select difficulty</option>
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d} className="capitalize">
                  {d}
                </option>
              ))}
            </Select>
          </div>

          {/* Cuisine and Course */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="cuisine" className="block text-sm font-medium text-foreground">
                Cuisine
              </label>
              <Input
                type="text"
                id="cuisine"
                value={formData.cuisine}
                onChange={(e) => updateField('cuisine', e.target.value)}
                placeholder="Italian, Mexican, etc."
                className="mt-1.5"
              />
            </div>
            <div>
              <label htmlFor="course" className="block text-sm font-medium text-foreground">
                Course
              </label>
              <Input
                type="text"
                id="course"
                value={formData.course}
                onChange={(e) => updateField('course', e.target.value)}
                placeholder="Main, Appetizer, etc."
                className="mt-1.5"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-foreground">
              Tags
            </label>
            <Input
              type="text"
              id="tags"
              value={formData.tags}
              onChange={(e) => updateField('tags', e.target.value)}
              placeholder="quick, healthy, vegetarian (comma-separated)"
              className="mt-1.5"
            />
          </div>

          {/* Cookware */}
          <fieldset>
            <legend className="block text-sm font-medium text-foreground">Equipment</legend>
            <div className="mt-1.5 space-y-2">
              {formData.cookware.map((cw) => (
                <div key={cw.id} className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Equipment name"
                    value={cw.name}
                    onChange={(e) => handleCookwareChange(cw.id, 'name', e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    placeholder="Qty"
                    value={cw.quantity}
                    onChange={(e) => handleCookwareChange(cw.id, 'quantity', e.target.value)}
                    min={1}
                    className="w-20"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveCookware(cw.id)}
                    disabled={formData.cookware.length <= 1}
                    className="flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                    aria-label="Remove equipment"
                  >
                    <XIcon />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddCookware}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-lavender hover:bg-lavender-light"
              >
                <PlusIcon />
                Add equipment
              </button>
            </div>
          </fieldset>
        </div>

        {/* Right column: Ingredients and Steps */}
        <div className="space-y-8">
          {/* Ingredients */}
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Ingredients <span className="text-destructive">*</span>
            </h2>
            <div className="mt-4">
              <IngredientInput
                ingredients={formData.ingredients}
                onChange={(ingredients) => updateField('ingredients', ingredients)}
              />
            </div>
          </div>

          {/* Steps */}
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Instructions <span className="text-destructive">*</span>
            </h2>
            <div className="mt-4">
              <StepInput steps={formData.steps} onChange={(steps) => updateField('steps', steps)} />
            </div>
          </div>
        </div>
      </div>

      {/* Submit button */}
      <div className="sticky bottom-0 border-t border-border bg-background py-4">
        <div className="flex justify-end gap-4">
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" variant="secondary" disabled={isSubmitting} className="px-6">
            {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Recipe' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </form>
  );
}

function XIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={ICON_STROKE_WIDTH}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={ICON_STROKE_WIDTH}
        d="M12 4v16m8-8H4"
      />
    </svg>
  );
}
