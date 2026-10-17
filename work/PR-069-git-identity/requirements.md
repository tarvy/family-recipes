# PR-069: Personal git identity hook

> **Status**: In Review
> **PR Branch**: `cursor/personal-git-identity-hook-1bbe`

## Problem Statement

Cloud agents in personal repositories commit as Cursor Agent and append `Co-authored-by` for `travis@devclarity.ai`. That work address belongs only on repositories in the `devclarityai` GitHub org.

## User Stories

### Story 1: Personal repo commits as tarvy

**As a** maintainer of a personal repository
**I want** agent commits to use GitHub user tarvy
**So that** the work email never lands on those commits

#### Acceptance Criteria

```gherkin
Feature: Personal git identity

  Scenario: A tarvy repository
    Given origin is github.com/tarvy/family-recipes
    When a shell command runs
    Then the repo-local author is Travis Glass <tarvy@protonmail.com>
    And commit.gpgsign is false
    And a commit message with no Co-authored-by line gains Co-authored-by: Cursor Agent <cursoragent@cursor.com>
    And the message does not gain a @devclarity.ai trailer

  Scenario: A devclarityai repository
    Given origin owner is devclarityai
    When a shell command runs
    Then the hook writes no git config
    And the hook installs no commit-msg file

  Scenario: A work address on a personal commit
    Given origin owner is tarvy
    When the commit author, committer, or trailers contain @devclarity.ai
    Then the commit is refused
```
