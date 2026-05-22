# Brand Radar — Pipeline Architecture

> **Worker orchestration, job queues, scoring system, and observability design.**

---

## Table of Contents

1. [Pipeline Overview](#pipeline-overview)
2. [Worker Layer Design](#worker-layer-design)
3. [Job Queue Architecture (BullMQ)](#job-queue-architecture-bullmq)
4. [Scoring System](#scoring-system)
5. [Observability & Health Monitoring](#observability--health-monitoring)

---

## Pipeline Overview

The Brand Radar pipeline is a **staged, queue-driven data flow** from discovery to search indexing:

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

**Key Properties:**
- **Idempotent:** Workers can retry without double-processing
- **Observable:** Every stage emits metrics and logs
- **Isolated:** Each worker type runs in its own process pool
- **Backpressure-aware:** Queue depth triggers throttling

---

## Worker Layer Design

### Worker Types

| Worker Type | Responsibility | Concurrency | Retries | Timeout |
|-------------|----------------|-------------|---------|---------|
| **Discovery** | Crawl sources, emit raw candidates | 4 per adapter | 3 | 60s |
| **Extraction** | Parse raw HTML/JSON → structured data | 10 | 5 | 30s |
| **Normalization** | Clean, validate, dedupe | 20 | 2 | 10s |
| **Enrichment** | Fetch social stats, ecommerce signals | 5 | 3 | 45s |
| **Scoring** | Compute brand scores, trends | 10 | 2 | 20s |
| **Indexing** | Push to Meilisearch | 10 | 5 | 15s |

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
         ├──────────────────┐
         ▼                  ▼
┌─────────────────┐  ┌─────────────────┐
│   enrichment    │  │     scoring     │
└────────┬────────┘  └────────┬────────┘
         │                    │
         └─────────┬──────────┘
                   ▼
          ┌─────────────────┐
          │     indexing    │
          └─────────────────┘
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
  // ... etc
}
```

### Job Priority

- **Critical:** User-submitted brands (priority: 10)
- **High:** Scheduled discovery runs (priority: 5)
- **Normal:** Enrichment, re-scoring (priority: 1)

---

## Scoring System

### v1 — Rule-Based (Phase 1)

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

### v2 — ML-Based (Phase 3)

Replace rule-based scoring with a trained model:
- **Features:** Social growth rate, engagement rate, mention velocity, category embeddings
- **Target:** Manual "hotness" labels (human-curated)
- **Model:** Gradient boosted trees (XGBoost or LightGBM)

---

## Observability & Health Monitoring

### Metrics (Prometheus)

| Metric | Type | Description |
|--------|------|-------------|
| `worker_jobs_processed_total` | Counter | Jobs completed per worker type |
| `worker_jobs_failed_total` | Counter | Jobs failed per worker type |
| `worker_job_duration_seconds` | Histogram | Job processing time |
| `queue_depth` | Gauge | Number of pending jobs per queue |
| `adapter_success_rate` | Gauge | % of successful scrapes per adapter |
| `entity_resolution_false_positives` | Counter | Manual rejections in review queue |
| `search_latency_ms` | Histogram | Meilisearch query duration |

### Health Probes

Each adapter runs a **daily canary** that:
1. Fetches a known-good URL
2. Validates extracted data against expected schema
3. Emits `adapter_health_status` metric (0 = down, 1 = up)

**Alerting Rules:**
- Adapter down for > 2 hours → PagerDuty critical
- Queue depth > 10,000 for > 30 min → Slack warning
- Extraction success rate < 80% for > 1 hour → Slack warning

### Logging (Structured)

```typescript
logger.info({
  event: 'job.completed',
  worker: 'extraction',
  job_id: job.id,
  brand_name: result.name,
  duration_ms: job.finishedOn - job.processedOn,
  fields_extracted: Object.keys(result).length,
})
```

**Log Aggregation:** Ship to Loki or Elasticsearch for querying.

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
    depends_on:
      - redis
      - postgres
```

### Production (Kubernetes or ECS)

- **Separate deployments per worker type** (discovery, extraction, etc.)
- **Horizontal scaling** based on queue depth (e.g., scale extraction workers to 20 if queue > 5000)
- **Resource limits:** 512 MB RAM per worker, 0.5 CPU cores

---

**Next Steps:**
1. Review [Schema Design](./schema.md) for data model
2. Review [Adapter Strategy](./adapters.md) for scraping patterns
3. Implement worker scaffolding in `apps/workers/`
