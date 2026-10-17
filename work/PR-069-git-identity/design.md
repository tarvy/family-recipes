# PR-069: Personal git identity hook

> **Status**: In Review
> **Last Updated**: 2026-10-17

## Overview

`.cursor/hooks/git-identity.sh` is the policy and the enforcer. `beforeShellExecution` runs it before every shell command. In a personal repo it converges repo-local git identity and installs a copy of itself as the first `commit-msg` hook. That hook runs before Cursor's co-author hook.

## Data

Five constants at the top of the script are the policy. `personal` is Travis Glass <tarvy@protonmail.com> for GitHub login `tarvy`. `work.org` is `devclarityai`. `work.domain` is `devclarity.ai`. `agentCoauthor` is Cursor Agent <cursoragent@cursor.com>.

Origin owner `tarvy`, or a missing origin, is personal. Owner `devclarityai` is work and the script writes nothing. Any other owner is foreign and the script writes nothing.

## Identity and trailers

Git reads the author before hooks run, so the script writes `user.name`, `user.email`, and `commit.gpgsign=false` before `git commit`. Signing stays off because Cursor's SSH key is not tarvy's key.

The installed `commit-msg` refuses a personal commit whose committer is not the personal email, or whose author, committer, or trailers contain `@devclarity.ai`. If the message has no `Co-authored-by:` line, it appends the Cursor Agent trailer so Cursor's hook adds nothing.

A push whose `HEAD` commits are not on a remote is refused when one of them carries `@devclarity.ai`.
