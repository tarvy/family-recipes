# PR-067: Weekly Menu Flow Fixes - Requirements

> **Status**: Ready for review
> **Branch**: `fix/menu-flow`

## Problem

Travis reports the weekly menu flow (build a menu, run a family vote, finalize
into a shopping list) has never worked properly. Investigation of the web UI
and MCP paths found these contained bugs:

1. **Web planner cannot add cookbook recipes.** Recipe cards are keyed by slug
   (filesystem previews have no DB id) and the planner sent the slug as
   `recipeId`. `new Types.ObjectId(slug)` throws, so the API returned 500 and
   the UI silently ignored it. With no assignments, "Send Survey" also failed
   (silently).
2. **No way to share the vote.** After "Send Survey" the planner discarded the
   voting link and never displayed it.
3. **MCP `menu_send_survey` returned a relative `votingUrl`** (`/vote/<token>`),
   which an assistant cannot hand to the family.
4. **Every planner action swallowed errors** (add, remove, send survey, cancel,
   finalize, unlock): nothing happened and nothing was shown.
5. **Votes accepted after lock-in** while the 24h window was still open, and
   invalid picks caused a 500.

## Requirements

- Cookbook drops resolve slug → recipe id server-side (same lookup as MCP
  `menu_add_dinner`); unknown slug → 404; malformed ids → 400 (not 500).
- Planner shows an absolute, copyable voting link plus vote tally while the
  survey is open.
- `votingUrl` is absolute when `NEXT_PUBLIC_APP_URL` / `OAUTH_ISSUER` is set.
- Planner surfaces API error messages and finalize alerts.
- Voting is open only in `survey-sent` status; picks must be assignment ids on
  the menu.

## Out of scope (needs product decisions)

Votes influencing finalize; viewing the finalized shopping list in the web UI;
household-shared menus / ownership checks; Chicago-local week boundaries;
discovery recipes; MCP unlock/cancel/vote-tally tools.

## Constraints

No schema migrations, no production DB writes.
