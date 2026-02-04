# Development Guide

This guide covers local development setup, workflow, and CI/CD processes.

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 20+ | JavaScript runtime |
| npm | 10+ | Package manager |
| Python | 3.9+ | Thai-lint (optional for local) |
| Just | 1.0+ | Task runner (optional) |
| Git | 2.x | Version control |

---

## Initial Setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd family-recipes
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials. For public repos, keep secrets in a manager (1Password recommended) and copy values into `.env.local` as needed. See [docs/ENVIRONMENT.md](ENVIRONMENT.md) for details on each variable.

### 4. Start development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with Turbopack |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run Biome linter |
| `npm run lint:fix` | Fix auto-fixable lint issues |
| `npm run format` | Format code with Biome |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run allowlist -- <command>` | Manage allowlisted emails (list/add/remove) |
| `npm run progress` | Check project progress (Python) |

---

## AI Agent Data Access Patterns

Use API routes for routine access control operations. They include logging/tracing and enforce
permissions. For ad-hoc read-only queries, use a short-lived Node script that reads `.env.local`.

### Recommended (API-first)

1. Sign in as owner (magic link or passkey).
2. Copy the `session` cookie from the browser.
3. Use the cookie in CLI requests:

```bash
curl -sS -H "Cookie: session=<token>" http://localhost:3000/api/admin/allowlist
```

Add to allowlist:
```bash
curl -sS -X POST -H "Cookie: session=<token>" -H "Content-Type: application/json" \\
  http://localhost:3000/api/admin/allowlist \\
  -d '{"email":"person@example.com","role":"family"}'
```

Invite (owner/family):
```bash
curl -sS -X POST -H "Cookie: session=<token>" -H "Content-Type: application/json" \\
  http://localhost:3000/api/invite \\
  -d '{"email":"friend@example.com","role":"friend"}'
```

### Ad-hoc Read-only DB Query (Mongoose)

For repeatable local admin tasks, prefer the allowlist CLI (loads `.env.local` with `@next/env`):

```bash
# List allowlist entries
npm run allowlist -- list

# Add a family member
npm run allowlist -- add --email person@example.com --role family

# Remove an entry
npm run allowlist -- remove --email person@example.com
```

Use this pattern sparingly and avoid printing secrets:

```bash
node -e "\
const fs=require('fs');\
const env=fs.readFileSync('.env.local','utf8');\
env.split(/\\n/).forEach(line=>{\
  const trimmed=line.trim();\
  if(!trimmed||trimmed.startsWith('#')) return;\
  const idx=trimmed.indexOf('=');\
  if(idx===-1) return;\
  const key=trimmed.slice(0,idx);\
  const val=trimmed.slice(idx+1);\
  process.env[key]=val;\
});\
const mongoose=require('mongoose');\
(async()=>{\
  await mongoose.connect(process.env.MONGODB_URI,{dbName:process.env.MONGODB_DB_NAME});\
  const docs=await mongoose.connection.collection('allowedemails').find({}).toArray();\
  console.log(JSON.stringify(docs,null,2));\
  await mongoose.disconnect();\
})().catch(err=>{console.error(err);process.exitCode=1;});\
"
```

If you need a repeatable task for agents, prefer adding an API endpoint over custom scripts.

### Just Recipes (optional)

| Command | Description |
|---------|-------------|
| `just lint` | Run Biome lint checks |
| `just lint-fix` | Auto-fix Biome issues |
| `just typecheck` | Run TypeScript checks |
| `just thai-lint` | Run Thai-lint checks |
| `just check` | Run lint + typecheck |
| `just pre-commit` | Run lint:fix + lint + typecheck + Thai-lint |
| `just dev` | Start the Next.js dev server |

---

## Development Workflow

### 1. Create a feature branch

```bash
git checkout -b feat/XXX-feature-name
```

Branch naming conventions:
- `feat/XXX-description` - New features
- `fix/XXX-description` - Bug fixes
- `docs/XXX-description` - Documentation
- `refactor/XXX-description` - Code refactoring

### 2. Make your changes

Follow the patterns in [AGENTS.md](../AGENTS.md) for code conventions.

### 3. Verify quality

```bash
npm run lint        # Check for lint errors
npm run typecheck   # Check for type errors
```

### 4. Commit your changes

The pre-commit hook will automatically:
- Run Biome on staged files
- Fix auto-fixable issues

```bash
git add .
git commit -m "feat: add new feature"
```

Commit message format:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `refactor:` - Code refactoring
- `chore:` - Maintenance tasks

### 5. Push and create PR

```bash
git push -u origin feat/XXX-feature-name
```

Open a pull request on GitHub. The PR template will guide you through the checklist.

---

## CI/CD Pipeline

### On Pull Request

The following checks run automatically:

| Job | Tool | Purpose |
|-----|------|---------|
| Lint | Biome | Code style and formatting |
| Type Check | TypeScript | Type safety |
| Thai-lint | Thai-lint | AI code quality patterns |

A preview deployment is created on Vercel.

### Health Checks

Use the health endpoint to verify production/preview deployments can reach MongoDB:

```bash
curl https://<deployment-url>/api/health
```

Expected response:

```json
{ "status": "ok", "db": { "status": "connected", "latencyMs": 12 } }
```

### On Merge to Main

- Production deployment triggers automatically
- Deploys to Vercel production environment

### Required GitHub Secrets

For deployments to work, these secrets must be configured:

| Secret | Purpose |
|--------|---------|
| `VERCEL_TOKEN` | Vercel CLI authentication |
| `VERCEL_ORG_ID` | Vercel organization ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |

---

## Troubleshooting

### Lint errors on commit

The pre-commit hook may fail if there are unfixable lint errors.

```bash
# See all errors
npm run lint

# Fix what can be auto-fixed
npm run lint:fix
```

### TypeScript errors

```bash
# Check for type errors
npm run typecheck
```

Common fixes:
- Add type annotations to function parameters
- Use `unknown` instead of `any`
- Add null checks for optional values

### Port already in use

```bash
# Find process on port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

### Node version issues

Ensure you're using Node 20+:

```bash
node --version
```

Consider using [nvm](https://github.com/nvm-sh/nvm) to manage Node versions.

### Thai-lint not found

Thai-lint is a Python tool:

```bash
pip install thai-lint
```

Or use Docker:

```bash
docker run --rm -v $(pwd):/data washad/thailint:latest dry src/
```

### MongoDB connection issues

Ensure your IP is whitelisted in MongoDB Atlas:
1. Go to Atlas > Network Access
2. Add your current IP or use 0.0.0.0/0 for development
3. For Vercel preview/production, use 0.0.0.0/0 to allow dynamic serverless IPs

---

## Editor Setup

### VS Code

Recommended extensions are in `.vscode/extensions.json`. Install them for the best experience.

Key settings (already configured in `.vscode/settings.json`):
- Biome as default formatter
- Format on save enabled
- TypeScript SDK from node_modules

### Other Editors

Install the Biome extension for your editor:
- [JetBrains](https://plugins.jetbrains.com/plugin/22761-biome)
- [Neovim](https://github.com/neovim/nvim-lspconfig)
- [Helix](https://helix-editor.com/)

---

## Getting Help

- **Architecture questions**: See [docs/ARCHITECTURE.md](ARCHITECTURE.md)
- **Environment setup**: See [docs/ENVIRONMENT.md](ENVIRONMENT.md)
- **Linting issues**: See [docs/LINTING.md](LINTING.md)
- **AI agent guidance**: See [AGENTS.md](../AGENTS.md)
