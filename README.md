# i18nShaman API

Backend for **i18nShaman** — a translation management workspace for developers.
Translation keys are organized as a tree (folders → components → keys), with
multiple languages per project, tags, search, JSON import, and export to
JSON, Android XML and Apple `.strings`.

The frontend lives in a separate repository: `i18n-shaman-frontend`.

**Stack:** NestJS 11 · MongoDB (Mongoose) · server-side sessions · Pino logs.

**Status:** alpha. See [Roadmap](#roadmap).

## Quick start (local)

Requirements: Node.js (see `.nvmrc`), Docker.

```sh
# 1. Start MongoDB and Mailpit (local SMTP with a web inbox at http://localhost:8025)
docker compose up -d

# 2. Install dependencies
npm install

# 3. Create .env (values below match docker-compose.yml)
cat > .env <<'ENV'
NODE_ENV=development
LOG_LEVEL=info
PORT=4000
FRONTEND_URL=http://localhost:5173
SECRET=change-me-local-only
MONGO_HOST=localhost
MONGO_PORT=27017
MONGO_DB_NAME=i18nShaman
MONGO_DB_USER=i18nshaman
MONGO_DB_PASSWORD=i18nshaman
MONGO_AUTH_SOURCE=admin
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
SMTP_FROM=no-reply@localhost
ENV

# 4. Seed the global language catalog (once)
npm run seed:languages:dev

# 5. Start the API with watch mode
npm run start:dev
```

Health check: `GET http://localhost:4000/health`.

Registration sends a verification email — open it in Mailpit at
http://localhost:8025.

The config loader warns that `SMTP_PORT` should be 465 or 587; that warning is
expected locally with Mailpit on port 1025.

## Scripts

| Command | Description |
| --- | --- |
| `npm run start:dev` | Development server with watch mode |
| `npm run build` | Compile the API |
| `npm run start:prod` | Run the compiled API from `dist` |
| `npm run seed:languages:dev` | Seed the language catalog (dev) |
| `npm run lint` | Lint |
| `npm test` | Unit tests |

## Documentation

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — modules, request lifecycle, design rules.
- [`API_CONTRACT.md`](API_CONTRACT.md) — frontend/backend transport contract.
- [`DATA_MODEL.md`](DATA_MODEL.md) — collections, ownership, lifecycle, indexes.
- [`.env.example`](.env.example) — all environment variables.

## Roadmap

Near term:

- Working test suite and CI.
- Stable unique ids and atomic imports.
- API tokens (for CLI, CI and MCP clients) alongside session auth.
- REST resources with an OpenAPI spec.
- Plural forms / ICU message support.

Next:

- MCP server so AI coding agents can manage keys and translations.
- CLI for syncing translation files with a git repository.
- Context-aware AI translation (glossary, tone, where the string is used).
