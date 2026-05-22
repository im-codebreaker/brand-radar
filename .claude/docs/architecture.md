# Brand Radar — System Architecture

> A modular, pipeline-driven intelligence platform for discovering, resolving, and ranking emerging fashion and perfume brands from social platforms and the web.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [High-Level Architecture](#high-level-architecture)
3. [Pipeline Stages](#pipeline-stages)
4. [Data Layer](#data-layer)
5. [Frontend Architecture](#frontend-architecture)
6. [Deployment Architecture](#deployment-architecture)
7. [Key Design Principles](#key-design-principles)

---

## System Overview

Brand Radar is a **full-stack intelligence platform** that discovers, resolves, enriches, and scores emerging brands. The system is organized around a **staged, queue-driven pipeline** that processes signals from multiple sources.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            BRAND RADAR MONOREPO                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────┐  ┌────────────────────────────────┐  │
│  │   @brand-radar/web               │  │   @brand-radar/api             │  │
│  │   (Vue 3 SPA - Discovery UI)     │  │   (Fastify - Gateway)          │  │
│  │                                  │  │                                │  │
│  │  - Dashboard & Search             │  │  - REST API endpoints          │  │
│  │  - Brand Discovery Feed           │  │  - Authentication             │  │
│  │  - Trend Analysis View            │  │  - Swagger/OpenAPI            │  │
│  │  - Pinia state management         │  │  - Error handling             │  │
│  └──────────────────────────────────┘  └────────────────────────────────┘  │
│         │                                        │                          │
│         │                                        │                          │
│         └─────────────────────┬──────────────────┘                          │
│                               │                                            │
│                    @brand-radar/validations                               │
│                  (Shared Zod schemas — SOURCE OF TRUTH)                   │
│                               │                                            │
│                ┌──────────────┼──────────────┐                             │
│                │              │              │                             │
│         ┌──────▼─────┐  ┌─────▼──────┐  ┌──▼────────────┐                 │
│         │ @brand-radar│  │ @brand-radar│  │ @brand-radar │                 │
│         │     /db     │  │   /adapters │  │  /workers    │                 │
│         │  (Drizzle)  │  │  (Scrapers) │  │  (BullMQ)    │                 │
│         └─────┬───────┘  └─────┬──────┘  └──┬───────────┘                 │
│               │                │             │                             │
│         ┌─────▼────────────────▼─────────────▼──────┐                      │
│         │  PostgreSQL + pgvector + Meilisearch      │                      │
│         │  (Source of Truth, Search Index)           │                      │
│         └─────────────────────────────────────────────┘                    │
│                                                                             │
│  ┌──────────────────┬────────────────────────┬──────────────────┐           │
│  │    Redis         │     S3/MinIO           │   Observability  │           │
│  │  (Job Queues)    │  (Raw Storage)         │  (Prometheus)    │           │
│  └──────────────────┴────────────────────────┴──────────────────┘           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## High-Level Architecture

### Monorepo Structure

```
brand-radar/
├── apps/
│   ├── api/                    # @brand-radar/api - Fastify API gateway
│   │   └── src/
│   │       ├── plugins/        # external (cors, helmet, swagger) + app (db, auth)
│   │       ├── routes/         # autoloaded API endpoints
│   │       ├── types/          # FastifyInstance augmentation
│   │       └── server.ts
│   │
│   └── web/                    # @brand-radar/web - Vue 3 SPA
│       └── src/
│           ├── components/     # UI components (forms/, ui/)
│           ├── composables/    # use* hooks
│           ├── stores/         # Pinia stores
│           ├── views/          # route-level components
│           └── router/         # Vue Router config
│
├── packages/
│   ├── validations/            # @brand-radar/validations - Zod schemas
│   ├── types/                  # @brand-radar/types - TS types & envelopes
│   ├── db/                     # @brand-radar/db - Drizzle client + schema
│   │   ├── src/schema/         # PostgreSQL tables (brands, events, social, etc.)
│   │   ├── drizzle/            # migrations (committed to git)
│   │   └── scripts/seed.ts
│   ├── adapters/               # @brand-radar/adapters - Scraper plugins
│   │   ├── instagram/          # Instagram crawler
│   │   ├── tiktok/             # TikTok crawler
│   │   ├── web/                # Generic web crawler + Shopify/WooCommerce
│   │   ├── reddit/             # Reddit API client
│   │   └── src/
│   │       ├── browser/        # Playwright configuration
│   │       ├── rate-limiter.ts # Bottleneck rate limiting
│   │       └── types.ts        # ScraperAdapter interface
│   ├── workers/                # @brand-radar/workers - BullMQ worker pool
│   │   └── src/
│   │       ├── discovery/      # Discovery worker
│   │       ├── extraction/     # HTML/JSON extraction
│   │       ├── normalization/  # Deduplication, validation
│   │       ├── enrichment/     # Social stats, ecommerce signals
│   │       ├── scoring/        # Brand scoring (v1: rules, v2: ML)
│   │       ├── indexing/       # Meilisearch sync
│   │       └── queues/         # Queue configuration
│   ├── search/                 # @brand-radar/search - Meilisearch client
│   ├── helpers/                # @brand-radar/helpers - Shared utilities
│   └── config/
│       ├── tsconfig/           # shared tsconfigs
│       └── eslint-config/      # shared ESLint config
│
├── .claude/
│   ├── agents/                 # Specialized subagents
│   ├── docs/
│   │   ├── architecture.md     # This file
│   │   ├── style-guide.md      # Code conventions
│   │   ├── commit-conventions.md
│   │   └── brand-platform/
│   │       ├── overview.md     # Product vision & roadmap
│   │       ├── pipeline.md     # Worker orchestration
│   │       ├── schema.md       # Data layer design
│   │       └── adapters.md     # Scraping strategy
│   └── settings.json
│
├── infrastructure/             # nginx, terraform
├── docker-compose.yml
└── Dockerfile
```

---

## Pipeline Stages

The Brand Radar pipeline is a **staged, queue-driven data flow** from discovery to indexing:

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  Discovery  │─────▶│ Extraction  │─────▶│Normalization│
│   Workers   │      │   Workers   │      │   Workers   │
└─────────────┘      └─────────────┘      └─────────────┘
       │                                          │
       │                                          ▼
       │                                   ┌─────────────┐
       │                                   │ Enrichment  │
       │                                   │   Workers   │
       │                                   └──────┬──────┘
       │                                          │
       ▼                                          ▼
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Storage   │      │   Scoring   │      │   Search    │
│  (S3+PSQL)  │      │   Workers   │      │  Indexing   │
└─────────────┘      └─────────────┘      └─────────────┘
```

### Stage Responsibilities

| Stage | Workers | Input | Output | Notes |
|-------|---------|-------|--------|-------|
| **Discovery** | 4 per adapter | DiscoveryQuery | RawCandidate (URL) | Crawls sources, emits raw candidates |
| **Extraction** | 10 concurrent | RawCandidate | ExtractedBrand | Parse HTML/JSON → structured data |
| **Normalization** | 20 concurrent | ExtractedBrand | NormalizedBrand | Clean, validate, dedupe candidates |
| **Enrichment** | 5 concurrent | NormalizedBrand | EnrichedBrand | Fetch social stats, ecommerce signals |
| **Scoring** | 10 concurrent | EnrichedBrand | ScoredBrand | Compute brand scores (rule-based v1) |
| **Indexing** | 10 concurrent | ScoredBrand | (indexed) | Push to Meilisearch for search |

**Key Properties:**
- **Idempotent:** Workers can retry without double-processing
- **Observable:** Every stage emits metrics and logs
- **Isolated:** Each worker type runs in its own process pool (horizontal scaling)
- **Backpressure-aware:** Queue depth triggers throttling

---

## Data Layer

### Storage Components

```
┌─────────────────┐
│   Meilisearch   │  ← Full-text + faceted search (read-only view)
│  (search index) │
└────────┬────────┘
         │ sync
         ▼
┌─────────────────┐
│   PostgreSQL    │  ← Source of truth (entities, relations)
│   + pgvector    │  ← Semantic embeddings (Phase 3: similarity search)
└────────┬────────┘
         │ ephemeral
         ▼
┌─────────────────┐
│      Redis      │  ← Job queues, rate limits, session state
└─────────────────┘

┌─────────────────┐
│   S3 / MinIO    │  ← Raw HTML/JSON, logos, screenshots (immutable)
└─────────────────┘
```

### Core PostgreSQL Tables

- **`brands`** — Canonical brand entities, scores, metadata
- **`discovery_events`** — Raw ingestion records (one per source per URL)
- **`social_profiles`** — Instagram, TikTok, YouTube handles + metrics
- **`social_snapshots`** — Daily follower/engagement snapshots (for trend detection)
- **`ecommerce_signals`** — Shopify/WooCommerce detection, product counts, pricing
- **`trends`** — Computed metrics (follower growth, mention spikes, search volume)

### Indexing Strategy

- **Meilisearch:** Full-text search, faceted filters (category, score, founded_year), typo tolerance, custom ranking
- **Sync:** Incremental after scoring/enrichment; weekly full re-index (off-peak)
- **pgvector:** Phase 3 addition for semantic similarity (cosine distance on 1536-dim embeddings)

---

## Frontend Architecture

### View Components

```
views/
├── DiscoveryFeedView.vue
├── BrandDetailsView.vue
├── SearchResultsView.vue
├── TrendAnalysisView.vue
└── AdminQueueView.vue
```

### State Management (Pinia)

```
stores/
├── brands.ts           # Brand list, filtering, pagination
├── discovery.ts        # Discovery feed state
├── search.ts           # Search query, results
└── session.ts          # Auth session (if implemented)
```

### Forms & Validation

- **Shared Zod schemas** from `@brand-radar/validations`
- **`useZodForm` composable** for two-way binding
- **Reusable form components** in `components/forms/`

### UI Library

- **Tailwind v4** for styling (utility-first, no custom CSS except where unavoidable)
- **@rebnd/ui** components for common patterns (buttons, modals, inputs)

---

## Deployment Architecture

### Development (Host Run)

```bash
# Infrastructure (Docker)
docker compose up -d postgres redis meilisearch

# Apps & tooling on host (hot reload)
pnpm dev                    # Starts all apps (api :3000, web :5173)
pnpm --filter @brand-radar/api dev
pnpm --filter @brand-radar/web dev
pnpm --filter @brand-radar/workers dev
```

**Environment:** `.env.local` overrides for `DATABASE_URL`, `REDIS_URL`, `MEILISEARCH_URL`

### Production (Docker Compose / Kubernetes)

```yaml
services:
  postgres:
    image: postgres:16-alpine
    volumes: [postgres_data:/var/lib/postgresql/data]
    
  redis:
    image: redis:7-alpine
    
  meilisearch:
    image: getmeili/meilisearch:latest
    
  api:
    build:
      context: .
      target: api-prod
    environment:
      - DATABASE_URL=postgresql://postgres:pass@postgres:5432/brand_radar
      - REDIS_URL=redis://redis:6379
      - MEILISEARCH_URL=http://meilisearch:7700
      - NODE_ENV=production
    depends_on: [postgres, redis, meilisearch]
    
  web:
    build:
      context: .
      target: web-prod
    environment:
      - VITE_API_URL=/api
    depends_on: [api]
    
  workers:
    build:
      context: .
      target: workers-prod
    environment:
      - DATABASE_URL=postgresql://postgres:pass@postgres:5432/brand_radar
      - REDIS_URL=redis://redis:6379
    depends_on: [postgres, redis]
    deploy:
      replicas: 3  # Scale per worker type
```

**Dockerfile:** Multi-stage build producing `api-prod`, `web-prod`, `workers-prod` targets.

---

## Key Design Principles

### 1. Pipeline-First

Every piece of data flows through defined stages, not ad-hoc scrapers. No direct write-to-search shortcuts. Each stage has its own queue and worker pool.

### 2. Adapter Abstraction

Every source (Instagram, TikTok, web, Reddit) is a self-contained plugin implementing `ScraperAdapter`:
```typescript
interface ScraperAdapter {
  id: string
  sourceType: 'instagram' | 'tiktok' | 'website' | 'reddit' | 'etsy'
  discover(query: DiscoveryQuery): AsyncGenerator<RawCandidate>
  extract(url: string): Promise<ExtractedBrand>
  probe(): Promise<AdapterHealth>
}
```

**Adding a new source:** Drop a new adapter folder. Zero changes to orchestration.

### 3. Raw Storage Always

Store raw HTML/JSON in S3/MinIO **before parsing**. Enables:
- Replaying extractions without re-crawling when adapter logic changes
- Compliance audits (immutable raw record)
- Debugging extraction failures

### 4. Entity Resolution Is Foundational

One canonical `brand` record per brand, resolved before scoring or indexing. Prevents:
- Duplicate entries in search results
- Inflated popularity scores (same brand counted 10x)
- Broken ecommerce signal aggregation

### 5. Deterministic Before AI

Core pipeline (discovery → extraction → normalization) must never depend on AI to function. Rule-based scoring (v1) works with just data. ML (v2, Phase 3) is optional acceleration.

### 6. Observability from Day One

Every worker emits structured logs and Prometheus metrics. **Silent scraper failures are the #1 reliability killer.** Key signals:
- Adapter health status (probe results)
- Queue depth per stage
- Worker job duration and failure rates
- Search latency

### 7. Error Handling & Retry Strategy

| Error Type | Handling | Example |
|-----------|----------|---------|
| Transient (network timeout, rate limit) | Retry with exponential backoff | `error.code === 'ETIMEDOUT'` |
| Permanent (invalid data, schema mismatch) | Move to dead-letter queue (DLQ) | `extraction_success === false` |
| Adapter failure (403, captcha) | Pause adapter, alert on-call | HTTP 403 Forbidden |

---

## Request Lifecycle (API)

```
1. Frontend sends fetch to /api/v1/<route>
   
2. Fastify middleware pipeline:
   - external/cors        → CORS headers
   - external/helmet      → security headers
   - app/db               → fastify.db decorator (Drizzle client)
   - app/error-handler    → global error handler
   
3. Route handler:
   - Zod validates request from @brand-radar/validations
   - Handler calls service layer
   - Service queries repositories
   - Repositories use fastify.db (Drizzle ORM)
   
4. Response:
   - Zod serializes response shape
   - fastify-type-provider-zod returns JSON
```

---

## Backend Patterns

### Module Structure

```
modules/<feature>/
├── <feature>.routes.ts      # Fastify plugin, autoPrefix = '/<feature>'
├── <feature>.handlers.ts    # HTTP layer (request/response, status codes)
├── <feature>.service.ts     # Business logic (validation, errors)
└── <feature>.repository.ts  # Data access (Drizzle queries, transactions)
```

**Dependency flow:** routes → handlers → service → repository

### Repository Pattern

Each method accepts optional `tx?: DbClient` for transaction support:

```typescript
export function createBrandsRepository(db: DatabaseClient) {
  return {
    async findById(id: string, tx?: DbClient): Promise<Brand | undefined> {
      return (tx ?? db).query.brands.findFirst({ where: eq(brands.id, id) })
    },
    async create(data: CreateBrandInput, tx?: DbClient): Promise<Brand> {
      return (tx ?? db).insert(brands).values(data).returning()
    },
  }
}
```

### Service Pattern

Business logic, domain errors (NotFoundError, ConflictError):

```typescript
export function createBrandsService(repo: BrandsRepository) {
  return {
    async createBrand(data: CreateBrandInput) {
      const existing = await repo.findBySlug(data.slug)
      if (existing) throw new ConflictError('Brand slug already exists')
      return repo.create(data)
    },
  }
}
```

---

## Database Patterns (Drizzle)

- **Schema as code:** TS under `packages/db/src/schema/<feature>.ts`
- **Casing:** `casing: 'snake_case'` in `drizzle.config.ts` maps `camelCase` TS to `snake_case` SQL
- **Migrations:** Committed under `packages/db/drizzle/`
- **pgvector:** Native support for vector columns and `cosineDistance` / `l2Distance` operators

### Generating Migrations

```bash
# Edit packages/db/src/schema/<feature>.ts
pnpm db:generate              # Produces SQL in packages/db/drizzle/
pnpm db:push (dev) or db:migrate (prod)
```

---

## Reference Documentation

For detailed information on specific domains, see:

- **[Overview & Roadmap](./brand-platform/overview.md)** — Product vision, phased roadmap, core principles
- **[Pipeline Architecture](./brand-platform/pipeline.md)** — Worker orchestration, job queues, scoring system, observability
- **[Data Layer & Schema](./brand-platform/schema.md)** — PostgreSQL tables, Meilisearch indexing, pgvector config
- **[Adapter & Scraping Strategy](./brand-platform/adapters.md)** — Anti-bot tactics, Playwright config, source-specific patterns
- **[Style Guide](./style-guide.md)** — Code conventions, naming, TypeScript patterns
- **[Commit Conventions](./commit-conventions.md)** — Conventional Commits for monorepo

---

## Specialized Agents

Delegate to subagents for domain-specific work:

| Agent | When to use |
|-------|------------|
| `drizzle-expert` | Schema changes, query patterns, migrations, pgvector |
| `fastify-expert` | Plugins, routes, hooks, error handling |
| `vue-expert` | Components, composables, Pinia stores |
| `scraping-expert` | Adapter implementation, anti-bot strategies, browser config |
| `pipeline-expert` | Worker implementation, BullMQ queues, scoring logic |

See `.claude/agents/` for full definitions.