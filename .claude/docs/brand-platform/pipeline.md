# Brand Radar — Pipeline Architecture

> **Worker orchestration, event sourcing, job queues, scoring system, and observability design.**

---

## Table of Contents

1. [Pipeline Overview](#pipeline-overview)
2. [Worker Layer Design](#worker-layer-design)
3. [Event Sourcing & Trace Propagation](#event-sourcing--trace-propagation)
4. [Idempotency System](#idempotency-system)
5. [Job Queue Architecture (BullMQ)](#job-queue-architecture-bullmq)
6. [Scoring System](#scoring-system)
7. [Observability & Health Monitoring](#observability--health-monitoring)

---

## Pipeline Overview

The Brand Radar pipeline is a **staged, event-sourced, queue-driven data flow** from discovery to search indexing:

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

**Key Properties:**
- **Idempotent:** Workers can retry without double-processing
- **Event-sourced:** Every stage emits events for full traceability
- **Observable:** Every stage emits metrics and logs
- **Isolated:** Each worker type runs in its own process pool
- **Backpressure-aware:** Queue depth triggers throttling
- **Deterministic:** Same inputs + same pipeline version = same outputs

---

## Worker Layer Design

### Worker Types

| Worker Type | Responsibility | Concurrency | Retries | Timeout | Idempotent |
|-------------|----------------|-------------|---------|---------|------------|
| **Discovery** | Crawl sources, emit raw candidates | 4 per adapter | 3 | 60s | ✅ |
| **Extraction** | Parse raw HTML/JSON → structured data | 10 | 5 | 30s | ✅ |
| **Normalization** | Clean, validate, dedupe | 20 | 2 | 10s | ✅ |
| **Entity Resolution** | Match/merge into canonical entities | 10 | 3 | 20s | ✅ |
| **Deterministic Enrichment** | WHOIS, Shopify, logo, tech stack | 5 | 3 | 45s | ✅ |
| **AI Enrichment** | Embeddings, classification (async, cost-gated) | 2 | 2 | 60s | ✅ |
| **Scoring** | Compute brand scores, trends | 10 | 2 | 20s | ✅ |
| **Indexing** | Push to Meilisearch | 10 | 5 | 15s | ✅ |

### Worker Separation Rules

| Layer | Rule |
|-------|------|
| Discovery | Output only: candidate queue. No extraction. |
| Extraction | Input: candidate URL. Output: structured payload. No DB writes. |
| Normalization | Pure data transformation. No external calls. |
| Entity Resolution | Canonical mapping only. No enrichment. Emits events on merge. |
| Deterministic Enrichment | **No AI allowed.** External calls only for factual signals. |
| AI Enrichment | **Always async. Never on the critical path. Has cost gate.** |
| Scoring | Reads enriched data. Writes only to `brand_scores`. Never to `canonical_entities` directly. |
| Index Sync | Sync only. No business logic. |

### Worker Lifecycle

```typescript
interface Worker<TInput, TOutput> {
  name: string
  concurrency: number
  retries: number
  timeout: number

  process(job: Job<TInput>): Promise<TOutput>
  onCompleted(job: Job<TInput>, result: TOutput): Promise<void>
  onFailed(job: Job<TInput>, error: Error): Promise<void>
}
```

### Error Handling

- **Transient errors** (network timeout, rate limit): Retry with exponential backoff
- **Permanent errors** (invalid data, schema mismatch): Move to dead-letter queue (DLQ)
- **Adapter failures** (403 Forbidden, captcha): Pause adapter, alert on-call

---

## Event Sourcing & Trace Propagation

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

// Extraction Worker (inherits trace_id)
await extractionQueue.add('extract', {
  candidateUrl,
  traceId: job.data.traceId,
  pipelineVersion: job.data.pipelineVersion,
})
```

### Event Emission

Every worker emits a `system_events` row at completion:

```typescript
async function emitEvent(event: SystemEvent) {
  await db.insert(systemEvents).values({
    traceId: event.traceId,
    eventType: event.eventType,
    entityId: event.entityId,
    jobId: event.jobId,
    sourceId: event.sourceId,
    pipelineVersion: event.pipelineVersion,
    schemaVersion: SCHEMA_VERSION,
    payload: event.payload,
  })
}

// Example: Entity Resolver emits entity.resolved
await emitEvent({
  traceId: job.data.traceId,
  eventType: 'entity.resolved',
  entityId: resolvedEntity.id,
  jobId: job.id,
  pipelineVersion: job.data.pipelineVersion,
  payload: {
    confidence: matchConfidence,
    matchedVia: 'url_domain',
  },
})
```

### Event Types

| Event | Emitted by | Purpose |
|-------|------------|---------|
| `discovery.created` | Discovery Worker | New candidates discovered |
| `crawl.completed` | Extraction Worker | Crawl job finished |
| `extraction.completed` | Extraction Worker | Structured data extracted |
| `normalization.completed` | Normalization Worker | Data cleaned and validated |
| `entity.resolved` | Entity Resolver | Raw discovery matched to entity |
| `entity.merged` | Entity Resolver | Two entities merged |
| `enrichment.completed` | Deterministic Enrichment | Factual data added |
| `ai.enriched` | AI Enrichment Worker | AI processing completed |
| `score.computed` | Scoring Worker | Brand score calculated |
| `index.updated` | Index Sync Worker | Meilisearch updated |

### Why It Matters

- **Full replayability** — rebuild the entire state from events
- **Entity lineage** — trace any brand back to its raw discovery
- **Debugging** — find exactly where a pipeline broke for a given entity
- **ML training data** — structured history of all resolution and merge decisions
- **Auditable intelligence** — every score is backed by a complete event trail

---

## Idempotency System

Every worker generates a deterministic idempotency key before execution:

```
{job_type}:{job_id}:{pipeline_version}
```

Example: `normalization:raw_discovery:84729:v2.1.0`

### Implementation

```typescript
async function runWorkerSafe(
  key: string,
  jobType: string,
  fn: () => Promise<void>
) {
  const exists = await db.query(
    'SELECT 1 FROM processed_jobs WHERE idempotency_key = $1',
    [key]
  )
  
  if (exists.rowCount > 0) {
    logger.info({ idempotencyKey: key }, 'Job already processed — skipping')
    return   // already processed — skip
  }

  await fn()

  await db.query(
    'INSERT INTO processed_jobs (idempotency_key, job_type) VALUES ($1, $2)',
    [key, jobType]
  )
}

// Usage in worker
await runWorkerSafe(
  `normalization:${rawDiscoveryId}:${pipelineVersion}`,
  'normalization',
  async () => {
    // ... normalization logic
  }
)
```

**This makes every queue retry, backfill, and manual re-trigger safe by default.**

---

## Job Queue Architecture (BullMQ)

### Queue Topology

```
┌───────────────────┐
│   discovery       │  ← User-triggered or scheduled
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│   extraction      │  ← Triggered by discovery completion
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│   normalization   │  ← Triggered by extraction completion
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ entity_resolution │  ← Match/merge into canonical entities
└────────┬──────────┘
         │
         ├──────────────────────────┐
         ▼                          ▼
┌─────────────────────┐  ┌─────────────────────┐
│ deterministic_enrich│  │    ai_enrichment    │  ← Async, cost-gated
└─────────┬───────────┘  └─────────┬───────────┘
          │                        │
          └───────────┬────────────┘
                      ▼
          ┌─────────────────────┐
          │       scoring       │
          └─────────┬───────────┘
                    ▼
          ┌─────────────────────┐
          │       indexing      │
          └─────────────────────┘
```

### Queue Configuration

```typescript
// apps/workers/src/queues/config.ts
export const queueConfig = {
  discovery: {
    concurrency: 4,
    limiter: {
      max: 100,          // Max 100 jobs processed
      duration: 60000,   // per 60 seconds
    },
  },
  extraction: {
    concurrency: 10,
    limiter: {
      max: 500,
      duration: 60000,
    },
  },
  ai_enrichment: {
    concurrency: 2,      // Low concurrency — cost-gated
    limiter: {
      max: 50,           // Strict limit
      duration: 60000,
    },
  },
  // ... etc
}
```

### Job Priority

- **Critical:** User-submitted brands (priority: 10)
- **High:** Scheduled discovery runs (priority: 5)
- **Normal:** Enrichment, re-scoring (priority: 1)

---

## Scoring System

### Composite Score (0–100)

| Dimension | Weight | Signals |
|-----------|--------|---------|
| **Social Presence** | 25% | Follower count (log scale), multi-platform bonus, verified badge |
| **Content Velocity** | 20% | Post frequency, hashtag discovery frequency |
| **Ecommerce Readiness** | 25% | Shopify/WooCommerce detected, domain age, product catalog |
| **Discovery Signal** | 15% | Found via multiple sources, found in trending hashtags |
| **Data Quality** | 10% | Completeness, freshness, consistency, source reliability |
| **Data Completeness** | 5% | Logo, website, description, category all present |

**Data quality now gates and weights scoring** — a high-follower brand with stale or inconsistent data scores lower.

### Phase 1 Scoring (Simplified)

Brands are scored on a 0-100 scale based on:

| Signal | Weight | Source | Logic |
|--------|--------|--------|-------|
| **Social presence** | 30% | Instagram, TikTok | `log10(followers + 1) * 10` |
| **Recency** | 20% | Discovery date | `max(0, 100 - days_since_discovery)` |
| **Metadata completeness** | 15% | Extracted fields | `(fields_filled / total_fields) * 100` |
| **Ecommerce signals** | 20% | Shopify, WooCommerce detection | `has_ecommerce ? 100 : 0` |
| **Multi-source validation** | 15% | Number of sources | `min(sources * 20, 100)` |

**Formula:**

```typescript
score = (
  social_score * 0.30 +
  recency_score * 0.20 +
  completeness_score * 0.15 +
  ecommerce_score * 0.20 +
  validation_score * 0.15
)
```

**Decay:** Scores decay by 1 point per week if no new data is ingested.

---

### Phase 2 Scoring (Enhanced)

Add data quality dimension:

```typescript
// Data quality score computation
const qualityScore = await getLatestQualityScore(entityId)

score = (
  social_score * 0.25 +
  velocity_score * 0.20 +
  ecommerce_score * 0.25 +
  discovery_score * 0.15 +
  qualityScore * 0.10 +
  completeness_score * 0.05
)
```

### Tiered Refresh Schedule

| Brand tier | Refresh frequency |
|-----------|-------------------|
| Score > 80 (top brands) | Daily |
| Score 40–80 | Weekly |
| Score < 40 (low signal) | Monthly |
| Status = rejected | Never |

---

### Phase 3 Scoring (ML-Based)

Replace rule-based scoring with a trained model:
- **Features:** Social growth rate, engagement rate, mention velocity, category embeddings, data quality score
- **Target:** Manual "hotness" labels (human-curated)
- **Model:** Gradient boosted trees (XGBoost or LightGBM)

---

## Observability & Health Monitoring

### Metrics (Prometheus)

| Metric | Type | Description |
|--------|------|-------------|
| `worker_jobs_processed_total{queue, status}` | Counter | Jobs completed per worker type |
| `worker_jobs_failed_total{queue}` | Counter | Jobs failed per worker type |
| `worker_job_duration_seconds{queue}` | Histogram | Job processing time |
| `queue_depth{queue}` | Gauge | Number of pending jobs per queue |
| `adapter_success_rate{adapter}` | Gauge | % of successful scrapes per adapter |
| `adapter_circuit_state{adapter}` | Gauge | closed \| open \| half_open |
| `worker_cost_usd_total{service}` | Counter | AI + proxy cost per stage |
| `entity_resolution_false_positives` | Counter | Manual rejections in review queue |
| `search_latency_ms` | Histogram | Meilisearch query duration |

### Trace Propagation

Every log line includes `trace_id`, `pipeline_version`, and `job_id`:

```typescript
logger.info({
  event: 'job.completed',
  worker: 'extraction',
  traceId: job.data.traceId,
  pipelineVersion: job.data.pipelineVersion,
  jobId: job.id,
  brandName: result.name,
  durationMs: job.finishedOn - job.processedOn,
  fieldsExtracted: Object.keys(result).length,
})
```

### Health Probes

Each adapter runs a **daily canary** that:
1. Fetches a known-good URL
2. Validates extracted data against expected schema
3. Emits `adapter_health_status` metric (0 = down, 1 = up)

**Alerting Rules:**
- Adapter down for > 2 hours → PagerDuty critical
- Queue depth > 10,000 for > 30 min → Slack warning
- Extraction success rate < 80% for > 1 hour → Slack warning
- AI daily budget exceeded → Pause `ai_enrichment` queue + Slack alert

### Schema + Extractor Versioning

Every raw document and crawl job stores:

```sql
extractor_version TEXT,   -- e.g. "instagram-v2.1"
schema_version    TEXT,   -- e.g. "brand-extract-v3"
pipeline_version  TEXT    -- e.g. "2.1.0"
```

This enables:
- Safe re-processing of historical raw data when parsers change
- A/B comparison between extractor versions
- Rollback to previous extractor on regression
- Backfill jobs scoped to specific pipeline versions

---

## Worker Deployment

### Docker Compose (Development)

```yaml
# docker-compose.yml
services:
  workers:
    build: .
    command: pnpm --filter @brand-radar/workers dev
    environment:
      - REDIS_URL=redis://redis:6379
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/brand_radar
      - ACTIVE_PIPELINE_VERSION=1.0.0
    depends_on:
      - redis
      - postgres
```

### Production (Kubernetes or ECS)

- **Separate deployments per worker type** (discovery, extraction, etc.)
- **Horizontal scaling** based on queue depth (e.g., scale extraction workers to 20 if queue > 5000)
- **Resource limits:** 512 MB RAM per worker, 0.5 CPU cores
- **Versioned deployments:** Deploy new pipeline version alongside old; compare outputs before cutover

---

## AI Enrichment Rules

**Non-Negotiable:**
- Never on the ingestion critical path
- Always async
- Always cost-gated before execution
- Always versioned (model name + dims recorded at time of embedding)
- AI workers are isolated — a failure never propagates to core pipeline

### Cost Gate Example

```typescript
async function processAiEnrichment(job: Job) {
  // Check daily budget before processing
  if (!await checkDailyBudget('openai')) {
    await pauseQueue('ai_enrichment')
    await emitAlert('daily_ai_budget_exceeded')
    throw new Error('Daily AI budget exceeded')
  }

  // Check confidence threshold
  const entity = await getEntity(job.data.entityId)
  if (entity.discoveryConfidence < AI_CONFIDENCE_THRESHOLD) {
    logger.info({ entityId: entity.id }, 'Skipping AI enrichment — low confidence')
    return
  }

  // Process AI enrichment
  const embedding = await generateEmbedding(entity.description)
  
  // Track cost
  await db.insert(costEvents).values({
    service: 'openai',
    costUsd: 0.0001,  // Example cost
    entityId: entity.id,
    metadata: { model: 'text-embedding-3-small', tokens: 150 },
  })

  // Emit event
  await emitEvent({
    traceId: job.data.traceId,
    eventType: 'ai.enriched',
    entityId: entity.id,
    pipelineVersion: job.data.pipelineVersion,
    payload: { model: 'text-embedding-3-small', dims: 1536 },
  })
}
```

---

**Next Steps:**
1. Review [Schema Design](./schema.md) for event backbone tables
2. Review [Adapter Strategy](./adapters.md) for scraping patterns
3. Implement worker scaffolding in `apps/workers/`
4. Enable event emission in all workers from day one
5. Implement idempotency checks in all workers
