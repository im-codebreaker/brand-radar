# Brand Radar

> **Discover emerging brands before everyone else.**

A pipeline-driven, event-sourced intelligence platform that discovers, resolves, and ranks emerging fashion and perfume brands from social platforms and the web — with full traceability from discovery to insight.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

---

## Why Brand Radar?

### The Problem
Trend agencies, fashion scouts, and brand intelligence teams manually track emerging brands across Instagram, TikTok, Reddit, and niche forums. It's **slow, expensive, and incomplete**.

### The Solution
Brand Radar automates discovery, resolution, and scoring with a fully traceable pipeline:

- ✅ **Event-sourced from day one** — every pipeline action is recorded, replay any stage at any time
- ✅ **Idempotent workers** — safe retries, no duplicate processing, cost-controlled
- ✅ **Production-ready** — built for scale with Drizzle, BullMQ, Meilisearch, and pgvector
- ✅ **Deterministic before AI** — core pipeline works without AI; embeddings and classification are optional acceleration
- ✅ **Full traceability** — `trace_id` propagation from discovery to scoring, debug any entity's full lineage

### Why Not Just Use...?

| Alternative | Why Brand Radar is Different |
|-------------|------------------------------|
| **Manual tracking** | Automated discovery across 4+ sources, processes 1000+ brands/day |
| **Generic web scrapers** | Purpose-built for brand intelligence with entity resolution, anti-bot stealth, and quality scoring |
| **Social listening tools** | Goes beyond mentions — resolves entities, tracks ecommerce signals, scores uniqueness |
| **Build it yourself** | Production-ready with event sourcing, idempotency, cost governance, and backfill engine built in |

---

## Architecture Highlights

### Event-Sourced Core
Every mutation emits to the `system_events` backbone. Never lose context. Always reproducible.

```
Discovery → Extraction → Normalization → Resolution → Enrichment → Scoring → Indexing
     ↓          ↓              ↓              ↓            ↓           ↓          ↓
  event      event          event          event        event       event      event
```

Every stage:
- ✅ Checks `processed_jobs` for idempotency
- ✅ Emits to `system_events` with `trace_id` + `pipeline_version`
- ✅ Propagates trace context to downstream jobs
- ✅ Safe to retry, replay, or backfill

### Pipeline Versioning
Change your pipeline logic without losing history. The `pipeline_versions` table tracks DAG definitions. Run v1 and v2 in parallel, compare outputs, then cutover.

### Cost Governance
AI is expensive. The `cost_events` table tracks every OpenAI/proxy call. Daily budgets prevent runaway costs. AI enrichment is **always async, always cost-gated**.

### Data Quality First
The `data_quality_scores` table tracks completeness, freshness, consistency, and source reliability per entity. Quality gates scoring — stale data scores lower.

---

## Quick Start

### Prerequisites
- **Node.js** 22+ and **pnpm** 9+
- **Docker** 24+ and **Docker Compose** 2.20+

### 1. Clone & Install

```bash
git clone git@github.com:im-codebreaker/brand-radar.git
cd brand-radar
pnpm install
```

### 2. Start Full Stack with Docker

```bash
docker compose up -d
```

This starts the complete stack with **Traefik** as reverse proxy:
- **PostgreSQL 16** with pgvector (port 5432)
- **Redis 7** with appendonly persistence (port 6379)
- **Meilisearch v1.10** for full-text search (port 7700)
- **API** (Fastify) via Traefik → http://localhost/api
- **Web** (Vue 3) via Traefik → http://localhost
- **Workers** (BullMQ) background processing
- **Scheduler** cron-based jobs
- **Traefik Dashboard** → http://localhost:8080

**Access the application:**
- **Frontend:** http://localhost
- **API:** http://localhost/api
- **API Health:** http://localhost/api/health
- **Traefik Dashboard:** http://localhost:8080

### 3. Setup Database

```bash
# Access API container
docker compose exec api sh

# Run migrations and seed
pnpm db:push        # Create tables from Drizzle schema
pnpm db:seed        # Seed demo brands and categories

# Exit container
exit
```

### 4. Verify Setup

```bash
# Check API health
curl http://localhost/api/health

# Check Traefik dashboard
open http://localhost:8080

# Check queue status
docker compose exec redis redis-cli
> LLEN bull:discovery:wait

# View logs
docker compose logs -f api
docker compose logs -f workers
```

**✅ Done! Access the application at http://localhost**

---

## Alternative: Local Development (Host Run)

If you prefer running apps on your host with hot reload:

### 1. Start Infrastructure Only

```bash
docker compose up -d postgres redis meilisearch
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/brand_radar
REDIS_URL=redis://localhost:6379
MEILISEARCH_URL=http://localhost:7700
ACTIVE_PIPELINE_VERSION=1.0.0
```

### 3. Setup Database

```bash
pnpm db:push        # Create tables
pnpm db:seed        # Seed data
```

### 4. Start Development

```bash
pnpm dev
```

This starts all apps in parallel:
- **API** (Fastify) → http://localhost:3000
- **Web** (Vue 3) → http://localhost:5173
- **Workers** (BullMQ) → background processing
- **Scheduler** → cron-based discovery jobs

**Access:**
- **Frontend:** http://localhost:5173
- **API:** http://localhost:3000
- **API Health:** http://localhost:3000/health

---

## Tech Stack

### Core

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | Vue 3.5 + Vite 7 + Pinia + Tailwind v4 | Reactive, fast, composable |
| **API** | Fastify 5 + Zod + Drizzle | Type-safe, fast, clean architecture |
| **Workers** | BullMQ + Playwright + Redis | Reliable job queues, stealth scraping |
| **Database** | PostgreSQL 16 + pgvector | ACID + vector embeddings |
| **Search** | Meilisearch | Fast, typo-tolerant, faceted search |
| **Cache** | Redis 7 (appendonly) | Job queues + rate limiting |
| **Storage** | S3/MinIO | Immutable raw HTML/JSON for replay |
| **Auth** | better-auth | Session-based, extensible |

### Phase 2 (AI)

| Layer | Technology | Why |
|-------|-----------|-----|
| **Embeddings** | OpenAI `text-embedding-3-small` | 1536-dim vectors, cost-efficient |
| **Semantic Search** | pgvector HNSW index | Fast cosine similarity search |
| **Classification** | LLM-based (GPT-4o-mini) | Auto-categorization with confidence |

---

## Project Structure

```
brand-radar/
├── apps/
│   ├── api/                    # Fastify REST API
│   │   ├── modules/            # DDD modules (brands, discovery, admin)
│   │   ├── plugins/            # Fastify plugins (db, redis, search, auth)
│   │   └── server.ts
│   ├── web/                    # Vue 3 SPA
│   │   ├── views/              # Discovery feed, search, brand detail, admin
│   │   ├── components/         # Reusable UI components
│   │   ├── stores/             # Pinia stores (brands, events, search)
│   │   └── composables/        # useSearch, useBrands, etc.
│   ├── workers/                # BullMQ job processors
│   │   └── src/workers/
│   │       ├── discovery.worker.ts       # Crawl sources
│   │       ├── extraction.worker.ts      # Parse raw data
│   │       ├── normalization.worker.ts   # Clean & dedupe
│   │       ├── resolution.worker.ts      # Entity matching
│   │       ├── enrichment.worker.ts      # Deterministic enrichment
│   │       ├── ai-enrichment.worker.ts   # Async AI processing
│   │       ├── scoring.worker.ts         # Compute scores
│   │       └── indexing.worker.ts        # Sync to Meilisearch
│   └── scheduler/              # Cron-based job orchestration
├── packages/
│   ├── db/                     # Drizzle ORM + PostgreSQL schema
│   │   ├── src/schema/
│   │   │   ├── canonical-entities.ts     # Core brand entities
│   │   │   ├── system-events.ts          # Event backbone
│   │   │   ├── processed-jobs.ts         # Idempotency tracking
│   │   │   ├── pipeline-versions.ts      # DAG definitions
│   │   │   ├── cost-events.ts            # Budget tracking
│   │   │   └── data-quality-scores.ts    # Quality metrics
│   │   └── drizzle/            # Migrations (committed to git)
│   ├── search/                 # Meilisearch client
│   ├── redis/                  # Redis client + queue definitions
│   ├── adapters/               # Scraping adapters (Instagram, TikTok, web)
│   ├── shared/                 # Zod schemas, types, utilities
│   ├── ai/                     # Embeddings, NLP (Phase 2)
│   ├── taxonomy/               # Brand classification
│   └── auth/                   # better-auth wrapper
└── .claude/                    # Documentation & agents
    ├── docs/
    │   ├── architecture.md
    │   ├── brand-platform/
    │   │   ├── overview.md             # Strategic vision
    │   │   ├── pipeline.md             # Worker orchestration
    │   │   ├── schema.md               # Database design
    │   │   └── adapters.md             # Scraping patterns
    │   └── decisions/          # ADRs
    └── agents/                 # Specialized Claude agents
```

---

## Key Concepts

### Event Sourcing

Every pipeline action emits an event to `system_events`:

```typescript
await emitEvent({
  traceId: job.data.traceId,
  eventType: 'entity.resolved',
  entityId: entity.id,
  pipelineVersion: job.data.pipelineVersion,
  payload: { confidence: 0.95, matchedVia: 'url_domain' },
})
```

**Benefits:**
- Full replay from raw data
- Debug entity lineage (where did this brand come from?)
- ML training data (resolution decisions, merge signals)
- Auditable intelligence (every score has a trail)

### Idempotency

Every worker checks `processed_jobs` before execution:

```typescript
const idempotencyKey = `scoring:${entityId}:${pipelineVersion}`
const alreadyProcessed = await db.query.processedJobs.findFirst({
  where: eq(processedJobs.idempotencyKey, idempotencyKey),
})

if (alreadyProcessed) return  // Skip — already scored
```

**Benefits:**
- Safe retries (network failures, rate limits)
- Backfills don't double-write
- Manual re-triggers are safe

### Trace Propagation

Every job carries `traceId` + `pipelineVersion` from discovery to indexing:

```typescript
// Discovery worker generates trace_id
const traceId = generateTraceId()  // "tr_abc123xyz"

// Downstream workers inherit it
await extractionQueue.add('extract', {
  candidateUrl,
  traceId: job.data.traceId,
  pipelineVersion: job.data.pipelineVersion,
})
```

**Benefits:**
- Filter logs by `traceId` — see full entity lifecycle
- Query `system_events` by `traceId` — find where pipeline broke
- Grafana traces for end-to-end latency

### Pipeline Versioning

The `pipeline_versions` table stores DAG definitions:

```json
{
  "name": "core-pipeline",
  "version": "2.1.0",
  "dag": {
    "stages": [
      { "id": "discovery", "next": "extraction" },
      { "id": "extraction", "next": "normalization" },
      ...
    ]
  }
}
```

**Benefits:**
- Run v1 and v2 in parallel (blue/green deployment)
- Backfill with old pipeline version for comparison
- Never lose reproducibility when logic changes

---

## Development Workflow

### Adding a New Worker

1. **Define job schema** in `packages/shared`:

```typescript
export const MyJobSchema = z.object({
  entityId: z.string(),
  traceId: z.string(),
  pipelineVersion: z.string(),
})
```

2. **Create worker** in `apps/workers/src/workers/my-job.worker.ts`:

```typescript
export function createMyJobWorker() {
  return new Worker('my_job', async (job) => {
    const { entityId, traceId, pipelineVersion } = MyJobSchema.parse(job.data)

    // Idempotency check
    const key = `my_job:${entityId}:${pipelineVersion}`
    if (await isProcessed(key)) return

    // Do work...

    // Mark processed
    await markProcessed(key)

    // Emit event
    await emitEvent({ traceId, eventType: 'my_job.completed', ... })
  })
}
```

3. **Register queue** in `apps/workers/src/index.ts`

4. **Write integration test** that verifies idempotency + event emission

See [Pipeline Architecture](/.claude/docs/brand-platform/pipeline.md) for full patterns.

### Adding a New Scraping Adapter

1. **Create adapter** in `packages/adapters/<source>/`:

```typescript
export const myAdapter: ScraperAdapter = {
  id: 'my-source',
  sourceType: 'website',

  async discover(query: DiscoveryQuery): AsyncGenerator<RawCandidate> {
    // Yield candidates...
  },

  async extract(url: string): Promise<ExtractedBrand> {
    // Extract structured data...
  },

  async probe(): Promise<AdapterHealth> {
    // Health check...
  },
}
```

2. **Register** in `packages/adapters/src/registry.ts`

3. **Configure** via admin UI → Sources → Add Source

See [Adapter Strategy](/.claude/docs/brand-platform/adapters.md) for anti-bot patterns.

### Adding a New API Module

1. **Define schema** in `packages/shared/src/schemas/<domain>/`:

```typescript
export const CreateItemSchema = z.object({ name: z.string() })
```

2. **Create module** in `apps/api/src/modules/<domain>/`:

```
modules/items/
├── items.routes.ts        # Fastify plugin, autoPrefix = '/items'
├── items.handlers.ts      # HTTP layer (request/response)
├── items.service.ts       # Business logic
└── items.repository.ts    # Drizzle queries
```

3. **Register repository** in `apps/api/src/plugins/app/repositories.ts`

4. **Add types** to `apps/api/src/types/fastify.d.ts`

See [Architecture](/.claude/docs/architecture.md) for DDD patterns.

---

## Commands Reference

### Development

```bash
pnpm dev                    # Start all apps (api, web, workers, scheduler)
pnpm dev:api                # Start API only
pnpm dev:web                # Start web only
pnpm dev:workers            # Start workers only
```

### Database

```bash
pnpm db:generate            # Generate migration from schema diff
pnpm db:migrate             # Apply pending migrations
pnpm db:push                # Push schema directly (dev only)
pnpm db:reset               # Drop all tables + push
pnpm db:seed                # Seed demo data
pnpm db:studio              # Open Drizzle Studio
```

### Quality

```bash
pnpm lint                   # ESLint across workspace
pnpm lint:fix               # Auto-fix issues
pnpm type-check             # TypeScript across workspace
pnpm test                   # Vitest (api + web)
pnpm test:watch             # Watch mode
pnpm build                  # Build all apps
```

### Docker

```bash
docker compose up -d                        # Start infra only
docker compose up --build --watch           # Full stack with hot reload
docker compose logs -f api                  # Follow API logs
docker compose exec postgres psql -U postgres -d brand_radar
```

---

## Observability

### Trace ID Explorer

Query `system_events` by `trace_id` to see full entity lineage:

```sql
SELECT event_type, entity_id, created_at, payload
FROM system_events
WHERE trace_id = 'tr_abc123xyz'
ORDER BY created_at;
```

### Event Debug Viewer (Admin UI)

- Navigate to **Admin → Events**
- Search by `trace_id`, `entity_id`, or `event_type`
- See full pipeline execution for any entity

### Prometheus Metrics

```
worker_jobs_processed_total{queue="scoring", status="success"}
worker_job_duration_seconds{queue="scoring"}
queue_depth{queue="discovery"}
adapter_success_rate{adapter="instagram"}
cost_events_total{service="openai"}
```

### Logs

All logs include `traceId` and `pipelineVersion`:

```json
{
  "level": "info",
  "time": "2026-05-27T09:15:00Z",
  "traceId": "tr_abc123xyz",
  "pipelineVersion": "2.1.0",
  "event": "job.completed",
  "worker": "scoring",
  "entityId": "123",
  "score": 87.5
}
```

Filter logs: `jq 'select(.traceId == "tr_abc123xyz")'`

---

## Production Deployment

### Environment Variables

```bash
# Required
DATABASE_URL=postgresql://user:pass@host:5432/brand_radar
REDIS_URL=redis://host:6379
MEILISEARCH_URL=http://host:7700
MEILISEARCH_MASTER_KEY=your-master-key-here
BETTER_AUTH_SECRET=your-secret-key-here

# Optional
ACTIVE_PIPELINE_VERSION=2.1.0
S3_ENDPOINT=https://s3.amazonaws.com
S3_BUCKET=brand-radar-raw
OPENAI_API_KEY=sk-...                      # Phase 2
MEILI_ENV=production
```

### Docker Compose (Production)

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: brand_radar
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes  # CRITICAL: persistence
    volumes:
      - redis_data:/data

  meilisearch:
    image: getmeili/meilisearch:v1.10
    environment:
      MEILI_ENV: production
      MEILI_MASTER_KEY: ${MEILI_MASTER_KEY}
      MEILI_NO_ANALYTICS: true
    volumes:
      - meilisearch_data:/meili_data

  api:
    build:
      context: .
      target: api-prod
    environment:
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: redis://redis:6379
      MEILISEARCH_URL: http://meilisearch:7700
      MEILISEARCH_MASTER_KEY: ${MEILI_MASTER_KEY}
      ACTIVE_PIPELINE_VERSION: ${ACTIVE_PIPELINE_VERSION:-2.1.0}
    depends_on:
      - postgres
      - redis
      - meilisearch

  workers:
    build:
      context: .
      target: workers-prod
    environment:
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: redis://redis:6379
      ACTIVE_PIPELINE_VERSION: ${ACTIVE_PIPELINE_VERSION:-2.1.0}
    depends_on:
      - postgres
      - redis
    deploy:
      replicas: 3  # Scale per queue
```

### Health Checks

- **API:** `GET /health` → `{ status: "ok", uptime: 12345 }`
- **Workers:** Check queue depth via Redis CLI
- **Database:** Query `system_events` — should see recent events

---

## Cost Governance

### Budget Enforcement

AI enrichment is **always gated**:

```typescript
if (!await checkDailyBudget('openai')) {
  await pauseQueue('ai_enrichment')
  await emitAlert('daily_ai_budget_exceeded')
  return
}
```

### Cost Tracking

Query `cost_events` for spend breakdown:

```sql
SELECT service, SUM(cost_usd) as total_cost
FROM cost_events
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY service;
```

### Confidence Thresholds

AI only fires when confidence > 0.6:

```typescript
if (entity.discoveryConfidence < AI_CONFIDENCE_THRESHOLD) {
  logger.info('Skipping AI enrichment — low confidence')
  return
}
```

---

## Documentation

- **[Architecture Overview](/.claude/docs/architecture.md)** — System design, event sourcing, trace propagation
- **[Pipeline Architecture](/.claude/docs/brand-platform/pipeline.md)** — Workers, queues, scoring, idempotency
- **[Schema Design](/.claude/docs/brand-platform/schema.md)** — Database tables, event backbone, pgvector
- **[Adapter Strategy](/.claude/docs/brand-platform/adapters.md)** — Anti-bot tactics, Playwright config
- **[Style Guide](/.claude/docs/style-guide.md)** — Code conventions, naming, TypeScript patterns
- **[Commit Conventions](/.claude/docs/commit-conventions.md)** — Conventional Commits for monorepo

### Architecture Decision Records (ADRs)

- [ADR-001: Playwright Only](/.claude/docs/decisions/001-playwright-only.md)
- [ADR-002: Meilisearch Not OpenSearch](/.claude/docs/decisions/002-meilisearch-not-opensearch.md)
- [ADR-003: Adapter vs Source Separation](/.claude/docs/decisions/003-adapter-vs-source-separation.md)

---

## Specialized Agents

Delegate to Claude Code agents for domain-specific work:

- **`drizzle-expert`** — Schema changes, queries, migrations, pgvector
- **`fastify-expert`** — Routes, plugins, hooks, error handling
- **`vue-expert`** — Components, composables, Pinia stores
- **`pipeline-expert`** — Workers, event emission, idempotency, scoring
- **`scraping-expert`** — Adapters, anti-bot evasion, Playwright stealth

See [`.claude/agents/`](/.claude/agents/) for full definitions.

---

## Contributing

1. **Read the docs** — Start with [Architecture Overview](/.claude/docs/architecture.md)
2. **Pick an issue** — Check [open issues](https://github.com/im-codebreaker/brand-radar/issues)
3. **Create a branch** — `feat/your-feature` or `fix/your-fix`
4. **Follow conventions** — See [Commit Conventions](/.claude/docs/commit-conventions.md)
5. **Write tests** — Integration tests for workers, unit tests for services
6. **Open a PR** — Link to the issue, describe changes, add screenshots if UI

---

## Roadmap

### ✅ Phase 1 — Stable Event-Sourced Pipeline (Current)
- Event backbone (`system_events`) with `trace_id` propagation
- Idempotent workers via `processed_jobs`
- Pipeline versioning and backfill support
- Entity resolution with merge review queue
- Basic scoring (social + ecommerce + data quality)
- Meilisearch keyword search

### 🚧 Phase 2 — Intelligence Layer (Next)
- AI enrichment (embeddings, classification)
- pgvector semantic search
- Hybrid search (keyword + semantic)
- Data quality scoring and dashboard
- Cost governance UI
- Trend detection and sparklines

### 🔮 Phase 3 — Graph & Prediction (Future)
- Brand relationship graph (Cytoscape.js)
- Backfill UI (admin-triggered replay)
- Natural language search
- Recommendation engine
- Viral prediction models

---

## License

MIT — see [LICENSE](./LICENSE).

---

## Questions?

- **Issues:** [GitHub Issues](https://github.com/im-codebreaker/brand-radar/issues)
- **Docs:** [`.claude/docs/`](/.claude/docs/)
- **Email:** [mbouchard@antidots-group.com](mailto:mbouchard@antidots-group.com)

**Built with ❤️ by [@im-codebreaker](https://github.com/im-codebreaker)**
