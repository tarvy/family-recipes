# PR-068: Thai-lint Magic Numbers in Design Tokens - Design

Add module-private `DURATION_FAST_MS = 150`, `DURATION_NORMAL_MS = 300` and
`DURATION_SLOW_MS = 500` above `motionDurationMs` and reference them. `300` is
allowed unnamed but is named too for consistency. Values mirror
`--duration-*` in `src/app/globals.css`.

No other Thai-lint violations exist on `main` (dry, nesting, perf clean with
thailint 0.25.0, the version CI installs).
