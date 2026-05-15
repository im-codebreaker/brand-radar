# stackit — Project Instructions

> Stack it your way — minimal full-stack starter (Vue 3 + Fastify + Drizzle).

stackit is a pnpm-workspace monorepo template designed to be cloned, customized via `pnpm setup`, and shipped fast. Optional modules (Redis, better-auth) can be pruned at setup time without leaving dead code behind.

## Tech Stack

| Layer        | Technology                                                  |
| ------------ | ----------------------------------------------------------- |
| Frontend     | Vue 3.5, Vite 7, Pinia, Vue Router, Tailwind v4, @rebnd/ui  |
| Backend      | Fastify 5, autoload, type-provider-zod                      |
| Database     | PostgreSQL via Drizzle ORM (pgvector-ready)                 |
| Validation   | Zod v4 — shared between frontend and backend                |
| Cache        | Redis (optional)                                             |
| Auth         | better-auth (optional)                                       |
| Tooling      | TypeScript, ESLint (antfu), Vitest, Docker                   |

## Monorepo Structure

```
stackit/
├── apps/
│   ├── api/                    # @stackit/api - Fastify backend
│   └── web/                    # @stackit/web - Vue 3 SPA
├── packages/
│   ├── validations/            # @stackit/validations - Zod schemas (SOURCE OF TRUTH)
│   ├── types/                  # @stackit/types - pure TS types & API envelopes
│   ├── db/                     # @stackit/db - Drizzle client + schema
│   ├── cache/                  # @stackit/cache - Redis client (optional)
│   ├── auth/                   # @stackit/auth - better-auth wrapper (optional)
│   ├── helpers/                # @stackit/helpers - shared utilities
│   └── config/
│       ├── tsconfig/           # shared tsconfigs
│       └── eslint-config/      # shared ESLint config (wraps @antfu/eslint-config)
├── .claude/                    # Claude Code configuration
│   ├── agents/                 # Specialized subagents
│   ├── docs/                   # Architecture, style guide, commit conventions
│   └── settings.json
├── infrastructure/             # nginx config
├── scripts/init.ts             # post-clone setup (pnpm setup) — self-deletes
├── docker-compose.yml
└── Dockerfile                  # multi-stage: deps → api/web {build, dev, prod}
```

## Development Commands

```bash
# Setup (one-time, removes itself after running)
pnpm setup

# Dev
pnpm dev                              # all apps in parallel (api :3000, web :5173)
pnpm --filter @stackit/api dev        # just the api
pnpm --filter @stackit/web dev        # just the web

# Database (Drizzle)
pnpm db:generate                      # generate migration from schema diff
pnpm db:migrate                       # apply pending migrations
pnpm db:push                          # dev shortcut — push schema without migration
pnpm db:reset                         # drop + push
pnpm db:seed                          # seed demo data
pnpm db:studio                        # browse data in Drizzle Studio

# Quality gates
pnpm type-check                       # tsc / vue-tsc across the workspace
pnpm lint                             # eslint
pnpm test                             # vitest (api + web)
pnpm build                            # build every app

# Docker
docker compose up -d postgres redis   # infra only
docker compose up --build --watch     # full stack with hot reload
```

## Git Workflow

### Commit Conventions

stackit uses **[Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/)** with monorepo-aware scopes.

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

**Types**: `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `build`, `ci`, `chore`, `style`, `revert`

**Scopes** (map to the area of the monorepo touched):
- `api` — `apps/api/**`
- `web` — `apps/web/**`
- `db` — `packages/db/**` (schema, migrations, client)
- `auth` — `packages/auth/**` (better-auth wrapper)
- `cache` — `packages/cache/**` (Redis)
- `validations` — `packages/validations/**` (Zod schemas)
- `types` — `packages/types/**`
- `helpers` — `packages/helpers/**`
- `config` — `packages/config/**` (tsconfig, eslint)
- `infra` — `Dockerfile`, `docker-compose.yml`, `infrastructure/**`
- `repo` — root package.json, scripts/, workspace-level config
- `deps` — dependency bumps that span packages
- `docs` — README, `.claude/docs/**`, in-repo documentation

**Examples**:
- `feat(api): add /v1/projects routes with pagination`
- `fix(db): handle drizzle migration race in db:reset`
- `refactor(web): extract UserCard to components/ui/`
- `chore(deps): bump drizzle-orm to ^0.46`
- `docs(repo): explain pnpm setup pruning flow`
- `feat(api)!: rename users.list response shape` (breaking change)

**Important — no Claude attribution**: do not add `Co-Authored-By: Claude` (or similar) trailers to commit messages. `.claude/settings.json` sets `includeCoAuthoredBy: false` to enforce this.

For the full spec, scope decisions, and breaking-change handling, see [`./docs/commit-conventions.md`](./docs/commit-conventions.md).

## Code Conventions

### General Principles

1. **Clarity over cleverness** — readable, maintainable code first
2. **Consistency** — follow established patterns; canonical examples are linked in [`./docs/style-guide.md`](./docs/style-guide.md)
3. **Simplicity** — no premature abstractions, no speculative generality
4. **Type safety** — no `any`, use `unknown` when truly unknown
5. **Zod is the source of truth** — every cross-boundary data shape (request, response, DTO, form) lives in `@stackit/validations`

### Naming

| Type | Convention | Example |
|------|------------|---------|
| TS files | `kebab-case` | `user-handlers.ts` |
| Vue components | `PascalCase` | `UserCard.vue` |
| Vars / functions | `camelCase` | `getUserById` |
| Constants | `UPPER_SNAKE_CASE` | `MAX_RETRIES` |
| Types / interfaces | `PascalCase` | `UserRepository` |
| Booleans | `is/has/should` prefix | `isActive`, `hasPermission` |
| Pinia stores | `*.ts` in `stores/` | `auth.ts`, `users.ts` |
| Composables | `use*` prefix | `useZodForm` |

### TypeScript

- `strict: true`. Never `any`. Use `unknown` and narrow.
- `interface` for object shapes, `type` for unions / intersections / primitives.
- Module augmentation for `FastifyInstance` decorators (see `apps/api/src/types/fastify.d.ts`).

## Backend Patterns (Fastify + Drizzle + Zod)

### Plugin Architecture

Two-tier autoload:
- `apps/api/src/plugins/external/` — third-party (cors, helmet, rate-limit, swagger)
- `apps/api/src/plugins/app/` — custom (`db`, `redis`, `auth`, `repositories`, `error-handler`)

Plugins must be wrapped with `fastify-plugin` to expose decorators to siblings. Use the `dependencies` option to express load order:

```ts
export default fp(async (fastify) => {
  fastify.decorate('usersRepository', createUsersRepository(fastify.db))
}, { name: 'repositories', dependencies: ['db'] })
```

Removing a feature is just deleting its plugin file — autoload picks up the rest.

### Routes & Handlers & Repositories

- Route file in `apps/api/src/routes/<feature>.ts` exports `autoPrefix = '/feature'`.
- Handler factory in `apps/api/src/handlers/<feature>.ts` takes a repository, returns route handlers.
- Repository factory in `apps/api/src/repositories/<feature>.ts` takes the `DatabaseClient`, returns query methods. Each method accepts an optional `tx?: DbClient` so it can participate in an outer transaction.

```ts
// repository — typed against Drizzle, transactions optional
export function createUsersRepository(db: DatabaseClient) {
  return {
    async findById(id: string, tx?: DbClient): Promise<User | undefined> {
      return (tx ?? db).query.users.findFirst({ where: eq(users.id, id) })
    },
    // ...
  }
}
```

### Validation

- Zod schemas live in `packages/validations/src/<feature>/` and are imported by both api and web.
- The Fastify route uses `fastify-type-provider-zod` to validate request and serialize response from the same schema.
- The Vue form uses `useZodForm` with the same schema.
- OpenAPI docs are derived from the Zod schemas automatically.

### Error Handling

- Global handler at `apps/api/src/plugins/app/error-handler.ts`.
- Zod validation errors → 400 with structured `issues`.
- Drizzle/Postgres errors → catch `PostgresError` for constraint violations (`23505` unique, `23503` FK, etc.) and convert to typed HTTP errors.
- Use `request.server.httpErrors` (via `@fastify/sensible`) for canonical status codes.

## Frontend Patterns (Vue 3)

- `<script setup lang="ts">` only.
- Composables in `apps/web/src/composables/`, prefixed `use*`.
- Pinia stores in `apps/web/src/stores/<feature>.ts`, composition style.
- Vue Router in `apps/web/src/router/`.
- Forms use `useZodForm` with the shared Zod schema from `@stackit/validations`.
- Styling via Tailwind v4 (no custom CSS unless unavoidable).

See [`./docs/style-guide.md`](./docs/style-guide.md) and the [`vue-expert`](./agents/vue-expert.md) agent for full conventions and anti-patterns.

## Database Patterns (Drizzle)

- Schema in TS under `packages/db/src/schema/` — one file per domain (`users.ts`, `auth.ts`).
- `casing: 'snake_case'` in `drizzle.config.ts` maps camelCase TS columns to snake_case SQL automatically.
- Migrations under `packages/db/drizzle/` — committed to git.
- The `users` schema file uses `// BETTER_AUTH_RELATIONS_START/END` markers; `pnpm setup` removes those blocks when auth is declined.
- Repository pattern (see Backend Patterns above) keeps Drizzle types confined to `repositories/` and `@stackit/db`.

**pgvector-ready**: Drizzle natively supports `vector('embedding', { dimensions: 1536 })` and typed `cosineDistance` / `l2Distance` operators. Add `CREATE EXTENSION IF NOT EXISTS vector;` to a migration when you need it.

See [`./docs/style-guide.md`](./docs/style-guide.md) and the [`drizzle-expert`](./agents/drizzle-expert.md) agent.

## Optional Modules

`pnpm setup` prompts for Redis and better-auth at clone time. Declining a module is purely additive cleanup:

| Module      | Removed if declined                                                                |
| ----------- | ---------------------------------------------------------------------------------- |
| Redis       | `packages/cache/`, `apps/api/src/plugins/app/redis.ts`, redis service in compose   |
| better-auth | `packages/auth/`, auth plugin/route/lib, login view, auth store, auth schema       |

The setup script also handles marker-block pruning (e.g., `BETTER_AUTH_RELATIONS_START/END` in schema files) and re-renames the workspace if a custom project name is provided.

## Specialized Agents

Delegate to subagents when the task is domain-specific. Each agent encodes project conventions and anti-patterns.

| Agent | When to use |
|-------|-------------|
| [`drizzle-expert`](./agents/drizzle-expert.md) | Schema changes, query patterns, migrations, transactions, pgvector |
| [`fastify-expert`](./agents/fastify-expert.md) | Plugins, routes, hooks, autoload, error handling, better-auth integration |
| [`vue-expert`](./agents/vue-expert.md) | Components, composables, Pinia stores, Vue Router |
| [`javascript-expert`](./agents/javascript-expert.md) | TypeScript refactors, error handling, general TS/JS patterns |

## Common Tasks

### Adding a new API domain (e.g., `projects`)

1. Define Zod schemas in `packages/validations/src/projects/{requests,responses,routes}.ts`.
2. Add Drizzle table in `packages/db/src/schema/projects.ts` and re-export from `schema/index.ts`.
3. Run `pnpm db:generate` then `pnpm db:push` (or `db:migrate` in prod).
4. Create repository in `apps/api/src/repositories/projects.ts` (factory + optional `tx`).
5. Expose it via the `repositories` plugin (`apps/api/src/plugins/app/repositories.ts`) and add the decorator type in `apps/api/src/types/fastify.d.ts`.
6. Add handlers in `apps/api/src/handlers/projects.ts`.
7. Wire routes in `apps/api/src/routes/projects.ts` with `autoPrefix = '/projects'`.

### Adding a new Vue page

1. View component in `apps/web/src/views/<Name>View.vue`.
2. Route entry in `apps/web/src/router/index.ts`.
3. Pinia store in `apps/web/src/stores/<feature>.ts` if state is shared.
4. Composable in `apps/web/src/composables/` if behavior is reusable.
5. Forms use `useZodForm` + shared Zod schema from `@stackit/validations`.

### Database schema change

1. Edit `packages/db/src/schema/<file>.ts`.
2. `pnpm db:generate` — produces SQL in `packages/db/drizzle/`. **Review the diff** before committing.
3. `pnpm db:push` (dev) or `pnpm db:migrate` (prod path).
4. If types changed, regenerate types via `pnpm type-check`.

## Reference Documentation

- **[Architecture](./docs/architecture.md)** — system diagram, package dependencies, request lifecycle
- **[Style Guide](./docs/style-guide.md)** — code conventions, anti-patterns, framework specifics
- **[Commit Conventions](./docs/commit-conventions.md)** — Conventional Commits adapted to stackit's monorepo scopes
- **[Agents](./agents/)** — domain-specific subagent definitions
