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
| Terraform | 1.5+ | Infrastructure management (optional) |

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
| `npm run progress` | Check project progress (Python) |

### Just Recipes (optional)

| Command | Description |
|---------|-------------|
| `just lint` | Run Biome lint checks |
| `just lint-fix` | Auto-fix Biome issues |
| `just typecheck` | Run TypeScript checks |
| `just thai-lint` | Run Thai-lint checks |
| `just check` | Run lint + typecheck |
| `just pre-commit` | Run lint:fix + lint + typecheck + Thai-lint |

---

## Terraform Setup (Infrastructure)

Infrastructure is managed in `infra/terraform/`. For local development, you only need `MONGODB_URI` in your `.env.local`. Terraform is primarily used for CI/CD.

### Running Terraform locally

```bash
cd infra/terraform
terraform init
terraform plan -var-file=environments/dev.tfvars
terraform apply -var-file=environments/dev.tfvars
```

Required environment variables for Terraform:
- `TF_VAR_mongodb_atlas_public_key`
- `TF_VAR_mongodb_atlas_private_key`
- `TF_VAR_mongodb_atlas_org_id`
- `TF_VAR_mongodb_db_password`
- `TF_VAR_vercel_api_token`
- `TF_VAR_vercel_project_id`
- `TF_VAR_grafana_url`
- `TF_VAR_grafana_auth`
- `TF_VAR_grafana_cloud_stack_slug`

### Terraform Cloud Remote State

Terraform uses Terraform Cloud for remote state and locking.

1. Create or select workspace: `tarvy-terraform-org` → `family-recipes`
2. Generate a Terraform Cloud user API token
3. Export locally:
   ```bash
   export TF_TOKEN_app_terraform_io="your-terraform-cloud-token"
   ```
4. Add the token as a GitHub Secret: `TERRAFORM_CLOUD_TOKEN`

**Note:** The CI plan uses `environments/prod.tfvars` to keep a single workspace
and avoid duplicate resource errors.

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
| Terraform Plan | Terraform | Infrastructure change preview (if infra/ changed) |

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
- Terraform apply runs for infrastructure changes

### Required GitHub Secrets

For deployments to work, these secrets must be configured:

| Secret | Purpose |
|--------|---------|
| `VERCEL_TOKEN` | Vercel CLI authentication |
| `VERCEL_ORG_ID` | Vercel organization ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |
| `TERRAFORM_CLOUD_TOKEN` | Terraform Cloud API token for remote state |
| `MONGODB_ATLAS_PUBLIC_KEY` | Atlas API public key |
| `MONGODB_ATLAS_PRIVATE_KEY` | Atlas API private key |
| `MONGODB_ATLAS_ORG_ID` | Atlas organization ID |
| `MONGODB_DB_PASSWORD` | Database password |
| `GRAFANA_OTLP_ENDPOINT` | Grafana Cloud OTLP endpoint (for app traces) |
| `GRAFANA_INSTANCE_ID` | Grafana Cloud instance ID |
| `GRAFANA_API_KEY` | Grafana service account API key (Terraform only) |

**Additional secrets for Terraform** (if using infra/terraform/):

| Secret | Purpose |
|--------|---------|
| `GRAFANA_URL` | Grafana Cloud instance URL (for Terraform provider) |
| `GRAFANA_CLOUD_STACK_SLUG` | Grafana stack slug |

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
