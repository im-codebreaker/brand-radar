# Brand Radar — System Architecture

> A modular, pipeline-driven, event-sourced intelligence platform for discovering, resolving, and ranking emerging fashion and perfume brands from social platforms and the web.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [High-Level Architecture](#high-level-architecture)
3. [Pipeline Stages](#pipeline-stages)
4. [Event Sourcing & Traceability](#event-sourcing--traceability)
5. [Data Layer](#data-layer)
6. [Frontend Architecture](#frontend-architecture)
7. [Deployment Architecture](#deployment-architecture)
8. [Key Design Principles](#key-design-principles)

---

## System Overview

Brand Radar is a **full-stack, event-sourced intelligence platform** that discovers, resolves, enriches, and scores emerging brands. The system is organized around a **staged, event-driven, queue-based pipeline** that processes signals from multiple sources with full traceability.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         BRAND RADAR — v2 ARCHITECTURE                    │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────────────────┐  ┌──────────────────────────────┐ │
│  │   @brand-radar/web               │  │   @brand-radar/api           │ │
│  │   (Vue 3 SPA)                    │  │   (Fastify Gateway)          │ │
│  │                                  │  │                              │ │
│  │  - Discovery Feed                │  │  - REST API                  │ │
│  │  - Event Debug Viewer (trace_id) │  │  - Authentication            │ │
│  │  - Data Quality Dashboard        │  │  - Search (hybrid)           │ │
│  │  - Trend Analysis                │  │  - Cost Governance           │ │
│  └──────────────────────────────────┘  └──────────────────────────────┘ │
│         │                                        │                      │
│         └─────────────────────┬──────────────────┘                      │
│                               │                                         │
│                    @brand-radar/shared                                  │
│                  (Zod schemas, types, utilities)                        │
│                               │                                         │
│                ┌──────────────┼──────────────┐                          │
│                │              │              │                          │
│         ┌──────▼─────┐  ┌─────▼──────┐  ┌──▼────────────┐              │
│         │ @brand-radar│  │ @brand-radar│  │ @brand-radar │              │
│         │     /db     │  │   /adapters │  │  /workers    │              │
│         │  (Drizzle)  │  │  (Scrapers) │  │  (BullMQ)    │              │
│         └─────┬───────┘  └─────┬──────┘  └──┬───────────┘              │
│               │                │             │                          │
│         ┌─────▼────────────────▼─────────────▼──────┐                   │
│         │  PostgreSQL + pgvector + Meilisearch      │                   │
│         │  + Event Backbone (system_events)         │                   │
│         │  (Source of Truth + Search Index)         │                   │
│         └────────────────────────────────────────────┘                  │
│                                                                          │
│  ┌──────────────────┬────────────────────────┬──────────────────┐       │
│  │    Redis         │     S3/MinIO           │   Observability  │       │
│  │  (Job Queues +   │  (Raw Storage +        │  (Prometheus +   │       │
│  │   appendonly)    │   Replay Archive)      │   Trace Logs)    │       │
│  └──────────────────┴────────────────────────┴──────────────────┘       │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## High-Level Architecture

### System Layers

```
┌──────────────────────────────────────────────────┐
│                 Frontend (Vue 3)                 │
│   Discovery Feed · Search · Brand Detail · Admin │
│   Event Debug Viewer · Data Quality Dashboard    │
└──────────────────────┬───────────────────────────┘
                       │ HTTP / WebSocket
┌──────────────────────▼─────────────────────────────┐
│              API Gateway (Fastify + TS)            │
│  Auth · Search · Brand · Discovery · Admin · Trend │
│  Event Explorer · Backfill Triggers                │
└──────┬──────────────────────────────┬──────────────┘
       │ Queue dispatch                │ Cache read
┌──────▼──────────┐          ┌────────▼──────────────┐
│  BullMQ + Redis │          │   Redis Cache Layer   │
│  (Job Queues)   │          │  (Rate limits, state) │
└──────┬──────────┘          └───────────────────────┘
       │
┌──────▼───────────────────────────────────────────┐
│                 Worker Cluster                   │
│                                                  │
│  Discovery → Extraction → Normalization          │
│  → Resolution → Deterministic Enrichment         │
│  → AI Enrichment (async) → Scoring → Index Sync │
│                                                  │
│  Each stage carries trace_id + pipeline_version  │
│  Each stage emits to Event Backbone on complete  │
│  Each stage checks processed_jobs (idempotency)  │
└──────┬──────────────────────┬────────────────────┘
       │ reads/writes          │ event emit per stage
┌──────▼──────────────────────▼────────────────────┐
│                  Data Layer                      │
│                                                  │
│  PostgreSQL  ← core entities, relations          │
│              ← system_events (event backbone)    │
│              ← pipeline_versions, backfill_jobs  │
│              ← processed_jobs (idempotency)      │
│              ← cost_events, data_quality_scores  │
│  pgvector    ← semantic embeddings (Phase 2)     │
│  Meilisearch ← full-text + faceted search index  │
│  Redis       ← queues + ephemeral state          │
│  S3 / MinIO  ← raw HTML, snapshots, logos        │
└──────────────────────────────────────────────────┘
```

### Monorepo Structure

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
│   ├── ai/                     # @brand-radar/ai - Embeddings, NLP (Phase 2)
│   ├── taxonomy/               # @brand-radar/taxonomy - Brand classification
│   ├── auth/                   # @brand-radar/auth - better-auth wrapper
│   └── config/
│       ├── tsconfig/           # Shared TypeScript configs
│       └── eslint-config/      # Shared ESLint config
├── .claude/                    # Claude Code configuration
│   ├── agents/                 # Specialized subagents
│   └── docs/                   # Architecture, style guide, commit conventions
│       ├── architecture.md     # This file
│       ├── brand-platform/     # Domain-specific guides
│       └── decisions/          # ADRs
├── infrastructure/             # nginx config
├── docker-compose.yml
└── Dockerfile                  # multi-stage: deps → apps {build, dev, prod}
```

---

## Pipeline Stages

The Brand Radar pipeline is a **staged, event-sourced, queue-driven data flow** from discovery to indexing:

```
[1] Discovery Worker          → finds candidate URLs / handles
        ↓ emit: discovery.created
[2] Extraction Worker         → pulls structured data from each candidate
        ↓ emit: crawl.completed · extraction.completed
[3] Normalization Worker      → cleans, slugifies, deduplicates
        ↓ emit: normalization.completed
[4] Entity Resolver           → merges into canonical entity or flags for review
        ↓ emit: entity.resolved · entity.merged
[5] Deterministic Enrichment  → WHOIS, Shopify detect, logo, tech stack
        ↓ emit: enrichment.completed
[6] AI Enrichment Worker      → embeddings, classification, style (async, non-blocking)
        ↓ emit: ai.enriched
[7] Scoring Worker            → computes composite score, saves to brand_scores
        ↓ emit: score.computed
[8] Index Sync Worker         → syncs PostgreSQL → Meilisearch
        ↓ emit: index.updated

All stages carry trace_id + pipeline_version throughout.
All stages check processed_jobs before executing (idempotency).
All event writes go to system_events (PostgreSQL, append-only).
```

### Stage Responsibilities

| Stage | Workers | Input | Output | Notes |
|-------|---------|-------|--------|-------|
| **Discovery** | 4 per adapter | DiscoveryQuery | RawCandidate (URL) | Crawls sources, emits raw candidates |
| **Extraction** | 10 concurrent | RawCandidate | ExtractedBrand | Parse HTML/JSON → structured data |
| **Normalization** | 20 concurrent | ExtractedBrand | NormalizedBrand | Clean, validate, dedupe candidates |
| **Entity Resolution** | 10 concurrent | NormalizedBrand | CanonicalEntity | Match/merge into canonical entities |
| **Deterministic Enrichment** | 5 concurrent | CanonicalEntity | EnrichedBrand | Fetch factual signals (no AI) |
| **AI Enrichment** | 2 concurrent | EnrichedBrand | AiEnrichedBrand | Embeddings, classification (cost-gated) |
| **Scoring** | 10 concurrent | EnrichedBrand | ScoredBrand | Compute brand scores (rule-based → ML) |
| **Indexing** | 10 concurrent | ScoredBrand | (indexed) | Push to Meilisearch for search |

**Key Properties:**
- **Idempotent:** Workers check `processed_jobs` before execution
- **Event-sourced:** Every stage emits to `system_events` on completion
- **Observable:** Every stage emits metrics and logs with `trace_id`
- **Isolated:** Each worker type runs in its own process pool (horizontal scaling)
- **Backpressure-aware:** Queue depth triggers throttling
- **Deterministic:** Same inputs + same pipeline version = same outputs

---

## Event Sourcing & Traceability

### Trace ID Lifecycle

Every request generates a `trace_id` at the discovery stage. This ID propagates through the entire pipeline — every downstream job inherits it.

```typescript
// Discovery Worker
const traceId = generateTraceId()  // e.g., "tr_abc123xyz"
const job = await discoveryQueue.add('discover', {
  query,
  traceId,
  pipelineVersion: ACTIVE_PIPELINE_VERSION,
})
```

### Event Backbone

Every worker emits a `system_events` row at completion:

```sql
CREATE TABLE system_events (
  id BIGSERIAL PRIMARY KEY,
  trace_id TEXT NOT NULL,
  event_type TEXT NOT NULL,                -- e.g. 'entity.resolved', 'score.computed'
  entity_id BIGINT REFERENCES canonical_entities(id),
  job_id BIGINT REFERENCES crawl_jobs(id),
  source_id BIGINT REFERENCES sources(id),
  pipeline_version TEXT,
  schema_version TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Why It Matters

- **Full replayability** — rebuild the entire state from events
- **Entity lineage** — trace any brand back to its raw discovery
- **Debugging** — find exactly where a pipeline broke for a given entity
- **ML training data** — structured history of all resolution and merge decisions
- **Auditable intelligence** — every score is backed by a complete event trail

### Pipeline Versioning

The `pipeline_versions` table stores the full DAG definition for each pipeline release:

```json
{
  "name": "core-pipeline",
  "version": "2.1.0",
  "dag": {
    "stages": [
      { "id": "discovery", "next": "extraction" },
      { "id": "extraction", "next": "normalization" },
      { "id": "normalization", "next": "resolution" },
      { "id": "resolution", "next": "enrichment" },
      { "id": "enrichment", "next": "scoring" },
      { "id": "scoring", "next": "index_sync" }
    ]
  }
}
```

**Benefits:**
- Run pipeline v1 and v2 in parallel for comparison
- Prevent silent logic breakage when workers are updated
- Enable historical recomputation against a specific pipeline version

### Idempotency System

Every worker generates a deterministic idempotency key:

```
{job_type}:{job_id}:{pipeline_version}
```

Before execution, workers check `processed_jobs`:

```sql
CREATE TABLE processed_jobs (
  idempotency_key TEXT PRIMARY KEY,
  job_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);
```

This makes every queue retry, backfill, and manual re-trigger safe by default.

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
│   PostgreSQL    │  ← Source of truth (entities, relations, events)
│   + pgvector    │  ← Semantic embeddings (Phase 2)
│                 │  ← Event Backbone (system_events) — append-only
│                 │  ← Pipeline Versioning (pipeline_versions)
│                 │  ← Idempotency (processed_jobs)
│                 │  ← Cost Tracking (cost_events)
│                 │  ← Data Quality (data_quality_scores)
└────────┬────────┘
         │ ephemeral
         ▼
┌─────────────────┐
│      Redis      │  ← Job queues, rate limits, session state
│  (appendonly)   │
└─────────────────┘

┌─────────────────┐
│   S3 / MinIO    │  ← Raw HTML/JSON, logos, screenshots (immutable)
└─────────────────┘
```

### Core PostgreSQL Tables

**Entities:**
- `canonical_entities` — Deduplicated brand entities, scores, metadata
- `entity_aliases` — Alternative names for entity resolution
- `brand_identities` — Platform-specific profiles (Instagram, TikTok, website)
- `entity_edges` — Graph relationships (Phase 3)

**Pipeline:**
- `adapters` — Scraping adapter registry
- `sources` — Configured scraping sources (schedule, priority, config)
- `crawl_jobs` — Execution records for scheduled crawls
- `raw_discoveries` — Unprocessed brand signals from scrapers

**Resolution:**
- `entity_resolution_jobs` — Tracks matching and merging decisions
- `merge_candidates` — Proposed entity merges (manual review queue)

**Taxonomy:**
- `categories` — Hierarchical brand taxonomy
- `brand_categories` — Many-to-many entity ↔ category mapping

**Scoring:**
- `brand_scores` — Historical scoring snapshots (time-series)

**Health:**
- `source_health` — Adapter health monitoring (success rates, CAPTCHA encounters)
- `crawl_profiles` — Reusable Playwright configurations

**v2 Event Sourcing & Governance:**
- `system_events` — **Event backbone** — every mutation emits here
- `processed_jobs` — **Idempotency tracking** — prevents double-processing
- `pipeline_versions` — **DAG definitions** — versioned pipeline execution
- `backfill_jobs` — **Replay engine** — reprocess raw data through new versions
- `data_quality_scores` — **Quality metrics** per entity
- `cost_events` — **Budget tracking** — all external service costs

### Indexing Strategy

- **Meilisearch:** Full-text search, faceted filters (category, score, founded_year), typo tolerance, custom ranking
- **Sync:** Incremental after scoring/enrichment; weekly full re-index (off-peak)
- **pgvector (Phase 2):** Semantic similarity (cosine distance on 1536-dim embeddings)

---

## Frontend Architecture

### View Components

```
views/
├── DiscoveryFeedView.vue
├── BrandDetailsView.vue
├── SearchResultsView.vue
├── TrendAnalysisView.vue
├── EventDebugView.vue          # NEW: trace_id explorer
├── DataQualityView.vue         # NEW: quality dashboard
├── CostGovernanceView.vue      # NEW: budget tracking
└── AdminQueueView.vue
```

### State Management (Pinia)

```
stores/
├── brands.ts           # Brand list, filtering, pagination
├── discovery.ts        # Discovery feed state
├── search.ts           # Search query, results
├── events.ts           # NEW: event exploration (trace_id lookup)
└── session.ts          # Auth session
```

### Forms & Validation

- **Shared Zod schemas** from `@brand-radar/shared`
- **`useZodForm` composable** for two-way binding
- **Reusable form components** in `components/forms/`

### UI Library

- **Tailwind v4** for styling (utility-first, no custom CSS except where unavoidable)
- **Rebnd UI** components for common patterns (buttons, modals, inputs)

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
    command: redis-server --appendonly yes  # IMPORTANT: persistence
    
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
      - ACTIVE_PIPELINE_VERSION=2.1.0
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
      - ACTIVE_PIPELINE_VERSION=2.1.0
    depends_on: [postgres, redis]
    deploy:
      replicas: 3  # Scale per worker type
```

**Dockerfile:** Multi-stage build producing `api-prod`, `web-prod`, `workers-prod` targets.

---

## Key Design Principles

### 1. Pipeline-First

Every piece of data flows through defined stages, not ad-hoc scrapers. No direct write-to-search shortcuts. Each stage has its own queue and worker pool.

### 2. Event-Sourced Core

**Every mutation emits a system event.** The `system_events` table is append-only and forms the backbone for:
- Full system replay
- Entity lineage tracing
- ML training data
- Debugging

### 3. Append-Only Truth

No destructive updates to core signals. Entity merges are recorded, not deleted. Score history is time-series, not overwritten.

### 4. Adapter Abstraction

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

### 5. Raw Storage Always

Store raw HTML/JSON in S3/MinIO **before parsing**. Enables:
- Replaying extractions without re-crawling when adapter logic changes
- Compliance audits (immutable raw record)
- Debugging extraction failures
- Backfills with new pipeline versions

### 6. Deterministic Pipelines

Same inputs + same pipeline version = same outputs, always. Achieved through:
- Versioned DAG execution (`pipeline_versions`)
- Idempotency keys (`processed_jobs`)
- Immutable raw storage

### 7. Idempotent Workers

Every job is safe to retry without side effects. Workers check `processed_jobs` before execution.

### 8. Versioned DAG Execution

Pipelines evolve safely; old versions remain replayable. Every job records its `pipeline_version`.

### 9. Entity Resolution Is Foundational

One canonical `brand` record per brand, resolved before scoring or indexing. Prevents:
- Duplicate entries in search results
- Inflated popularity scores (same brand counted 10x)
- Broken ecommerce signal aggregation

### 10. Deterministic Before AI

Core pipeline (discovery → extraction → normalization → resolution → deterministic enrichment) must never depend on AI to function. Rule-based scoring (Phase 1) works with just data. AI (Phase 2+) is optional acceleration.

**AI Rules:**
- Never on the ingestion critical path
- Always async
- Always cost-gated before execution
- Always versioned (model name + dims recorded)
- AI workers are isolated — a failure never propagates to core pipeline

### 11. Cost-Aware AI Usage

AI is strictly gated and metered. The `cost_events` table tracks every external service call. Daily budget enforcement prevents runaway costs.

### 12. Observability from Day One

Every worker emits structured logs and Prometheus metrics with `trace_id`. **Silent scraper failures are the #1 reliability killer.** Key signals:
- Adapter health status (probe results)
- Queue depth per stage
- Worker job duration and failure rates
- Search latency
- Cost per service

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
   - Zod validates request from @brand-radar/shared
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

- **[Overview & Roadmap](./brand-platform/overview.md)** — Product vision, phased roadmap, core principles, v2 event-sourced architecture
- **[Pipeline Architecture](./brand-platform/pipeline.md)** — Worker orchestration, event emission, job queues, scoring system, observability
- **[Data Layer & Schema](./brand-platform/schema.md)** — PostgreSQL tables, event backbone, pgvector, Meilisearch indexing
- **[Adapter & Scraping Strategy](./brand-platform/adapters.md)** — Anti-bot tactics, Playwright config, source-specific patterns
- **[Style Guide](./style-guide.md)** — Code conventions, naming, TypeScript patterns
- **[Commit Conventions](./commit-conventions.md)** — Conventional Commits for monorepo

---

## Specialized Agents

Delegate to subagents for domain-specific work:

| Agent | When to use |
|-------|------------|
| `drizzle-expert` | Schema changes, query patterns, migrations, pgvector, event backbone tables |
| `fastify-expert` | Plugins, routes, hooks, error handling |
| `vue-expert` | Components, composables, Pinia stores |
| `scraping-expert` | Adapter implementation, anti-bot strategies, browser config |
| `pipeline-expert` | Worker implementation, BullMQ queues, scoring logic, event emission |

See `.claude/agents/` for full definitions.
