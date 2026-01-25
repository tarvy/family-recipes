#!/usr/bin/env python3
"""
Progress tracker for Family Recipes project.
Checks concrete deliverables, not AI reasoning.
Run: python scripts/progress.py
"""

import json
import subprocess
from datetime import datetime
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent

# Deliverables to check (file existence)
DELIVERABLES = {
    "PR-001": {
        "name": "Project Scaffold",
        "checks": [
            ("file", "package.json"),
            ("file", "tsconfig.json"),
            ("file", "next.config.ts"),
            ("file", "README.md"),
            ("file", "docs/ARCHITECTURE.md"),
            ("dir", "src/app"),
        ],
    },
    "PR-002": {
        "name": "Environment Setup",
        "checks": [
            ("file", ".env.example"),
            ("file", "docs/ENVIRONMENT.md"),
            ("file", ".claude/settings.local.json"),
            ("file", "scripts/progress.py"),
        ],
    },
    "PR-003": {
        "name": "Linting Setup",
        "checks": [
            ("file", "biome.json"),
            ("file", ".husky/pre-commit"),
            ("file", ".thailint.yaml"),
            ("file", "docs/LINTING.md"),
        ],
    },
    "PR-004": {
        "name": "CI/CD Pipeline",
        "checks": [
            ("file", ".github/workflows/ci.yml"),
            ("file", ".github/workflows/deploy.yml"),
            ("file", ".github/PULL_REQUEST_TEMPLATE.md"),
            ("file", "docs/DEVELOPMENT.md"),
        ],
    },
    "PR-005": {
        "name": "Observability",
        "checks": [
            ("file", "src/instrumentation.ts"),
            ("file", "src/lib/telemetry.ts"),
            ("file", "src/lib/logger.ts"),
            ("file", "docs/OBSERVABILITY.md"),
        ],
    },
    "PR-006": {
        "name": "Database Schema",
        "checks": [
            ("file", "drizzle.config.ts"),
            ("file", "src/db/schema.ts"),
            ("file", "src/db/index.ts"),
            ("dir", "drizzle"),
        ],
    },
    "PR-007": {
        "name": "Auth - Magic Links",
        "checks": [
            ("file", "src/lib/auth/magic-link.ts"),
            ("file", "src/lib/email/send.ts"),
            ("file", "src/app/api/auth/verify/route.ts"),
            ("file", "src/lib/auth/session.ts"),
            ("file", "src/app/(auth)/login/page.tsx"),
            ("file", "docs/AUTH.md"),
        ],
    },
    "PR-008": {
        "name": "Auth - Passkeys",
        "checks": [
            ("file", "src/lib/auth/passkey.ts"),
            ("file", "src/app/api/auth/passkey/register/route.ts"),
            ("file", "src/app/api/auth/passkey/authenticate/route.ts"),
            ("file", "src/app/(main)/settings/page.tsx"),
        ],
    },
    "PR-009": {
        "name": "Cooklang Integration",
        "checks": [
            ("file", "src/lib/cooklang/parser.ts"),
            ("file", "src/lib/cooklang/serializer.ts"),
            ("file", "src/lib/git-recipes/sync.ts"),
            ("file", "src/app/api/recipes/sync/route.ts"),
            ("file", "docs/COOKLANG.md"),
        ],
    },
    "PR-010": {
        "name": "Recipe Migration",
        "checks": [
            ("dir", "recipes/blackstone"),
            ("dir", "recipes/instant-pot"),
            ("dir", "recipes/crockpot"),
            ("dir", "recipes/stovetop"),
            ("dir", "recipes/oven"),
            ("dir", "recipes/blender"),
        ],
    },
    "PR-011": {
        "name": "Recipe UI - List & Search",
        "checks": [
            ("file", "src/components/recipes/recipe-card.tsx"),
            ("file", "src/components/recipes/recipe-grid.tsx"),
            ("file", "src/components/recipes/recipe-filters.tsx"),
            ("file", "src/app/(main)/recipes/page.tsx"),
        ],
    },
    "PR-012": {
        "name": "Recipe UI - Detail View",
        "checks": [
            ("file", "src/app/(main)/recipes/[slug]/page.tsx"),
            ("file", "src/components/recipes/ingredient-list.tsx"),
            ("file", "src/components/recipes/step-list.tsx"),
        ],
    },
    "PR-013": {
        "name": "Recipe UI - Create/Edit",
        "checks": [
            ("file", "src/app/(main)/recipes/new/page.tsx"),
            ("file", "src/components/recipes/recipe-form.tsx"),
            ("file", "src/components/recipes/cooklang-editor.tsx"),
            ("file", "src/app/api/photos/upload/route.ts"),
        ],
    },
    "PR-014": {
        "name": "Shopping Lists",
        "checks": [
            ("file", "src/app/(main)/shopping-list/page.tsx"),
            ("file", "src/lib/shopping/aggregator.ts"),
            ("file", "src/lib/shopping/categories.ts"),
            ("file", "src/components/shopping/shopping-list.tsx"),
        ],
    },
    "PR-015": {
        "name": "MCP Server",
        "checks": [
            ("file", "src/mcp/server.ts"),
            ("file", "src/mcp/tools/recipes.ts"),
            ("file", "src/mcp/tools/shopping.ts"),
            ("file", "src/app/mcp/route.ts"),
            ("file", "docs/MCP.md"),
        ],
    },
    "PR-016": {
        "name": "PWA & Mobile Polish",
        "checks": [
            ("file", "public/manifest.json"),
            ("file", "public/sw.js"),
        ],
    },
    "PR-017": {
        "name": "Testing Suite",
        "checks": [
            ("file", "vitest.config.ts"),
            ("file", "playwright.config.ts"),
            ("file", "tests/setup.ts"),
            ("file", "docs/TESTING.md"),
        ],
    },
}


def check_file(path: str) -> bool:
    """Check if file exists."""
    return (PROJECT_ROOT / path).is_file()


def check_dir(path: str) -> bool:
    """Check if directory exists and is not empty."""
    dir_path = PROJECT_ROOT / path
    if not dir_path.is_dir():
        return False
    # Check if directory has any files (excluding hidden files)
    return any(f for f in dir_path.iterdir() if not f.name.startswith("."))


def check_git_branch(branch: str) -> bool:
    """Check if git branch exists."""
    result = subprocess.run(
        ["git", "branch", "--list", branch],
        capture_output=True,
        text=True,
        cwd=PROJECT_ROOT,
    )
    return branch in result.stdout


def check_pr_status() -> dict:
    """Check deliverable status for all PRs."""
    results = {}
    for pr_id, pr_data in DELIVERABLES.items():
        checks = pr_data["checks"]
        passed = 0
        total = len(checks)
        details = []

        for check_type, path in checks:
            if check_type == "file":
                exists = check_file(path)
            elif check_type == "dir":
                exists = check_dir(path)
            else:
                exists = False

            if exists:
                passed += 1
            details.append({"type": check_type, "path": path, "exists": exists})

        if passed == total:
            status = "complete"
        elif passed > 0:
            status = "in_progress"
        else:
            status = "not_started"

        results[pr_id] = {
            "name": pr_data["name"],
            "status": status,
            "progress": f"{passed}/{total}",
            "percent": round(passed / total * 100) if total > 0 else 0,
            "details": details,
        }

    return results


def main():
    """Main entry point."""
    results = check_pr_status()

    print(f"\n{'=' * 60}")
    print("  FAMILY RECIPES - Progress Report")
    print(f"  Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'=' * 60}\n")

    # Group by status
    complete = []
    in_progress = []
    not_started = []

    for pr_id, data in results.items():
        if data["status"] == "complete":
            complete.append((pr_id, data))
        elif data["status"] == "in_progress":
            in_progress.append((pr_id, data))
        else:
            not_started.append((pr_id, data))

    # Print completed
    if complete:
        print("  COMPLETED:")
        for pr_id, data in complete:
            print(f"    [x] {pr_id}: {data['name']}")
        print()

    # Print in progress
    if in_progress:
        print("  IN PROGRESS:")
        for pr_id, data in in_progress:
            print(f"    [~] {pr_id}: {data['name']} ({data['progress']})")
            for detail in data["details"]:
                icon = "+" if detail["exists"] else "-"
                print(f"        {icon} {detail['path']}")
        print()

    # Print not started
    if not_started:
        print("  NOT STARTED:")
        for pr_id, data in not_started:
            print(f"    [ ] {pr_id}: {data['name']}")
        print()

    # Summary
    print(f"{'=' * 60}")
    print(
        f"  Summary: {len(complete)}/{len(results)} complete, "
        f"{len(in_progress)} in progress, "
        f"{len(not_started)} not started"
    )

    # Overall progress
    total_checks = sum(len(d["details"]) for d in results.values())
    passed_checks = sum(
        sum(1 for det in d["details"] if det["exists"]) for d in results.values()
    )
    overall_percent = round(passed_checks / total_checks * 100) if total_checks else 0
    print(f"  Overall: {passed_checks}/{total_checks} checks ({overall_percent}%)")
    print(f"{'=' * 60}\n")

    # Output JSON for automation
    output = {
        "timestamp": datetime.now().isoformat(),
        "prs": results,
        "summary": {
            "complete": len(complete),
            "in_progress": len(in_progress),
            "not_started": len(not_started),
            "total": len(results),
            "overall_checks_passed": passed_checks,
            "overall_checks_total": total_checks,
            "overall_percent": overall_percent,
        },
    }

    output_path = PROJECT_ROOT / ".progress.json"
    with open(output_path, "w") as f:
        json.dump(output, f, indent=2)

    print(f"  JSON report written to .progress.json\n")


if __name__ == "__main__":
    main()
