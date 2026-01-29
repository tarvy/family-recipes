'use client';

/**
 * Cooklang editor component
 *
 * Main editor for writing Cooklang recipe content with syntax assistance.
 * Provides a monospace textarea with insert buttons for common syntax.
 */

import { useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { SyntaxHelp } from './syntax-help';

/** Minimum rows for the textarea */
const MIN_ROWS = 12;

interface CooklangEditorProps {
  /** Current content value */
  value: string;
  /** Called when content changes */
  onChange: (value: string) => void;
  /** Called when user wants to insert an ingredient via popover */
  onInsertIngredient?: () => void;
  /** Optional placeholder text */
  placeholder?: string;
  /** Additional class names */
  className?: string;
}

export function CooklangEditor({
  value,
  onChange,
  onInsertIngredient,
  placeholder = 'Write your recipe steps here...\n\nExample: Add @flour{2%cups} to the #mixing bowl{} and stir for ~{5%minutes}.',
  className,
}: CooklangEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /**
   * Insert text at the current cursor position
   */
  const insertAtCursor = useCallback(
    (text: string) => {
      const textarea = textareaRef.current;
      if (!textarea) {
        return;
      }

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const before = value.slice(0, start);
      const after = value.slice(end);

      const newValue = before + text + after;
      onChange(newValue);

      // Restore cursor position after the inserted text
      requestAnimationFrame(() => {
        textarea.focus();
        const newPosition = start + text.length;
        textarea.setSelectionRange(newPosition, newPosition);
      });
    },
    [value, onChange],
  );

  /**
   * Handle quick insert button clicks
   */
  const handleQuickInsert = useCallback(
    (type: 'ingredient' | 'cookware' | 'timer') => {
      switch (type) {
        case 'ingredient':
          if (onInsertIngredient) {
            onInsertIngredient();
          } else {
            insertAtCursor('@');
          }
          break;
        case 'cookware':
          insertAtCursor('#');
          break;
        case 'timer':
          insertAtCursor('~{}');
          // Move cursor inside the braces
          requestAnimationFrame(() => {
            const textarea = textareaRef.current;
            if (textarea) {
              const pos = textarea.selectionStart - 1;
              textarea.setSelectionRange(pos, pos);
            }
          });
          break;
      }
    },
    [insertAtCursor, onInsertIngredient],
  );

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Syntax help */}
      <SyntaxHelp />

      {/* Quick insert toolbar */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Insert:</span>
        <QuickInsertButton
          symbol="@"
          label="Ingredient"
          onClick={() => handleQuickInsert('ingredient')}
        />
        <QuickInsertButton
          symbol="#"
          label="Cookware"
          onClick={() => handleQuickInsert('cookware')}
        />
        <QuickInsertButton symbol="~" label="Timer" onClick={() => handleQuickInsert('timer')} />
      </div>

      {/* Editor textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={MIN_ROWS}
        className={cn(
          'w-full rounded-lg border border-input bg-card px-4 py-3',
          'font-mono text-sm text-foreground',
          'placeholder:text-muted-foreground/50',
          'focus:border-lavender focus:outline-none focus:ring-1 focus:ring-lavender',
          'resize-y',
        )}
        spellCheck={false}
        aria-label="Recipe content editor"
      />
    </div>
  );
}

interface QuickInsertButtonProps {
  symbol: string;
  label: string;
  onClick: () => void;
}

function QuickInsertButton({ symbol, label, onClick }: QuickInsertButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-1',
        'text-xs font-medium',
        'bg-lavender-light text-lavender',
        'hover:bg-lavender hover:text-white',
        'transition-colors',
      )}
      title={`Insert ${label}`}
    >
      <code className="font-mono">{symbol}</code>
      <span>{label}</span>
    </button>
  );
}

/**
 * Get the current cursor position in the textarea
 * Useful for the parent component to know where to insert content
 */
export function getCursorPosition(textarea: HTMLTextAreaElement): number {
  return textarea.selectionStart;
}

/**
 * Insert text at a specific position in the textarea value
 */
export function insertTextAtPosition(
  currentValue: string,
  text: string,
  position: number,
): { newValue: string; newPosition: number } {
  const before = currentValue.slice(0, position);
  const after = currentValue.slice(position);
  return {
    newValue: before + text + after,
    newPosition: position + text.length,
  };
}
