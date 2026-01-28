# PR-015: MCP Server - Technical Design

> **Status**: Draft
> **Last Updated**: 2026-01-27
> **Author**: Codex

---

## Overview

Implement a stateless MCP server using the Model Context Protocol TypeScript SDK. The server will run at `/mcp`, validate an API key, register recipe and shopping list tools, and return JSON-only responses with full observability.

---

## Architecture

### System Context

```
AI Client (Claude/Cursor) -> /mcp (Next.js route) -> MCP Server -> Tools -> Filesystem/MongoDB
```

### Component Design

```
route.ts
└── getMcpServer()
    ├── recipes tools
    └── shopping tools
```

### Data Flow

```
Client JSON-RPC -> /mcp route (auth + trace) -> MCP server -> tool handler
  -> filesystem (recipes) / MongoDB (search + shopping lists)
  -> JSON-RPC response
```

---

## Database Changes

None.

---

## API Design

### Endpoint

#### `POST /mcp`

**Purpose**: MCP server endpoint for tool discovery and invocation.

**Headers**:
- `x-api-key`: required

**Request**: JSON-RPC 2.0 payload (MCP protocol)

**Response**: JSON-RPC 2.0 response (JSON-only, stateless)

**Errors**:
| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_REQUEST | Invalid JSON or MCP payload |
| 401 | UNAUTHORIZED | Invalid API key |
| 500 | SERVER_ERROR | Unexpected server error |

---

## MCP Tools

### Recipe Tools
- `recipe_list`
- `recipe_get`
- `recipe_search`
- `ingredient_lookup`

### Shopping Tools
- `shopping_list_create`
- `shopping_list_get`

---

## File Structure

```
src/
├── app/
│   └── mcp/route.ts
├── mcp/
│   ├── server.ts
│   └── tools/
│       ├── recipes.ts
│       └── shopping.ts
└── docs/
    └── MCP.md
```

---

## Dependencies

### New Packages

| Package | Version | Purpose |
|---------|---------|---------|
| `@modelcontextprotocol/sdk` | ^1.x | MCP server SDK |
| `zod` | ^3.x | Tool input/output schemas |

---

## Security Considerations

- [ ] Validate `x-api-key` header against `MCP_API_KEY`
- [ ] Ensure MCP route runs in Node runtime
- [ ] Avoid logging sensitive data

---

## Observability

### Logging

| Event | Level | Data |
|-------|-------|------|
| MCP request received | info | method, tool name (if available) |
| MCP auth failure | warn | request id, source |
| Tool execution error | error | tool name, error |

### Traces

| Span | Attributes |
|------|------------|
| `mcp.request` | method, status, tool name |
| `mcp.tool.*` | tool name, duration |
| `db.*` | operation, collection |

---

## Testing Strategy

### Manual
- Call `/mcp` with valid/invalid API key
- Execute tools for recipe list/search/get
- Execute shopping list create/get

### Automated
- Defer to PR-017 (Testing Suite)
