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
Random secret for signing session JWTs and passkey challenge cookies.

**How to obtain:**
```bash
openssl rand -base64 48
```

**Security:** Keep this secret. If compromised, regenerate and all sessions will be invalidated.

#### `OWNER_EMAIL`
Seed email address for the initial owner allowlist entry. If set, the auth
pipeline will ensure this email is present in the allowlist with role `owner`.

**Example:**
```
OWNER_EMAIL=you@example.com
```

#### `RESEND_API_KEY`
API key for sending magic link emails.

**How to obtain:**
1. Create account at [resend.com](https://resend.com)
2. Go to API Keys section
3. Create new API key
4. Optionally verify a custom domain

**Free tier:** 3,000 emails/month (more than enough for personal use)

---

### Logging

#### `LOG_LEVEL`
Controls the minimum log level for structured output.

**Values:** `debug`, `info`, `warn`, `error`

**Default:**
- `debug` in development
- `info` in production

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

## Secret Management (Public Repo)

This repository is public. Do not store real secrets in git or documentation.

Recommended practice:
- **Source of truth**: Store secrets in a password manager (1Password is recommended).
- **Local dev**: Copy values into `.env.local` (ignored by git).
- **Production**: Set secrets as Vercel environment variables.

## Vercel Environment Variables

All production credentials should be set in Vercel dashboard:

1. Go to Project Settings > Environment Variables
2. Add each variable for Production environment
3. Optionally add Preview environment variables

## Security Notes

- Never commit `.env.local` or any file with actual credentials
- Rotate `JWT_SECRET` if compromised (invalidates all sessions)
- Use minimal scopes for GitHub tokens
- MongoDB credentials should use dedicated database user, not Atlas admin
