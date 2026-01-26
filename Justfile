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

check:
  just lint
  just typecheck
