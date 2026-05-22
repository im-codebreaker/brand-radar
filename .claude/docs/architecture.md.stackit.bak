# stackit — Architecture

## System Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              STACKIT MONOREPO                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────┐          ┌─────────────────────┐                  │
│   │    @stackit/web     │          │    @stackit/api     │                  │
│   │    (Vue 3 SPA)      │  HTTP    │  (Fastify 5)        │                  │
│   │                     │ ──────►  │                     │                  │
│   │  - Vue Router       │          │  - autoload         │                  │
│   │  - Pinia            │          │  - Zod via          │                  │
│   │  - Tailwind v4      │          │    type-provider    │                  │
│   │  - useZodForm       │          │  - better-auth (opt)│                  │
│   └──────────┬──────────┘          └──────────┬──────────┘                  │
│              │                                │                             │
│              │   @stackit/validations         │                             │
│              └────────► (Zod, shared) ◄───────┘                             │
│                                               │                             │
│                                    ┌──────────┴──────────┐                  │
│                                    │                     │                  │
│                              ┌─────▼─────┐         ┌─────▼─────┐            │
│                              │@stackit/db│         │@stackit/  │            │
│                              │ (Drizzle) │         │   cache   │            │
│                              │           │         │  (Redis)  │            │
│                              └─────┬─────┘         └─────┬─────┘            │
│                                    │                     │                  │
└────────────────────────────────────┼─────────────────────┼──────────────────┘
                                     │                     │
                              ┌──────▼──────┐       ┌──────▼──────┐
                              │ PostgreSQL  │       │    Redis    │
                              │  Database   │       │    Cache    │
                              │ (pgvector-  │       │             │
                              │  ready)     │       │             │
                              └─────────────┘       └─────────────┘
```

The key insight: **`@stackit/validations` is the contract**. Both api and web import the same Zod schemas; the schemas drive route validation, response serialization, OpenAPI generation, and form validation.

## Monorepo Structure

```
stackit/
├── apps/
│   ├── api/                    # @stackit/api - Fastify backend
│   │   └── src/
│   │       ├── config/         # env loader (Zod-validated)
│   │       ├── handlers/       # pure handler factories (take repositories)
│   │       ├── lib/            # better-auth wrapper instance
│   │       ├── plugins/
│   │       │   ├── app/        # db, redis, auth, repositories, error-handler
│   │       │   └── external/   # cors, helmet, rate-limit, swagger, sensible
│   │       ├── repositories/   # Drizzle-typed factories
│   │       ├── routes/         # autoloaded; export `autoPrefix`
│   │       ├── types/          # FastifyInstance augmentation
│   │       ├── app.ts          # builds & wires the app
│   │       └── server.ts       # starts the server with close-with-grace
│   │
│   └── web/                    # @stackit/web - Vue 3 SPA
│       └── src/
│           ├── assets/
│           ├── components/     # reusable components (forms/, ui/)
│           ├── composables/    # use* hooks (useZodForm, useAuth, ...)
│           ├── lib/            # api client, auth client
│           ├── router/
│           ├── stores/         # Pinia stores (composition style)
│           ├── views/          # route-level components (*View.vue)
│           └── main.ts
│
├── packages/
│   ├── validations/            # @stackit/validations - Zod schemas (SOURCE OF TRUTH)
│   │   └── src/<feature>/
│   │       ├── requests.ts     # request body / query / params schemas
│   │       ├── responses.ts    # response shapes
│   │       └── routes.ts       # combined route schema objects
│   │
│   ├── db/                     # @stackit/db - Drizzle client + schema
│   │   ├── src/
│   │   │   ├── schema/         # pgTable definitions, one file per domain
│   │   │   └── client.ts       # createDatabaseClient factory
│   │   ├── drizzle/            # generated migrations (committed)
│   │   ├── drizzle.config.ts
│   │   └── scripts/seed.ts
│   │
│   ├── cache/                  # @stackit/cache - Redis client (optional)
│   ├── auth/                   # @stackit/auth - better-auth wrapper (optional)
│   ├── types/                  # @stackit/types - pure TS types & envelopes
│   ├── helpers/                # @stackit/helpers - shared utilities
│   └── config/
│       ├── tsconfig/           # base / node / web / vitest tsconfigs
│       └── eslint-config/      # wraps @antfu/eslint-config
│
├── .claude/                    # Claude Code configuration
├── infrastructure/             # nginx configs
├── scripts/init.ts             # pnpm setup (self-deletes after first run)
├── docker-compose.yml
└── Dockerfile                  # multi-stage: deps → api/web {dev, build, prod}
```

## Package Dependencies

```
@stackit/api
├── @stackit/db                    # Drizzle client + schema
├── @stackit/validations           # Zod schemas (shared with web)
├── @stackit/types
├── @stackit/helpers
├── @stackit/auth      (optional)  # better-auth wrapper
├── @stackit/cache     (optional)  # Redis client
├── fastify
├── fastify-type-provider-zod      # bridges Zod ↔ Fastify
├── @fastify/autoload
├── @fastify/sensible              # request.server.httpErrors.*
├── @fastify/swagger + swagger-ui
├── drizzle-orm                    # direct dep for query helpers (eq, sql, …)
└── close-with-grace

@stackit/web
├── @stackit/validations           # same Zod schemas as api
├── @stackit/types
├── vue / vue-router / pinia
├── @rebnd/ui
├── tailwindcss v4
├── better-auth        (optional)  # client side
└── zod

@stackit/db
├── drizzle-orm
└── postgres                        # postgres-js driver

@stackit/cache
└── redis                           # node-redis

@stackit/auth
└── better-auth                     # uses drizzleAdapter against @stackit/db
```

## Data Flow

### Authenticated request lifecycle

```
1. Web sends fetch with credentials: 'include'
   @stackit/web → POST /api/v1/<route>

2. Fastify pipeline (auto-loaded plugins):
   - external/cors      → CORS headers
   - external/helmet    → security headers
   - external/rate-limit → throttle
   - app/db             → fastify.db (Drizzle)
   - app/auth           → onRequest hook attaches request.session
   - app/repositories   → fastify.usersRepository
   - app/error-handler  → setErrorHandler

3. routes/autohooks.ts onRequest gate:
   - public paths (/health, /auth, /docs) pass
   - else require request.session, else 401

4. Route handler:
   - Zod validates request from @stackit/validations
   - calls handlers.<x>(request, reply)
   - handler talks only to repositories (which own Drizzle)

5. Response:
   - Zod serializes response shape
   - fastify-type-provider-zod returns the result
```

### Schema evolution flow

```
1. Edit packages/db/src/schema/<file>.ts
   - add column, table, index, relation

2. Run pnpm db:generate
   - drizzle-kit diffs schema vs packages/db/drizzle/meta/_journal.json
   - emits packages/db/drizzle/<N>_<name>.sql

3. Review the SQL diff (commit it).

4. Apply:
   - pnpm db:push   (dev shortcut, skips migration history)
   - pnpm db:migrate (writes to _journal, prod path)

5. Downstream:
   - $inferSelect / $inferInsert types update automatically
   - Zod response/request schemas in @stackit/validations may need updates
```

## Plugin Order (api/src/app.ts)

```
app.register(autoload, { dir: 'plugins/external' })   // 1. third-party
app.register(autoload, { dir: 'plugins/app' })        // 2. custom (db, auth, repos)
app.register(autoload, { dir: 'routes',               // 3. routes
  autoHooks: true,
  cascadeHooks: true,
  options: { prefix: '/api/v1' },
})
```

`cascadeHooks: true` makes `routes/autohooks.ts` apply to every nested route file. That's how the auth gate covers `/users`, `/projects`, etc. without per-route boilerplate.

## Environment Variables

The root `.env.example` is for **host-run** development (apps + tooling on the host, infra in docker). `DATABASE_URL` points to `localhost`. Inside docker, `docker-compose.yml` overrides `DATABASE_URL` to use the `postgres` service hostname.

```bash
# --- Postgres ---
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=stackit
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/stackit

# --- Redis (optional) ---
REDIS_HOST=localhost
REDIS_PORT=6379

# --- API ---
NODE_ENV=development
LOG_LEVEL=info
API_PORT=3000
API_HOST=0.0.0.0
BASE_URL=http://localhost
FRONTEND_URL=http://localhost
RATE_LIMIT_MAX=100
CLOSE_GRACE_DELAY=1000

# --- Web (Vite) ---
VITE_API_URL=/api
VITE_APP_NAME=stackit

# --- better-auth (optional) ---
BETTER_AUTH_SECRET=change-me-in-production-please
BETTER_AUTH_URL=http://localhost
OAUTH_GITHUB_ID=
OAUTH_GITHUB_SECRET=
OAUTH_GOOGLE_ID=
OAUTH_GOOGLE_SECRET=
```

## Key Patterns

### Backend
- **Plugin encapsulation** via `fastify-plugin`; explicit `dependencies`.
- **Repository pattern**: handlers take repositories, repositories own Drizzle. No Drizzle types past the repository boundary.
- **Optional modules** marked with `MARKER_START` / `MARKER_END` comment blocks; `pnpm setup` prunes them.
- **`autoPrefix`** export on each route file; mounted under `/api/v1` automatically.
- **Zod-first**: schemas in `@stackit/validations` drive validation + OpenAPI + form validation.

### Frontend
- **Composition API** with `<script setup lang="ts">` only.
- **`useZodForm`** binds Vue forms to the same Zod schemas as the api.
- **Pinia composition style** in `stores/<feature>.ts`.
- **Tailwind utility-first**; scoped styles only when necessary.

### Database
- **Schema-as-code** in TS, `casing: 'snake_case'` for SQL columns.
- **Migrations** committed under `packages/db/drizzle/`.
- **Transactions** via `db.transaction((tx) => …)`; repositories accept `tx?: DbClient`.
- **pgvector** is opt-in: declare `vector('embedding', { dimensions: N })` and add `CREATE EXTENSION vector;` to a migration.

See [`./style-guide.md`](./style-guide.md) for the full code conventions.
