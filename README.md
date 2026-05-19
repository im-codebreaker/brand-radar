# brand-radar

> Stack it your way — minimal full-stack starter (Vue 3 + Fastify + Drizzle).

A clean, opinionated, modular pnpm monorepo for shipping a full-stack app fast.

## Stack

| Layer        | Technology                                                  |
| ------------ | ----------------------------------------------------------- |
| Frontend     | Vue 3.5, Vite 7, Pinia, Vue Router, Tailwind v4, @rebnd/ui  |
| Backend      | Fastify 5, autoload, type-provider-zod                      |
| Database     | PostgreSQL via Drizzle ORM (pgvector-ready)                  |
| Validation   | Zod v4 — shared between frontend and backend                |
| Cache        | Redis (optional)                                             |
| Auth         | better-auth (optional)                                       |
| Tooling      | TypeScript, ESLint (antfu), Vitest, Docker, Traefik          |

## Quickstart

**Local dev (recommended)** — apps run on host, infra in docker:

```bash
git clone git@github.com:im-codebreaker/brand-radar.git my-app
cd my-app
pnpm install
pnpm setup                              # interactive — pick optional modules + project name
cp .env.example .env
docker compose up -d postgres redis     # just the infra
pnpm db:migrate
pnpm db:seed
pnpm dev                                # api on :3000, web on :5173
```

**Full stack in docker** — everything containerized, hot-reload via `--watch`:

```bash
cp .env.example .env
docker compose up --build --watch       # nginx, postgres, redis, api, web
```

Open <http://localhost>. An nginx proxy on `:80` routes `/` → Vite, `/api` → Fastify, `/docs` → Swagger UI. The api and web containers also expose `:3000` and `:5173` directly if you prefer.

API health: <http://localhost/api/v1/health> · OpenAPI docs: <http://localhost/docs>

## Structure

```
brand-radar/
├── apps/
│   ├── api/                    Fastify backend (Zod-validated, autoloaded plugins/routes)
│   └── web/                    Vue 3 SPA (Pinia, Vue Router, Tailwind v4)
├── packages/
│   ├── validations/            @brand-radar/validations — Zod schemas (source of truth)
│   ├── types/                  @brand-radar/types       — pure TS types & API envelopes
│   ├── db/                     @brand-radar/db          — Drizzle client + schema
│   ├── cache/                  @brand-radar/cache       — Redis client (optional)
│   ├── auth/                   @brand-radar/auth        — better-auth wrapper (optional)
│   ├── helpers/                @brand-radar/helpers     — shared utilities
│   └── config/
│       ├── tsconfig/           shared tsconfigs (base, node, web, vitest)
│       └── eslint-config/      shared ESLint config (wraps @antfu/eslint-config)
├── infrastructure/             nginx config; reserved for k8s/terraform
├── scripts/init.ts             post-clone setup (pnpm setup) — self-deletes
├── docker-compose.yml          traefik + postgres + redis + api + web
└── Dockerfile                  multi-stage: deps → api/web {build,dev,prod}
```

## Validation flow (Zod, end to end)

1. Define a schema once in `packages/validations/src/<domain>/`.
2. Fastify route uses it via `fastify-type-provider-zod` — request/response inferred.
3. Vue form imports the same schema and validates with the `useZodForm` composable.
4. OpenAPI docs are generated from the schemas automatically.

```ts
// packages/validations/src/users/requests.ts
export const CreateUserSchema = z.object({ email: z.email(), name: z.string().min(1) })

// apps/api/src/routes/users.ts
fastify.post('/', { schema: users.routes.createUserRoute }, handlers.create)

// apps/web/src/views/UsersView.vue
const { form, errors, validate } = useZodForm(users.requests.CreateUserSchema, { email: '', name: '' })
```

## Scripts (root)

| Command             | What it does                                          |
| ------------------- | ----------------------------------------------------- |
| `pnpm setup`        | One-time interactive setup (removed after first run)  |
| `pnpm dev`          | Run all apps in parallel                              |
| `pnpm build`        | Build every workspace                                 |
| `pnpm lint`         | ESLint across the repo                                |
| `pnpm test`         | Vitest across api + web                               |
| `pnpm type-check`   | tsc / vue-tsc across all packages                     |
| `pnpm db:generate`  | Generate a Drizzle migration from schema changes      |
| `pnpm db:migrate`   | Apply pending Drizzle migrations                      |
| `pnpm db:push`      | Push schema to DB without migration (dev only)        |
| `pnpm db:seed`      | Seed the database                                     |
| `pnpm db:studio`    | Open Drizzle Studio                                   |

## Architecture choices

- **Source-only packages** — every shared package exports `./src/index.ts` directly. Apps compile through their own tooling (`tsx`, `vite`). No build step in `packages/`.
- **Autoloaded Fastify plugins** — drop a file in `plugins/external/` or `plugins/app/`; it registers automatically. Removing a feature is just deleting its file.
- **Repository pattern** — handlers receive repositories via DI, repositories take an optional `tx` for Drizzle transactions.
- **pgvector-ready** — Drizzle natively supports the `vector` column type and `cosineDistance`/`l2Distance` operators. Add `CREATE EXTENSION IF NOT EXISTS vector;` to a migration, declare a `vector('embedding', { dimensions: 1536 })` column, and similarity queries become fully typed.
- **Module augmentation** — `apps/api/src/types/fastify.d.ts` declares decorators (`fastify.db`, `fastify.usersRepository`, `fastify.cache`, `fastify.auth`).
- **One demo domain (`users`)** — full CRUD slice with shared schemas, repository, handler, route, store, and view as a template to copy.

## Optional modules

The `pnpm setup` script asks at install time. Each module is structured so that removing it is purely additive cleanup:

| Module     | Removed if declined                                                              |
| ---------- | -------------------------------------------------------------------------------- |
| Redis      | `packages/cache/`, `apps/api/src/plugins/app/redis.ts`, redis service in compose |
| better-auth | `packages/auth/`, auth plugin/route/lib, login view, auth store, auth schema     |

Re-enabling a module after removal: copy it from this template's git history, or just `pnpm add` and rebuild from scratch.

## License

MIT — see [LICENSE](./LICENSE).
