# Brand Radar — Project Instructions

> Discover, resolve, and rank emerging fashion and perfume brands from social platforms and the web.

Brand Radar is a pipeline-driven intelligence platform that discovers brand signals, resolves entities, enriches metadata, scores relevance, and surfaces insights through a searchable dashboard.

## Tech Stack

| Layer        | Technology                                                  |
| ------------ | ----------------------------------------------------------- |
| Frontend     | Vue 3.5, Vite 7, Pinia, Vue Router, Tailwind v4             |
| Backend      | Fastify 5, autoload, type-provider-zod                      |
| Workers      | BullMQ, Playwright, adapters                                 |
| Database     | PostgreSQL + pgvector, Drizzle ORM                           |
| Search       | Meilisearch (full-text + faceted search)                     |
| Cache        | Redis (BullMQ queues + rate limiting)                        |
| Storage      | S3/MinIO (raw HTML/JSON, logos)                              |
| Auth         | better-auth                                                  |
| Tooling      | TypeScript, ESLint (antfu), Vitest, Docker                   |

## Monorepo Structure

```
brand-radar/
├── apps/
│   ├── api/                    # @brand-radar/api - Fastify REST API
│   ├── web/                    # @brand-radar/web - Vue 3 SPA
│   ├── workers/                # @brand-radar/workers - BullMQ job processors
│   └── scheduler/              # @brand-radar/scheduler - Cron job manager
├── packages/
│   ├── db/                     # @brand-radar/db - Drizzle ORM + schema
│   ├── search/                 # @brand-radar/search - Meilisearch client
│   ├── redis/                  # @brand-radar/redis - Redis client
│   ├── adapters/               # @brand-radar/adapters - Scraping adapters
│   ├── shared/                 # @brand-radar/shared - Shared utilities & types
│   ├── ai/                     # @brand-radar/ai - Embeddings, NLP (Phase 3)
│   ├── taxonomy/               # @brand-radar/taxonomy - Brand classification
│   ├── auth/                   # @brand-radar/auth - better-auth wrapper
│   └── config/
│       ├── tsconfig/           # Shared TypeScript configs
│       └── eslint-config/      # Shared ESLint config (wraps @antfu/eslint-config)
├── .claude/                    # Claude Code configuration
│   ├── agents/                 # Specialized subagents
│   └── docs/                   # Architecture, style guide, commit conventions
│       ├── architecture.md
│       ├── brand-platform/     # Domain-specific guides
│       └── decisions/          # ADRs
├── infrastructure/             # nginx config
├── docker-compose.yml
└── Dockerfile                  # multi-stage: deps → apps {build, dev, prod}
```

## Development Commands

```bash
# Dev
pnpm dev                              # all apps in parallel (api :3000, web :5173, workers, scheduler)
pnpm --filter @brand-radar/api dev    # just the api
pnpm --filter @brand-radar/web dev    # just the web
pnpm --filter @brand-radar/workers dev # just workers

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
docker compose up -d postgres redis meilisearch # infra only
docker compose up --build --watch               # full stack with hot reload
```

## Git Workflow

### Commit Conventions

Brand Radar uses **[Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/)** with monorepo-aware scopes.

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

**Types**: `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `build`, `ci`, `chore`, `style`, `revert`

**Scopes** (map to the area of the monorepo touched):
- `api` — `apps/api/**`
- `web` — `apps/web/**`
- `workers` — `apps/workers/**`
- `scheduler` — `apps/scheduler/**`
- `db` — `packages/db/**` (schema, migrations, client)
- `search` — `packages/search/**` (Meilisearch client)
- `redis` — `packages/redis/**` (Redis client)
- `adapters` — `packages/adapters/**` (scraping adapters)
- `shared` — `packages/shared/**` (utilities, types)
- `ai` — `packages/ai/**` (embeddings, NLP)
- `taxonomy` — `packages/taxonomy/**` (brand classification)
- `auth` — `packages/auth/**` (better-auth wrapper)
- `config` — `packages/config/**` (tsconfig, eslint)
- `infra` — `Dockerfile`, `docker-compose.yml`, `infrastructure/**`
- `repo` — root package.json, workspace-level config
- `deps` — dependency bumps that span packages
- `docs` — README, `.claude/docs/**`, in-repo documentation

**Examples**:
- `feat(adapters): add Instagram hashtag crawler`
- `fix(workers): handle extraction timeout in normalization worker`
- `refactor(search): extract brand indexing to reusable function`
- `chore(deps): bump drizzle-orm to ^0.46`
- `docs(brand-platform): update pipeline architecture`
- `feat(api)!: rename brands.list response shape` (breaking change)

**Important — no Claude attribution**: do not add `Co-Authored-By: Claude` (or similar) trailers to commit messages. `.claude/settings.json` sets `includeCoAuthoredBy: false` to enforce this.

For the full spec, scope decisions, and breaking-change handling, see [`./docs/commit-conventions.md`](./docs/commit-conventions.md).

## Code Conventions

### General Principles

1. **Clarity over cleverness** — readable, maintainable code first
2. **Consistency** — follow established patterns; canonical examples are linked in [`./docs/style-guide.md`](./docs/style-guide.md)
3. **Simplicity** — no premature abstractions, no speculative generality
4. **Type safety** — no `any`, use `unknown` when truly unknown
5. **Zod for validation** — validate at system boundaries (user input, external APIs, job data)

### Naming

| Type | Convention | Example |
|------|------------|---------|
| TS files | `kebab-case` | `brand-handlers.ts` |
| Vue components | `PascalCase` | `BrandCard.vue` |
| Vars / functions | `camelCase` | `getBrandById` |
| Constants | `UPPER_SNAKE_CASE` | `MAX_RETRIES` |
| Types / interfaces | `PascalCase` | `BrandRepository` |
| Booleans | `is/has/should` prefix | `isActive`, `hasEcommerce` |
| Pinia stores | `*.ts` in `stores/` | `auth.ts`, `brands.ts` |
| Composables | `use*` prefix | `useSearch` |
| Workers | `*.worker.ts` | `scoring.worker.ts` |
| Adapters | `*-adapter.ts` | `instagram-adapter.ts` |

### Comments

**Default to zero comments.** Only add a comment when the code is not clear and descriptive on its own.

- Well-named functions, variables, and types should make the code self-documenting
- If you need a comment to explain WHAT the code does, the code needs better naming
- Only comment the WHY when it's non-obvious: hidden constraints, subtle invariants, workarounds for specific bugs
- Do not add file headers, method descriptions that repeat the method name, or inline comments describing obvious operations

Examples of useless comments to avoid:
```ts
// Get brand by ID
async getBrandById(id: string) { ... }

// Create service from repository
const service = createBrandsService(repo)

// Business rule: brand name must be unique
if (existing) throw new ConflictError('Brand already exists')
```

The code is already clear — the comments add no value.

### TypeScript

- `strict: true`. Never `any`. Use `unknown` and narrow.
- `interface` for object shapes, `type` for unions / intersections / primitives.
- Module augmentation for `FastifyInstance` decorators (see `apps/api/src/types/fastify.d.ts`).

## Backend Patterns (Fastify + Drizzle + Zod)

### Plugin Architecture

Two-tier autoload:
- `apps/api/src/plugins/external/` — third-party (cors, helmet, rate-limit, swagger)
- `apps/api/src/plugins/app/` — custom (`db`, `redis`, `search`, `repositories`, `auth`, `error-handler`)

Plugins must be wrapped with `fastify-plugin` to expose decorators to siblings. Use the `dependencies` option to express load order:

```ts
export default fp(async (fastify) => {
  fastify.decorate('brandsRepository', createBrandsRepository(fastify.db))
}, { name: 'repositories', dependencies: ['db'] })
```

### DDD Module Structure

Each domain lives in `apps/api/src/modules/<feature>/` with clean architecture layers:

```
modules/brands/
├── brands.routes.ts      # Fastify plugin, exports autoPrefix = '/brands'
├── brands.handlers.ts    # HTTP layer — request/response, status codes
├── brands.service.ts     # Business logic — validation, orchestration
└── brands.repository.ts  # Data access — Drizzle queries, transactions
```

**Dependency flow**: routes → handlers → service → repository

## Worker Patterns (BullMQ)

### Worker Types

Workers live in `apps/workers/src/workers/` and process jobs from BullMQ queues:

```
workers/
├── discovery.worker.ts      # Crawl sources, emit raw candidates
├── extraction.worker.ts     # Parse raw HTML/JSON → structured data
├── normalization.worker.ts  # Clean, validate, dedupe
├── enrichment.worker.ts     # Fetch social stats, ecommerce signals
├── scoring.worker.ts        # Compute brand scores
└── indexing.worker.ts       # Push to Meilisearch
```

Each worker:
- Validates job data with Zod
- Emits Prometheus metrics
- Handles retries with exponential backoff
- Enqueues downstream jobs on completion

See [Pipeline Architecture](./docs/brand-platform/pipeline.md) for full worker patterns.

## Scraping Patterns (Playwright + Adapters)

### Adapter Architecture

Every scraping source implements the `ScraperAdapter` interface:

```typescript
interface ScraperAdapter {
  id: string
  sourceType: 'instagram' | 'tiktok' | 'website' | 'reddit'
  
  configure(params: AdapterConfig): void
  discover(query: DiscoveryQuery): AsyncGenerator<RawCandidate>
  extract(url: string): Promise<ExtractedBrand>
  
  rateLimit: { requestsPerMinute: number; cooldownMs: number }
  probe(): Promise<AdapterHealth>
}
```

Adapters live in `packages/adapters/<source>/` and are registered in the adapter registry.

See [Adapter Strategy](./docs/brand-platform/adapters.md) for full patterns.

## Frontend Patterns (Vue 3)

- `<script setup lang="ts">` only.
- Composables in `apps/web/src/composables/`, prefixed `use*`.
- Pinia stores in `apps/web/src/stores/<feature>.ts`, composition style.
- Vue Router in `apps/web/src/router/`.
- Forms use Zod validation with shared schemas.
- Styling via Tailwind v4 (no custom CSS unless unavoidable).

See [Style Guide](./docs/style-guide.md) for full conventions.

## Database Patterns (Drizzle)

- Schema in TS under `packages/db/src/schema/` — one file per domain (`brands.ts`, `social-profiles.ts`).
- `casing: 'snake_case'` in `drizzle.config.ts` maps camelCase TS columns to snake_case SQL automatically.
- Migrations under `packages/db/drizzle/` — committed to git.
- Repository pattern keeps Drizzle types confined to `repositories/` and `@brand-radar/db`.

**pgvector-ready**: Drizzle natively supports `vector('embedding', { dimensions: 1536 })` and typed `cosineDistance` operators.

See [Schema Design](./docs/brand-platform/schema.md) for full patterns.

## Specialized Agents

Delegate to subagents when the task is domain-specific. Each agent encodes project conventions and anti-patterns.

| Agent | When to use |
|-------|-------------|
| [`drizzle-expert`](./agents/drizzle-expert.md) | Schema changes, query patterns, migrations, transactions, pgvector |
| [`fastify-expert`](./agents/fastify-expert.md) | Plugins, routes, hooks, autoload, error handling, better-auth integration |
| [`vue-expert`](./agents/vue-expert.md) | Components, composables, Pinia stores, Vue Router |
| [`javascript-expert`](./agents/javascript-expert.md) | TypeScript refactors, error handling, general TS/JS patterns |
| [`scraping-expert`](./agents/scraping-expert.md) | Playwright automation, anti-bot evasion, adapter implementation |
| [`pipeline-expert`](./agents/pipeline-expert.md) | BullMQ workers, job queues, pipeline observability |

## Documentation Structure

### Core Documentation

- **[Architecture](./docs/architecture.md)** — System diagram, data flow, frontend/backend structure, deployment
- **[Style Guide](./docs/style-guide.md)** — Code conventions, naming, anti-patterns
- **[Commit Conventions](./docs/commit-conventions.md)** — Conventional Commits adapted to Brand Radar

### Brand Radar Platform Guides

- **[Overview](./docs/brand-platform/overview.md)** — Strategic vision, principles, phased roadmap, risks, checklist
- **[Pipeline](./docs/brand-platform/pipeline.md)** — Worker orchestration, BullMQ, scoring, observability
- **[Schema](./docs/brand-platform/schema.md)** — Data model, pgvector, Meilisearch index, Redis strategy
- **[Adapters](./docs/brand-platform/adapters.md)** — Scraping strategy, anti-bot tactics, Playwright config

### Architecture Decision Records (ADRs)

Key technical decisions are documented in `.claude/docs/decisions/`:

- **[ADR-001: Playwright Only](./docs/decisions/001-playwright-only.md)** — Why Playwright over Puppeteer/Selenium
- **[ADR-002: Meilisearch Not OpenSearch](./docs/decisions/002-meilisearch-not-opensearch.md)** — Search engine choice rationale
- **[ADR-003: Adapter vs Source Separation](./docs/decisions/003-adapter-vs-source-separation.md)** — Adapter architecture pattern

### When to Use Which Agent

| Task | Agent |
|------|-------|
| Database schema, Drizzle queries, migrations | [`drizzle-expert`](./agents/drizzle-expert.md) |
| Fastify routes, plugins, better-auth integration | [`fastify-expert`](./agents/fastify-expert.md) |
| Vue components, Pinia stores, composables | [`vue-expert`](./agents/vue-expert.md) |
| TypeScript refactors, error handling, utilities | [`javascript-expert`](./agents/javascript-expert.md) |
| Playwright automation, anti-bot, adapters | [`scraping-expert`](./agents/scraping-expert.md) |
| BullMQ workers, job queues, pipeline observability | [`pipeline-expert`](./agents/pipeline-expert.md) |

## Common Tasks

### Adding a new API domain (e.g., `trends`)

1. Add Drizzle table in `packages/db/src/schema/trends.ts` and re-export from `schema/index.ts`.
2. Run `pnpm db:generate` then `pnpm db:push` (or `db:migrate` in prod).
3. Create module directory: `apps/api/src/modules/trends/`
4. Create repository: `modules/trends/trends.repository.ts` (factory + optional `tx`).
5. Expose via `repositories` plugin and add decorator type in `apps/api/src/types/fastify.d.ts`.
6. Create service: `modules/trends/trends.service.ts` (business logic, domain errors).
7. Create handlers: `modules/trends/trends.handlers.ts` (HTTP layer only).
8. Create routes: `modules/trends/trends.routes.ts` with `autoPrefix = '/trends'`.

### Adding a new worker

1. Define job schema in `@brand-radar/shared` (Zod)
2. Create worker file in `apps/workers/src/workers/<name>.worker.ts`
3. Implement worker logic (validate job.data, emit metrics, enqueue downstream jobs)
4. Configure queue in `apps/workers/src/queues/config.ts`
5. Register worker in `apps/workers/src/index.ts`
6. Add integration test that enqueues job and verifies output

### Adding a new scraping adapter

1. Create adapter folder under `packages/adapters/<source>/`
2. Implement `ScraperAdapter` interface with `configure`, `discover`, `extract`, `probe`
3. Add Zod schema for extracted data in `@brand-radar/shared`
4. Add integration test that runs `probe()` and validates output shape
5. Register adapter in `packages/adapters/src/registry.ts`

### Adding a new Vue page

1. View component in `apps/web/src/views/<Name>View.vue`.
2. Route entry in `apps/web/src/router/index.ts`.
3. Pinia store in `apps/web/src/stores/<feature>.ts` if state is shared.
4. Composable in `apps/web/src/composables/` if behavior is reusable.

## Reference Documentation

- **[Architecture](./docs/architecture.md)** — system diagram, package dependencies, request lifecycle
- **[Style Guide](./docs/style-guide.md)** — code conventions, anti-patterns, framework specifics
- **[Commit Conventions](./docs/commit-conventions.md)** — Conventional Commits adapted to Brand Radar's monorepo scopes
- **[Brand Platform Guides](./docs/brand-platform/)** — domain-specific documentation (overview, pipeline, schema, adapters)
- **[Agents](./agents/)** — domain-specific subagent definitions
- **[Decisions](./docs/decisions/)** — Architecture Decision Records (ADRs)
