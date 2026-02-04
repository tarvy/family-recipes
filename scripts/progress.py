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

import yaml

PROJECT_ROOT = Path(__file__).parent.parent
DELIVERABLES_FILE = Path(__file__).parent / "deliverables.yaml"


def load_deliverables() -> dict:
    """Load deliverables from YAML config file."""
    if not DELIVERABLES_FILE.exists():
        print(f"ERROR: {DELIVERABLES_FILE} not found")
        return {}

    with open(DELIVERABLES_FILE) as f:
        data = yaml.safe_load(f)

    # Convert YAML format to internal format
    deliverables = {}
    for pr_id, pr_data in data.items():
        checks = []
        for check in pr_data.get("checks", []):
            checks.append((check["type"], check["path"]))
        deliverables[pr_id] = {
            "name": pr_data["name"],
            "checks": checks,
        }

    return deliverables


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


def check_pr_status(deliverables: dict) -> dict:
    """Check deliverable status for all PRs."""
    results = {}
    for pr_id, pr_data in deliverables.items():
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

        if total == 0:
            status = "no_checks"
        elif passed == total:
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


def sort_pr_key(pr_id: str) -> int:
    """Extract numeric part of PR ID for sorting."""
    try:
        return int(pr_id.replace("PR-", ""))
    except ValueError:
        return 999


def main():
    """Main entry point."""
    deliverables = load_deliverables()
    if not deliverables:
        return

    results = check_pr_status(deliverables)

    print(f"\n{'=' * 60}")
    print("  FAMILY RECIPES - Progress Report")
    print(f"  Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  Config: {DELIVERABLES_FILE.name}")
    print(f"{'=' * 60}\n")

    # Group by status
    complete = []
    in_progress = []
    not_started = []
    no_checks = []

    for pr_id, data in results.items():
        if data["status"] == "complete":
            complete.append((pr_id, data))
        elif data["status"] == "in_progress":
            in_progress.append((pr_id, data))
        elif data["status"] == "no_checks":
            no_checks.append((pr_id, data))
        else:
            not_started.append((pr_id, data))

    # Sort each group by PR number
    complete.sort(key=lambda x: sort_pr_key(x[0]))
    in_progress.sort(key=lambda x: sort_pr_key(x[0]))
    not_started.sort(key=lambda x: sort_pr_key(x[0]))
    no_checks.sort(key=lambda x: sort_pr_key(x[0]))

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

    # Print items with no checks defined
    if no_checks:
        print("  NO CHECKS DEFINED:")
        for pr_id, data in no_checks:
            print(f"    [?] {pr_id}: {data['name']}")
        print()

    # Summary
    print(f"{'=' * 60}")
    trackable = len(complete) + len(in_progress) + len(not_started)
    print(
        f"  Summary: {len(complete)}/{trackable} complete, "
        f"{len(in_progress)} in progress, "
        f"{len(not_started)} not started"
    )

    # Overall progress (only count PRs with checks)
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
        "config_file": str(DELIVERABLES_FILE),
        "prs": results,
        "summary": {
            "complete": len(complete),
            "in_progress": len(in_progress),
            "not_started": len(not_started),
            "no_checks": len(no_checks),
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
