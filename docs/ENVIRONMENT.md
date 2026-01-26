# Environment Configuration

This document explains all environment variables required for the Family Recipes application.

## Quick Start

```bash
cp .env.example .env.local
# Edit .env.local with your actual credentials
```

## Required Credentials

### Database (MongoDB Atlas)

#### `MONGODB_URI`
MongoDB Atlas connection string.

**How to obtain:**
1. Create account at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a new project and cluster (M0 free tier works)
3. Create a database user with readWrite access
4. Add your IP to the access list (for Vercel/serverless, use 0.0.0.0/0 to allow dynamic IPs)
5. Copy the connection string from the cluster's "Connect" button

**Format:**
```
<protocol>://<username>:<password>@<cluster-host>/<db>?retryWrites=true&w=majority
```

Use the `mongodb+srv` protocol for Atlas SRV connections.

#### `MONGODB_DB_NAME`
Database name within the cluster.

**Default:** `family_recipes`

---

### Authentication

#### `JWT_SECRET`
Random secret for signing session JWTs.

**How to obtain:**
```bash
openssl rand -base64 48
```

**Security:** Keep this secret. If compromised, regenerate and all sessions will be invalidated.

#### `RESEND_API_KEY`
API key for sending magic link emails.

**How to obtain:**
1. Create account at [resend.com](https://resend.com)
2. Go to API Keys section
3. Create new API key
4. Optionally verify a custom domain

**Free tier:** 3,000 emails/month (more than enough for personal use)

---

### Observability

#### `GRAFANA_OTLP_ENDPOINT`
Grafana Cloud OTLP endpoint for traces, metrics, and logs.

**How to obtain:**
1. Create free account at [grafana.com](https://grafana.com)
2. Go to your Grafana Cloud stack
3. Navigate to Connections > OpenTelemetry
4. Copy the OTLP endpoint URL

**Format:**
```
https://otlp-gateway-prod-us-central-0.grafana.net/otlp
```

#### `GRAFANA_INSTANCE_ID`
Your Grafana Cloud instance ID (numeric).

**How to obtain:**
Found in your Grafana Cloud stack details page.

#### `GRAFANA_API_KEY`
API key with write access for metrics, logs, and traces.

**How to obtain:**
1. Go to your Grafana Cloud stack
2. Navigate to Security > API Keys
3. Create new key with:
   - Role: `MetricsPublisher`, `LogsWriter`, `TracesWriter`
   - Or use "Admin" for simplicity in personal projects

---

### File Storage

#### `BLOB_READ_WRITE_TOKEN`
Vercel Blob storage token for recipe photos.

**How to obtain:**
1. Go to your Vercel project settings
2. Navigate to Storage tab
3. Create or connect a Blob store
4. Copy the read-write token

---

### MCP Server

#### `MCP_API_KEY`
API key for authenticating MCP tool calls from Claude Code and Cursor.

**How to obtain:**
Generate a random string:
```bash
openssl rand -hex 32
```

**Usage:** Include as `x-api-key` header when calling MCP endpoints.

---

### External Tools

#### `VERCEL_TOKEN`
Vercel CLI token for deployments.

**How to obtain:**
```bash
vercel login
vercel tokens create family-recipes-ci
```

Or create via Vercel dashboard: Settings > Tokens

#### `GITHUB_TOKEN`
GitHub Personal Access Token for automation.

**How to obtain:**
1. Go to GitHub Settings > Developer settings > Personal access tokens
2. Generate new token (classic) with scopes:
   - `repo` (full access to private repositories)
   - `workflow` (for GitHub Actions)

---

### Application URLs

#### `NEXT_PUBLIC_APP_URL`
Public URL of the application.

**Values:**
- Development: `http://localhost:3000`
- Production: `https://your-app.vercel.app` or custom domain

#### `WEBAUTHN_RP_ID`
Relying Party ID for WebAuthn/Passkeys.

**Values:**
- Development: `localhost`
- Production: `your-domain.com` (without protocol)

---

## Terraform Variables (CI Only)

These are used by Terraform in CI/CD pipelines for infrastructure management. Set them as GitHub Secrets with the `TF_VAR_` prefix automatically applied in the workflow:

| GitHub Secret | Terraform Variable | Purpose |
|---------------|-------------------|---------|
| `MONGODB_ATLAS_PUBLIC_KEY` | `mongodb_atlas_public_key` | Atlas API public key |
| `MONGODB_ATLAS_PRIVATE_KEY` | `mongodb_atlas_private_key` | Atlas API private key |
| `MONGODB_ATLAS_ORG_ID` | `mongodb_atlas_org_id` | Atlas organization ID |
| `MONGODB_DB_PASSWORD` | `mongodb_db_password` | Database password |
| `VERCEL_TOKEN` | `vercel_api_token` | Vercel API token |
| `VERCEL_PROJECT_ID` | `vercel_project_id` | Vercel project ID |
| `VERCEL_TEAM_ID` | `vercel_team_id` | Vercel team ID (optional) |
| `GRAFANA_URL` | `grafana_url` | Grafana Cloud instance URL |
| `GRAFANA_API_KEY` | `grafana_auth` | Grafana API key (admin access) |
| `GRAFANA_CLOUD_STACK_SLUG` | `grafana_cloud_stack_slug` | Grafana stack slug |

**Note:** The Terraform workflow requires `GRAFANA_URL` and `GRAFANA_CLOUD_STACK_SLUG` which are separate from the app runtime variables (`GRAFANA_OTLP_ENDPOINT`, `GRAFANA_INSTANCE_ID`).

---

## Environment Files

| File | Git | Purpose |
|------|-----|---------|
| `.env.example` | Tracked | Template with all variables |
| `.env.local` | Ignored | Local development credentials |
| `.env.production.local` | Ignored | Production overrides (if needed) |

## Secret Management (Public Repo)

This repository is public. Do not store real secrets in git or documentation.

Recommended practice:
- **Source of truth**: Store secrets in a password manager (1Password is recommended).
- **Local dev**: Copy values into `.env.local` (ignored by git).
- **Production**: Set secrets as Vercel environment variables (Terraform manages these in `infra/terraform/`).

## Vercel Environment Variables

All production credentials should be set in Vercel dashboard:

1. Go to Project Settings > Environment Variables
2. Add each variable for Production environment
3. Optionally add Preview environment variables

## Security Notes

- Never commit `.env.local` or any file with actual credentials
- Rotate `JWT_SECRET` if compromised (invalidates all sessions)
- Use minimal scopes for GitHub tokens
- Grafana API keys should have write-only access (no read needed)
- MongoDB credentials should use dedicated database user, not Atlas admin
