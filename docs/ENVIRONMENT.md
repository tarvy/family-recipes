# Environment Configuration

This document explains all environment variables required for the Family Recipes application.

## Quick Start

```bash
cp .env.example .env.local
# Edit .env.local with your actual credentials
```

## Required Credentials

### Database

#### `DATABASE_URL`
Neon PostgreSQL connection string.

**How to obtain:**
1. Create account at [neon.tech](https://neon.tech)
2. Create a new project
3. Create database named `family_recipes`
4. Copy the connection string from the dashboard
5. Use the pooled connection for serverless

**Format:**
```
postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/family_recipes?sslmode=require
```

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

## Environment Files

| File | Git | Purpose |
|------|-----|---------|
| `.env.example` | Tracked | Template with all variables |
| `.env.local` | Ignored | Local development credentials |
| `.env.production.local` | Ignored | Production overrides (if needed) |

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
