# PR-021: Terraform Remote State & Imports - Technical Design

> **Status**: Draft
> **Last Updated**: 2026-01-26
> **Author**: Codex

---

## Overview

Configure Terraform Cloud as the remote backend and import existing resources so
that CI plans and applies are consistent and idempotent.

---

## Architecture

```
GitHub Actions ── terraform init ──► Terraform Cloud (state)
                               └──► Providers (Atlas/Vercel/Grafana)
```

---

## Backend Choice

Terraform Cloud (free tier) provides:
- Remote state with locking
- Audit history of runs
- No additional infrastructure to manage

---

## Implementation Steps

1. Add Terraform Cloud backend config in `infra/terraform`.
2. Create or select Terraform Cloud workspace for the environment.
3. Configure CI with Terraform Cloud API token.
4. Import existing resources into state:
   - MongoDB Atlas project, cluster, DB user, IP access list
   - Vercel environment variables
   - Grafana folder and dashboards
5. Validate `terraform plan` is clean.

---

## Security Considerations

- Store Terraform Cloud API token in GitHub Secrets.
- Ensure no secrets are committed to the repo or logs.

---

## Testing Strategy

- `terraform init` uses remote backend without prompts.
- `terraform plan -var-file=...` shows no unexpected creates.
- CI plan/apply runs successfully.
