# MCP.md — Tool Club

MCP servers are configured in `.mcp.json` at the repo root.

---

## Servers

| Server | Type | Purpose |
|---|---|---|
| `supabase` | Remote (OAuth) | Query local and hosted Supabase project |
| `github` | Local | Create issues, PRs, read repo state |
| `filesystem` | Local | Read and write files in the repo |
| `playwright` | Local | Browser automation and E2E test authoring |
| `vercel` | Local | Deployment status and project management |
| `fetch` | Local | Make HTTP requests to running services |

---

## Auth setup required

### Supabase (OAuth)

The Supabase MCP uses OAuth. Authenticate once per machine:

```
opencode mcp auth supabase
```

This opens a browser window. After authorizing, the token is stored in
`~/.local/share/opencode/mcp-auth.json` (never committed).

### GitHub

Requires a personal access token with `repo` scope set in the environment:

```bash
export GITHUB_PERSONAL_ACCESS_TOKEN=ghp_...
```

Add to your shell profile or a local `.env` file (gitignored).

### Vercel

Requires a Vercel token set in the environment:

```bash
export VERCEL_TOKEN=...
```

Obtain from [vercel.com/account/tokens](https://vercel.com/account/tokens).
This is the same token used in GitHub Actions (`VERCEL_TOKEN` secret).

---

## No auth required

`filesystem`, `playwright`, and `fetch` connect without credentials.
