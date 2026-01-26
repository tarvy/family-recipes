# PR-020: Secret Remediation & Deployment Hygiene - Technical Design

> **Status**: Draft
> **Last Updated**: 2026-01-26
> **Author**: Codex

---

## Overview

Remediate leaked MongoDB credentials, remove them from git history, and keep deploy automation via Vercel integration without GitHub Secrets. Terraform remains manual unless we explicitly adopt Terraform Cloud.

---

## Architecture

### System Context

```
GitHub (public repo)
  ├── CI: lint/typecheck/thai-lint
  ├── Deploy: Vercel CLI via GitHub Actions (uses GitHub Secrets)
  └── Terraform: plan/apply via GitHub Actions (uses GitHub Secrets)
MongoDB Atlas (rotated credentials)
```

### Data Flow

```
Developer rotates credentials → updates Vercel env vars → app uses new creds
History rewrite → force-push → secret scanning alert resolved
```

---

## Security Considerations

- Rotate MongoDB credentials and invalidate old ones.
- Rewrite history to remove exposed secret.
- Avoid storing secrets in GitHub Actions; use Vercel private env vars.

---

## Operational Steps

1. Rotate MongoDB Atlas DB user password (and/or create new user).
2. Update Vercel env vars to new `MONGODB_URI`.
3. Verify app connects with new credentials.
4. Rewrite git history to purge leaked URI.
5. Force-push and re-run secret scanning; close alert.
6. Ensure Terraform plan/apply uses GitHub Secrets in CI.

---

## Dependencies

- Vercel GitHub integration configured
- Access to MongoDB Atlas
- Authorization to force-push to main

---

## Testing Strategy

- Manual verification that app connects to MongoDB after rotation
- Confirm Vercel deployment succeeds with updated env
- Confirm secret-scanning alert is closed
