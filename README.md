# Family Recipes

Personal recipe management application using Cooklang format with mobile-first design.

## Features

- Recipe storage in Cooklang format (version-controlled)
- Mobile-responsive web interface
- Shopping list synthesis
- MCP server for AI agent integration
- Structured logging via Vercel logs

## Tech Stack

- **Frontend**: Next.js 15 + React + shadcn/ui + Tailwind CSS
- **Database**: MongoDB Atlas + Mongoose
- **Auth**: Magic links + Passkeys
- **Observability**: Pino + Vercel Logs
- **Infrastructure**: MongoDB Atlas, Vercel
- **Linting**: Biome + Thai-lint

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- Python 3.9+ (for Thai-lint)

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
# Edit .env.local with your credentials (MONGODB_URI required)

# Start development server
npm run dev
```

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with Turbopack |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run Biome linter |
| `npm run typecheck` | Run TypeScript checks |
| `python scripts/progress.py` | Check project progress |

## Project Structure

```
family-recipes/
├── recipes/              # Cooklang recipe files
├── src/
│   ├── app/              # Next.js pages and API routes
│   ├── components/       # React components
│   ├── db/               # Database schema and queries
│   ├── lib/              # Shared utilities
│   └── mcp/              # MCP server implementation
├── docs/                 # Permanent documentation
├── work/                 # PR working documents (temporary)
│   └── TEMPLATES/        # Document templates
└── scripts/              # Utility scripts
```

## Documentation

- [AI Agent Instructions](AGENTS.md) - **Read this first if you're an AI agent**
- [Architecture](docs/ARCHITECTURE.md)
- [Environment Setup](docs/ENVIRONMENT.md)
- [Development Guide](docs/DEVELOPMENT.md) - Local setup, workflow, CI/CD
- [Linting](docs/LINTING.md)
- [Observability](docs/OBSERVABILITY.md)
- [Authentication](docs/AUTH.md)
- [MCP Server](docs/MCP.md)
- [Cooklang Format](docs/COOKLANG.md)

## License

Private - Personal use only.
