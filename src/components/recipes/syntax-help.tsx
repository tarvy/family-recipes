'use client';

/**
 * Cooklang syntax help panel
 *
 * Collapsible reference showing Cooklang markup syntax.
 */

import { useState } from 'react';
import { cn } from '@/lib/utils';

/** SVG stroke width for chevron icon */
const CHEVRON_STROKE_WIDTH = 2;

/** Example ingredient syntax for tip section */
const EXAMPLE_INGREDIENT = '@flour{2%cups}';

interface SyntaxHelpProps {
  className?: string;
}

export function SyntaxHelp({ className }: SyntaxHelpProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={cn('rounded-lg border border-border bg-card', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-4 py-2 text-left text-sm font-medium text-foreground hover:bg-pink-light"
        aria-expanded={isOpen}
      >
        <span>Cooklang Syntax Help</span>
        <ChevronIcon isOpen={isOpen} />
      </button>

      {isOpen && (
        <div className="border-t border-border px-4 py-3 text-sm">
          <div className="space-y-3">
            <SyntaxRow
              symbol="@"
              name="Ingredient"
              examples={[
                { code: '@flour', description: 'Simple ingredient' },
                { code: '@flour{2%cups}', description: 'With quantity and unit' },
                { code: '@olive oil{}', description: 'Multi-word (needs braces)' },
              ]}
            />

            <SyntaxRow
              symbol="#"
              name="Cookware"
              examples={[
                { code: '#pan', description: 'Simple cookware' },
                { code: '#mixing bowl{}', description: 'Multi-word cookware' },
              ]}
            />

            <SyntaxRow
              symbol="~"
              name="Timer"
              examples={[
                { code: '~{15%minutes}', description: 'Timer for 15 minutes' },
                { code: '~{1%hour}', description: 'Timer for 1 hour' },
              ]}
            />

            <SyntaxRow
              symbol=">>"
              name="Metadata"
              examples={[
                { code: '>> title: Recipe Name', description: 'Recipe title' },
                { code: '>> servings: 4', description: 'Number of servings' },
                { code: '>> prep time: 15 minutes', description: 'Preparation time' },
              ]}
            />
          </div>

          <div className="mt-4 rounded-md bg-lavender-light p-3">
            <p className="text-xs text-muted-foreground">
              <strong>Tip:</strong> Ingredients and cookware are written inline with your
              instructions. For example: &ldquo;Add{' '}
              <code className="text-lavender">{EXAMPLE_INGREDIENT}</code> to the{' '}
              <code className="text-lavender">#bowl{'{}'}</code>.&rdquo;
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

interface SyntaxRowProps {
  symbol: string;
  name: string;
  examples: Array<{ code: string; description: string }>;
}

function SyntaxRow({ symbol, name, examples }: SyntaxRowProps) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <code className="rounded bg-lavender-light px-1.5 py-0.5 font-mono text-xs text-lavender">
          {symbol}
        </code>
        <span className="font-medium text-foreground">{name}</span>
      </div>
      <div className="ml-6 space-y-1">
        {examples.map((example) => (
          <div key={example.code} className="flex items-center gap-2 text-xs">
            <code className="font-mono text-muted-foreground">{example.code}</code>
            <span className="text-muted-foreground/70">- {example.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      className={cn('h-4 w-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={CHEVRON_STROKE_WIDTH}
        d="M19 9l-7 7-7-7"
      />
    </svg>
  );
}
