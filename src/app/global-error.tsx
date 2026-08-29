'use client';

/**
 * Global Error Boundary
 *
 * Catches uncaught client render errors (including post-deploy chunk
 * mismatches) and offers a reload path so PWA users are not stuck.
 */

import { useEffect } from 'react';
import { requestCacheClear } from '@/lib/pwa/recover-stale-cache';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/** Headline size from DESIGN.md type ramp (text-xl) */
const HEADLINE_FONT_SIZE = '1.25rem';

/** Label size from DESIGN.md type ramp (text-sm) */
const LABEL_FONT_SIZE = '0.875rem';

/** Body size from DESIGN.md type ramp (text-base) */
const BODY_FONT_SIZE = '1rem';

/** Page padding from DESIGN.md spacing */
const PAGE_PADDING = '1.5rem';

/** Control radius from DESIGN.md (rounded-lg) */
const CONTROL_RADIUS = '0.75rem';

/** Minimum touch target (iOS HIG) */
const TOUCH_TARGET_MIN_PX = 44;

/** Body line height from DESIGN.md (1.5) */
const BODY_LINE_HEIGHT = 1.5;

/** Semibold weight used for primary actions in DESIGN.md */
const FONT_WEIGHT_SEMIBOLD = 600;

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Best-effort clear so the next load is not poisoned by stale shells
    requestCacheClear().catch(() => undefined);
  }, []);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: PAGE_PADDING,
          fontFamily: 'system-ui, sans-serif',
          background: '#FBF6E3',
          color: '#4A3728',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '22rem' }}>
          <h1 style={{ fontSize: HEADLINE_FONT_SIZE, marginBottom: '0.75rem' }}>
            Something went wrong
          </h1>
          <p
            style={{
              marginBottom: '1.25rem',
              lineHeight: BODY_LINE_HEIGHT,
              color: '#7a6b5c',
              fontSize: BODY_FONT_SIZE,
            }}
          >
            The app failed to load. Reloading usually fixes this after an update.
          </p>
          <button
            type="button"
            onClick={() => {
              reset();
              window.location.reload();
            }}
            style={{
              minHeight: `${TOUCH_TARGET_MIN_PX}px`,
              padding: '0.75rem 1.25rem',
              border: 0,
              borderRadius: CONTROL_RADIUS,
              background: '#FED4D9',
              color: '#4A3728',
              font: 'inherit',
              fontWeight: FONT_WEIGHT_SEMIBOLD,
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
          {error.digest ? (
            <p
              style={{
                marginTop: '1rem',
                fontSize: LABEL_FONT_SIZE,
                color: '#7a6b5c',
              }}
            >
              Ref: {error.digest}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
