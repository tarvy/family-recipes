lint:
  npm run lint

lint-fix:
  npm run lint:fix

typecheck:
  npm run typecheck

thai-lint:
  thailint dry src/
  thailint nesting src/
  thailint magic-numbers src/
  thailint perf src/
  thailint srp src/
  thailint lazy-ignores src/
  thailint print-statements src/
  @echo "Skipping file-header (449 pre-existing violations — see .thailint.yaml file_header_paths)"

check:
  just lint
  just typecheck

pre-commit:
  just lint-fix
  just lint
  just typecheck
  just thai-lint

dev:
  npm run dev
