'use client';

/**
 * Minimal metadata bar for recipe editing
 *
 * Compact form fields for essential recipe metadata:
 * title, category, servings, prep time, cook time.
 */

import { Input, Select } from '@/components/ui';
import { cn } from '@/lib/utils';

/** Available recipe categories */
const CATEGORIES = ['breakfast', 'desserts', 'entrees', 'salads', 'sides', 'soups'] as const;

export interface RecipeMetadata {
  title: string;
  category: string;
  servings: string;
  prepTime: string;
  cookTime: string;
}

interface MetadataBarProps {
  /** Current metadata values */
  metadata: RecipeMetadata;
  /** Called when any metadata field changes */
  onChange: (metadata: RecipeMetadata) => void;
  /** Additional class names */
  className?: string;
}

export function MetadataBar({ metadata, onChange, className }: MetadataBarProps) {
  function updateField<K extends keyof RecipeMetadata>(field: K, value: RecipeMetadata[K]) {
    onChange({ ...metadata, [field]: value });
  }

  return (
    <div className={cn('rounded-lg border border-border bg-card p-4', className)}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Title - spans 2 columns on larger screens */}
        <div className="sm:col-span-2 lg:col-span-2">
          <label htmlFor="recipe-title" className="mb-1 block text-sm font-medium text-foreground">
            Title <span className="text-destructive">*</span>
          </label>
          <Input
            id="recipe-title"
            type="text"
            value={metadata.title}
            onChange={(e) => updateField('title', e.target.value)}
            placeholder="Recipe title"
          />
        </div>

        {/* Category */}
        <div>
          <label
            htmlFor="recipe-category"
            className="mb-1 block text-sm font-medium text-foreground"
          >
            Category <span className="text-destructive">*</span>
          </label>
          <Select
            id="recipe-category"
            value={metadata.category}
            onChange={(e) => updateField('category', e.target.value)}
          >
            <option value="">Select...</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat} className="capitalize">
                {cat}
              </option>
            ))}
          </Select>
        </div>

        {/* Servings */}
        <div>
          <label
            htmlFor="recipe-servings"
            className="mb-1 block text-sm font-medium text-foreground"
          >
            Servings
          </label>
          <Input
            id="recipe-servings"
            type="number"
            min={1}
            value={metadata.servings}
            onChange={(e) => updateField('servings', e.target.value)}
            placeholder="4"
          />
        </div>

        {/* Times - combined in one cell for compact display */}
        <div>
          {/* biome-ignore lint/a11y/noLabelWithoutControl: Visual label for two inputs below */}
          <label className="mb-1 block text-sm font-medium text-foreground">Time (min)</label>
          <div className="flex gap-2">
            <Input
              id="recipe-prep-time"
              type="number"
              min={0}
              value={metadata.prepTime}
              onChange={(e) => updateField('prepTime', e.target.value)}
              placeholder="Prep"
              title="Prep time in minutes"
              className="w-full"
            />
            <Input
              id="recipe-cook-time"
              type="number"
              min={0}
              value={metadata.cookTime}
              onChange={(e) => updateField('cookTime', e.target.value)}
              placeholder="Cook"
              title="Cook time in minutes"
              className="w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Create empty metadata object
 */
export function createEmptyMetadata(): RecipeMetadata {
  return {
    title: '',
    category: '',
    servings: '',
    prepTime: '',
    cookTime: '',
  };
}
