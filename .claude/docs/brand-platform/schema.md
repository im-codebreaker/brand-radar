# Brand Radar — Data Layer & Schema

> **Database schema, event sourcing architecture, entity resolution, and search index design.**

---

## Table of Contents

1. [Data Layer Overview](#data-layer-overview)
2. [PostgreSQL Schema](#postgresql-schema)
3. [Event Sourcing & Traceability](#event-sourcing--traceability)
4. [Pipeline Versioning & Idempotency](#pipeline-versioning--idempotency)
5. [Entity Resolution Architecture](#entity-resolution-architecture)
6. [pgvector Configuration](#pgvector-configuration)
7. [Meilisearch Index](#meilisearch-index)
8. [Redis Cache Strategy](#redis-cache-strategy)
9. [S3/MinIO Raw Storage](#s3minio-raw-storage)

---

## Data Layer Overview

```
┌─────────────────┐
│   Meilisearch   │  ← Full-text + faceted search
│  (search index) │
└────────┬────────┘
         │ sync
         ▼
┌─────────────────┐
│   PostgreSQL    │  ← Source of truth (entities, relations, events)
│   + pgvector    │  ← Semantic embeddings (Phase 2)
│                 │  ← Event Backbone (system_events) — append-only
└────────┬────────┘
         │ ephemeral
         ▼
┌─────────────────┐
│      Redis      │  ← Queue state, rate limits, session cache
└─────────────────┘

┌─────────────────┐
│   S3 / MinIO    │  ← Raw HTML/JSON, logos, screenshots (immutable)
└─────────────────┘
```

**Responsibilities:**
- **PostgreSQL:** Canonical entities, entity resolution, discovery events, adapter health, **event backbone**, **pipeline versioning**
- **pgvector:** Semantic embeddings for similarity search (Phase 2)
- **Meilisearch:** Fast full-text + faceted search, typo tolerance
- **Redis:** BullMQ job queues, rate limit counters, ephemeral cache
- **S3/MinIO:** Immutable raw data, replays, compliance

---

## PostgreSQL Schema

### Core Enums

```sql
CREATE TYPE entity_status AS ENUM ('discovered', 'verified', 'rejected', 'merged');
CREATE TYPE job_status AS ENUM ('pending', 'running', 'done', 'failed', 'retrying');
CREATE TYPE discovery_status AS ENUM ('pending', 'processed', 'failed', 'merged');
CREATE TYPE resolution_status AS ENUM ('pending', 'merged', 'rejected');
CREATE TYPE merge_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE adapter_type AS ENUM ('discovery', 'crawler', 'social', 'enrichment');
```

---

### 1. Canonical Entities

**The source of truth for brand entities.** Each canonical entity represents a unique brand, with aliases and identities linked to it.

```sql
CREATE TABLE canonical_entities (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  status entity_status NOT NULL DEFAULT 'discovered',
  score NUMERIC(10,4) DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
```

**Indexes:**
```sql
CREATE INDEX idx_canonical_entities_slug ON canonical_entities(slug);
CREATE INDEX idx_canonical_entities_score ON canonical_entities(score DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_canonical_entities_status ON canonical_entities(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_canonical_entities_metadata_gin ON canonical_entities USING gin(metadata);
```

---

### 2. Entity Aliases

**Alternative names for the same canonical entity.** Used for fuzzy matching during entity resolution.

```sql
CREATE TABLE entity_aliases (
  id BIGSERIAL PRIMARY KEY,
  entity_id BIGINT NOT NULL REFERENCES canonical_entities(id),
  alias TEXT NOT NULL,
  source TEXT,
  confidence NUMERIC(6,4) DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(entity_id, alias)
);
```

**Indexes:**
```sql
CREATE INDEX idx_entity_aliases_entity_id ON entity_aliases(entity_id);
CREATE INDEX idx_entity_aliases_alias ON entity_aliases(alias) WHERE deleted_at IS NULL;
```

---

### 3. Brand Identities

**Platform-specific brand profiles** (Instagram, TikTok, website, etc.). Each identity is linked to a canonical entity.

```sql
CREATE TABLE brand_identities (
  id BIGSERIAL PRIMARY KEY,
  entity_id BIGINT NOT NULL REFERENCES canonical_entities(id),
  platform TEXT NOT NULL,
  handle TEXT,
  url TEXT,
  follower_count BIGINT DEFAULT 0,
  verified BOOLEAN DEFAULT false,
  raw_data JSONB DEFAULT '{}'::jsonb,
  last_scraped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(platform, handle)
);
```

**Indexes:**
```sql
CREATE INDEX idx_brand_identities_entity_id ON brand_identities(entity_id);
CREATE INDEX idx_brand_identities_platform ON brand_identities(platform) WHERE deleted_at IS NULL;
CREATE INDEX idx_brand_identities_url ON brand_identities(url) WHERE deleted_at IS NULL;
```

---

### 4. Adapters

**Scraping adapter registry.** Each adapter implements discovery and extraction logic for a specific source type.

```sql
CREATE TABLE adapters (
  id BIGSERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type adapter_type NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0.0',
  enabled BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
```

**Indexes:**
```sql
CREATE INDEX idx_adapters_key ON adapters(key);
CREATE INDEX idx_adapters_type ON adapters(type) WHERE enabled = true;
```

---

### 5. Sources

**Configured scraping sources.** Each source is powered by an adapter and runs on a schedule.

```sql
CREATE TABLE sources (
  id BIGSERIAL PRIMARY KEY,
  adapter_id BIGINT NOT NULL REFERENCES adapters(id),
  name TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  schedule TEXT DEFAULT '0 */6 * * *',
  priority INTEGER DEFAULT 5,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
```

**Indexes:**
```sql
CREATE INDEX idx_sources_adapter_id ON sources(adapter_id);
CREATE INDEX idx_sources_enabled ON sources(enabled) WHERE deleted_at IS NULL;
CREATE INDEX idx_sources_last_run_at ON sources(last_run_at DESC);
```

---

### 6. Crawl Jobs

**Execution records for scheduled crawls.** Tracks job status, timing, and statistics. **Records pipeline version for replay support.**

```sql
CREATE TABLE crawl_jobs (
  id BIGSERIAL PRIMARY KEY,
  source_id BIGINT REFERENCES sources(id),
  status job_status NOT NULL DEFAULT 'pending',
  triggered_by TEXT DEFAULT 'scheduler',
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  stats JSONB DEFAULT '{}'::jsonb,
  error_log TEXT,
  adapter_version TEXT,
  schema_version TEXT,
  pipeline_version TEXT,              -- NEW: tracks which pipeline version produced this job
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**
```sql
CREATE INDEX idx_crawl_jobs_source_id ON crawl_jobs(source_id);
CREATE INDEX idx_crawl_jobs_status ON crawl_jobs(status);
CREATE INDEX idx_crawl_jobs_created_at ON crawl_jobs(created_at DESC);
CREATE INDEX idx_crawl_jobs_pipeline_version ON crawl_jobs(pipeline_version);  -- NEW
```

---

### 7. Raw Discoveries

**Unprocessed brand signals from scrapers.** Each raw discovery is a candidate for entity resolution.

```sql
CREATE TABLE raw_discoveries (
  id BIGSERIAL PRIMARY KEY,
  job_id BIGINT REFERENCES crawl_jobs(id),
  source_type TEXT NOT NULL,
  raw_url TEXT,
  raw_handle TEXT,
  raw_name TEXT,
  raw_data JSONB DEFAULT '{}'::jsonb,
  s3_key TEXT,
  status discovery_status DEFAULT 'pending',
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  extractor_version TEXT,
  schema_version TEXT,
  deleted_at TIMESTAMPTZ
);
```

**Indexes:**
```sql
CREATE INDEX idx_raw_discoveries_job_id ON raw_discoveries(job_id);
CREATE INDEX idx_raw_discoveries_status ON raw_discoveries(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_raw_discoveries_source_type ON raw_discoveries(source_type);
CREATE INDEX idx_raw_discoveries_discovered_at ON raw_discoveries(discovered_at DESC);
```

---

### 8. Entity Resolution Jobs

**Tracks entity matching and merging decisions.** Links raw discoveries to canonical entities.

```sql
CREATE TABLE entity_resolution_jobs (
  id BIGSERIAL PRIMARY KEY,
  raw_id BIGINT REFERENCES raw_discoveries(id),
  candidate_a BIGINT REFERENCES canonical_entities(id),
  candidate_b BIGINT REFERENCES canonical_entities(id),
  confidence NUMERIC(6,4),
  status resolution_status DEFAULT 'pending',
  resolved_by TEXT DEFAULT 'auto',
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**
```sql
CREATE INDEX idx_entity_resolution_jobs_raw_id ON entity_resolution_jobs(raw_id);
CREATE INDEX idx_entity_resolution_jobs_status ON entity_resolution_jobs(status);
CREATE INDEX idx_entity_resolution_jobs_confidence ON entity_resolution_jobs(confidence DESC);
```

---

### 9. Merge Candidates

**Proposed merges between canonical entities.** Used for manual review and approval.

```sql
CREATE TABLE merge_candidates (
  id BIGSERIAL PRIMARY KEY,
  entity_a_id BIGINT REFERENCES canonical_entities(id),
  entity_b_id BIGINT REFERENCES canonical_entities(id),
  confidence NUMERIC(6,4),
  signals JSONB DEFAULT '{}'::jsonb,
  status merge_status DEFAULT 'pending',
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**
```sql
CREATE INDEX idx_merge_candidates_entity_a_id ON merge_candidates(entity_a_id);
CREATE INDEX idx_merge_candidates_entity_b_id ON merge_candidates(entity_b_id);
CREATE INDEX idx_merge_candidates_status ON merge_candidates(status);
CREATE INDEX idx_merge_candidates_confidence ON merge_candidates(confidence DESC);
```

---

### 10. Categories

**Hierarchical taxonomy for brand classification** (e.g., fashion > streetwear > sneakers).

```sql
CREATE TABLE categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id BIGINT REFERENCES categories(id),
  keywords TEXT[],
  hashtags TEXT[],
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
```

**Indexes:**
```sql
CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_name ON categories(name) WHERE deleted_at IS NULL;
```

---

### 11. Brand Categories

**Many-to-many relationship between brands and categories.**

```sql
CREATE TABLE brand_categories (
  entity_id BIGINT REFERENCES canonical_entities(id),
  category_id BIGINT REFERENCES categories(id),
  confidence NUMERIC(6,4) DEFAULT 1.0,
  source TEXT DEFAULT 'ml',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (entity_id, category_id)
);
```

**Indexes:**
```sql
CREATE INDEX idx_brand_categories_entity_id ON brand_categories(entity_id);
CREATE INDEX idx_brand_categories_category_id ON brand_categories(category_id);
```

---

### 12. Brand Scores

**Historical brand scoring snapshots.** Used for trend analysis and time-series queries.

```sql
CREATE TABLE brand_scores (
  entity_id BIGINT REFERENCES canonical_entities(id),
  scored_at TIMESTAMPTZ DEFAULT NOW(),
  score NUMERIC(10,4),
  signals JSONB DEFAULT '{}'::jsonb,        -- includes all scoring dimensions + data quality
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (entity_id, scored_at)
);
```

**Indexes:**
```sql
CREATE INDEX idx_brand_scores_entity_id ON brand_scores(entity_id);
CREATE INDEX idx_brand_scores_scored_at ON brand_scores(scored_at DESC);
CREATE INDEX idx_brand_scores_score ON brand_scores(score DESC);
```

---

### 13. Source Health

**Adapter health monitoring.** Tracks success rates, CAPTCHA encounters, and selector failures.

```sql
CREATE TABLE source_health (
  id BIGSERIAL PRIMARY KEY,
  source_id BIGINT REFERENCES sources(id),
  checked_at TIMESTAMPTZ DEFAULT NOW(),
  success_rate NUMERIC(6,4),
  captcha_rate NUMERIC(6,4),
  ban_rate NUMERIC(6,4),
  selector_failures INTEGER DEFAULT 0,
  avg_response_ms INTEGER,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**
```sql
CREATE INDEX idx_source_health_source_id ON source_health(source_id);
CREATE INDEX idx_source_health_checked_at ON source_health(checked_at DESC);
```

---

### 14. Crawl Profiles

**Reusable Playwright configurations** for anti-bot evasion (browser fingerprints, proxies, etc.).

```sql
CREATE TABLE crawl_profiles (
  id BIGSERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**
```sql
CREATE INDEX idx_crawl_profiles_name ON crawl_profiles(name);
```

---

## Event Sourcing & Traceability

### 15. System Events [NEW in v2]

**The event backbone.** Every mutation emits a system event. Enables full replayability and debugging.

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

**Indexes:**
```sql
CREATE INDEX idx_system_events_trace_id ON system_events(trace_id);
CREATE INDEX idx_system_events_event_type ON system_events(event_type);
CREATE INDEX idx_system_events_entity_id ON system_events(entity_id);
CREATE INDEX idx_system_events_created_at ON system_events(created_at DESC);
CREATE INDEX idx_system_events_pipeline_version ON system_events(pipeline_version);
```

**Key Event Types:**

| Event | Emitted by | Payload |
|-------|------------|---------|
| `discovery.created` | Discovery Worker | `{ raw_discovery_id, source_type, candidate_count }` |
| `crawl.completed` | Extraction Worker | `{ job_id, success_count, failure_count, duration_ms }` |
| `extraction.completed` | Extraction Worker | `{ raw_id, extracted_fields, extractor_version }` |
| `entity.resolved` | Entity Resolver | `{ entity_id, confidence, matched_via }` |
| `entity.merged` | Entity Resolver | `{ from_entity_id, to_entity_id, merge_signals }` |
| `enrichment.completed` | Deterministic Enrichment Worker | `{ entity_id, enriched_fields }` |
| `ai.enriched` | AI Enrichment Worker | `{ entity_id, model, embedding_dims, cost_usd }` |
| `score.computed` | Scoring Worker | `{ entity_id, score, signals }` |
| `index.updated` | Index Sync Worker | `{ entity_id, index_name, operation }` |

**Why It Matters:**
- **Full replayability** — rebuild the entire state from events
- **Entity lineage** — trace any brand back to its raw discovery
- **Debugging** — find exactly where a pipeline broke for a given entity
- **ML training data** — structured history of all resolution and merge decisions
- **Auditable intelligence** — every score is backed by a complete event trail

---

## Pipeline Versioning & Idempotency

### 16. Processed Jobs [NEW in v2]

**Idempotency tracking.** Prevents double-processing when jobs are retried.

```sql
CREATE TABLE processed_jobs (
  idempotency_key TEXT PRIMARY KEY,        -- {job_type}:{job_id}:{pipeline_version}
  job_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**
```sql
CREATE INDEX idx_processed_jobs_processed_at ON processed_jobs(processed_at DESC);
```

**Usage:**

```typescript
async function runWorkerSafe(key: string, fn: () => Promise<void>) {
  const exists = await db.query(
    'SELECT 1 FROM processed_jobs WHERE idempotency_key = $1', [key]
  )
  if (exists.rowCount > 0) return   // already processed — skip

  await fn()

  await db.query(
    'INSERT INTO processed_jobs (idempotency_key, job_type) VALUES ($1, $2)',
    [key, jobType]
  )
}
```

This makes every queue retry, backfill, and manual re-trigger safe by default.

---

### 17. Pipeline Versions [NEW in v2]

**Stores DAG (directed acyclic graph) definitions for each pipeline release.** Only one version is `active` at a time; old versions remain queryable for backfills.

```sql
CREATE TABLE pipeline_versions (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  dag JSONB NOT NULL DEFAULT '{}'::jsonb,   -- stage graph definition
  active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**
```sql
CREATE INDEX idx_pipeline_versions_active ON pipeline_versions(active) WHERE active = true;
CREATE INDEX idx_pipeline_versions_version ON pipeline_versions(version);
```

**Example DAG:**

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

**Why It Matters:**
- Run pipeline v1 and v2 in parallel for comparison
- Prevent silent logic breakage when workers are updated
- Enable historical recomputation against a specific pipeline version
- Every `crawl_job` and `raw_discovery` records the `pipeline_version` that produced it

---

### 18. Backfill Jobs [NEW in v2]

**Re-runs raw stored data through a target pipeline version without re-crawling.**

```sql
CREATE TABLE backfill_jobs (
  id BIGSERIAL PRIMARY KEY,
  scope TEXT NOT NULL,                      -- 'all' | 'source' | 'entity_range' | 'date_range'
  filter JSONB DEFAULT '{}'::jsonb,
  target_pipeline_version TEXT NOT NULL,
  status job_status NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  stats JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**
```sql
CREATE INDEX idx_backfill_jobs_status ON backfill_jobs(status);
CREATE INDEX idx_backfill_jobs_target_pipeline_version ON backfill_jobs(target_pipeline_version);
CREATE INDEX idx_backfill_jobs_created_at ON backfill_jobs(created_at DESC);
```

**Trigger Scenarios:**
- An extractor bug corrupted a batch of records → replay from MinIO
- Embedding model changed → recompute all embeddings for affected entities
- Scoring formula updated → rebuild `brand_scores` from existing enriched data
- Normalization logic improved → reprocess raw discoveries from a date range

---

## Data Quality & Cost Governance

### 19. Data Quality Scores [NEW in v2]

**Per-entity quality metrics.** Impacts final scoring and refresh scheduling.

```sql
CREATE TABLE data_quality_scores (
  entity_id BIGINT REFERENCES canonical_entities(id),
  completeness NUMERIC(6,4),          -- required fields filled
  freshness NUMERIC(6,4),             -- recency of last scrape
  consistency NUMERIC(6,4),           -- agreement across sources
  source_reliability NUMERIC(6,4),    -- health of originating sources
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (entity_id, computed_at)
);
```

**Indexes:**
```sql
CREATE INDEX idx_data_quality_scores_entity_id ON data_quality_scores(entity_id);
CREATE INDEX idx_data_quality_scores_computed_at ON data_quality_scores(computed_at DESC);
```

**Quality Score Computation:**

```typescript
completeness = (fields_filled / total_fields)
freshness = max(0, 1 - (days_since_last_scrape / 30))
consistency = (sources_agreeing / total_sources)
source_reliability = avg(source_health.success_rate)

quality_score = (completeness * 0.4 + freshness * 0.3 + consistency * 0.2 + source_reliability * 0.1)
```

---

### 20. Cost Events [NEW in v2]

**Tracks all external service costs.** Enables budget enforcement and per-entity cost attribution.

```sql
CREATE TABLE cost_events (
  id BIGSERIAL PRIMARY KEY,
  service TEXT NOT NULL,              -- 'openai' | 'proxy' | 'apify' etc.
  cost_usd NUMERIC(10,6) NOT NULL,
  job_id BIGINT REFERENCES crawl_jobs(id),
  entity_id BIGINT REFERENCES canonical_entities(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**
```sql
CREATE INDEX idx_cost_events_service ON cost_events(service);
CREATE INDEX idx_cost_events_entity_id ON cost_events(entity_id);
CREATE INDEX idx_cost_events_created_at ON cost_events(created_at DESC);
```

**Budget Enforcement:**

```typescript
async function checkDailyBudget(service: string): Promise<boolean> {
  const result = await db.query(`
    SELECT COALESCE(SUM(cost_usd), 0) as total
    FROM cost_events
    WHERE service = $1
      AND created_at >= NOW() - INTERVAL '1 day'
  `, [service])

  return result.rows[0].total < DAILY_BUDGET_LIMIT[service]
}

// AI enrichment gate
if (!await checkDailyBudget('openai')) {
  await pauseQueue('ai-queue')
  emitAlert('daily_ai_budget_exceeded')
  return
}
```

---

### 21. Entity Edges [NEW in v2 — Phase 3]

**Graph layer for brand relationships.** Modeled in PostgreSQL; can be migrated to a graph DB later.

```sql
CREATE TABLE entity_edges (
  from_entity_id BIGINT REFERENCES canonical_entities(id),
  to_entity_id BIGINT REFERENCES canonical_entities(id),
  relation_type TEXT NOT NULL,        -- 'hashtag' | 'style' | 'influencer' | 'community'
  weight NUMERIC(10,4) DEFAULT 1.0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (from_entity_id, to_entity_id, relation_type)
);
```

**Indexes:**
```sql
CREATE INDEX idx_entity_edges_from_entity_id ON entity_edges(from_entity_id);
CREATE INDEX idx_entity_edges_to_entity_id ON entity_edges(to_entity_id);
CREATE INDEX idx_entity_edges_relation_type ON entity_edges(relation_type);
```

---

## Entity Resolution Architecture

### Resolution Pipeline

```
1. Raw Discovery → Extract brand signals (name, handle, URL)
2. Candidate Matching → Find similar canonical entities (fuzzy name match, URL overlap)
3. Confidence Scoring → Compute similarity (0.0 - 1.0)
4. Auto-merge (≥ 0.90) → Merge into existing entity + emit event
5. Manual Review (0.70 - 0.89) → Queue for human approval
6. Create New (< 0.70) → Create new canonical entity + emit event
```

### Matching Signals

| Signal | Weight | Algorithm |
|--------|--------|-----------|
| Exact name match | 1.0 | Case-insensitive equality |
| Fuzzy name match | 0.7-0.9 | Levenshtein distance |
| URL domain match | 0.95 | Exact domain comparison |
| Social handle match | 0.85 | Case-insensitive + platform |
| Alias match | 0.75 | Check `entity_aliases` table |

### Merge Strategy

When merging `entity_b` into `entity_a`:
1. Update all `brand_identities` to point to `entity_a`
2. Copy all `entity_aliases` from `entity_b` to `entity_a`
3. Merge `metadata` JSONB (prefer non-null values from either)
4. Set `entity_b.status = 'merged'` and `entity_b.deleted_at = NOW()`
5. **Emit `entity.merged` event with trace_id**
6. Keep audit trail in `entity_resolution_jobs`

---

## pgvector Configuration

**Phase 2 addition:** Semantic brand embeddings for similarity search.

### Install Extension

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Add Embedding Column

**IMPORTANT: Lock embedding model + dimensions in migration 001. Never change it without a full rebuild.**

```sql
-- OpenAI text-embedding-3-small = 1536 dims
-- sentence-transformers/all-MiniLM-L6-v2 = 384 dims
-- Choose ONE. Never change it.

ALTER TABLE canonical_entities
  ADD COLUMN embedding vector(1536);

CREATE INDEX idx_canonical_entities_embedding ON canonical_entities
  USING hnsw (embedding vector_cosine_ops);
```

### Similarity Query

```typescript
// Find similar brands
const similar = await db
  .select({
    id: canonicalEntities.id,
    displayName: canonicalEntities.displayName,
    distance: sql<number>`1 - (${canonicalEntities.embedding} <=> ${queryEmbedding})`,
  })
  .from(canonicalEntities)
  .orderBy(sql`${canonicalEntities.embedding} <=> ${queryEmbedding}`)
  .limit(10)
```

**Indexing Strategy:**
- Use `ivfflat` for datasets < 1M vectors
- Use `hnsw` for datasets > 1M vectors (Postgres 17+)

---

## Meilisearch Index

### Index Configuration

```typescript
// packages/search/src/config.ts
export const brandIndexConfig = {
  uid: 'brands',
  primaryKey: 'id',
  searchableAttributes: [
    'display_name',
    'slug',
    'aliases',
    'categories',
  ],
  filterableAttributes: [
    'status',
    'score',
    'categories',
    'platforms',
    'verified',
    'created_at',
  ],
  sortableAttributes: [
    'score',
    'created_at',
  ],
  rankingRules: [
    'words',
    'typo',
    'proximity',
    'attribute',
    'sort',
    'exactness',
    'score:desc',  // Custom ranking
  ],
  typoTolerance: {
    enabled: true,
    minWordSizeForTypos: {
      oneTypo: 4,
      twoTypos: 8,
    },
  },
}
```

### Document Schema

```typescript
interface BrandDocument {
  id: string
  display_name: string
  slug: string
  aliases: string[]
  categories: string[]
  score: number
  status: 'discovered' | 'verified' | 'rejected' | 'merged'
  platforms: string[]  // ['instagram', 'tiktok', 'website']
  verified: boolean
  follower_count: number
  created_at: number  // Unix timestamp
}
```

### Sync Strategy

- **Initial sync:** Bulk import all verified entities on index creation
- **Incremental sync:** Workers push updates to Meilisearch after scoring
- **Rebuild:** Weekly full re-index (off-peak hours) to ensure consistency

---

## Redis Cache Strategy

### Use Cases

1. **Rate limiting:** Track API calls per adapter, per source domain
2. **Job deduplication:** Prevent duplicate discovery jobs (cache `source_url` for 24h)
3. **Session state:** Store OAuth tokens, crawler session cookies
4. **Computed aggregates:** Cache entity score distributions, category counts (TTL: 1 hour)

### Key Patterns

```typescript
// Rate limiting
const key = `ratelimit:${adapter}:${domain}:${minute}`
await redis.incr(key)
await redis.expire(key, 60)

// Job deduplication
const jobKey = `job:discovery:${sourceUrl}`
const exists = await redis.exists(jobKey)
if (exists) return // Skip duplicate

await redis.set(jobKey, '1', 'EX', 86400)  // 24h TTL
```

**Persistence:** Enable `appendonly yes` in Redis config to prevent data loss on restart.

---

## S3/MinIO Raw Storage

### Bucket Structure

```
brand-radar-raw/
├── html/
│   └── {job_id}/
│       └── {candidate_slug}.html.gz    -- raw crawled HTML
├── json/
│   └── {job_id}/
│       └── {candidate_slug}.json       -- raw API/social payloads
├── logos/
│   ├── {entity_id}/logo.png
│   └── {entity_id}/logo_thumb.png
└── exports/
    ├── brands_{date}.csv
    └── brands_{date}.json
```

### Lifecycle Policy

- **Raw HTML/JSON:** Transition to Glacier after 90 days
- **Logos:** Keep in standard storage indefinitely

### Replay Strategy

When an adapter is updated and extraction logic changes:
1. Query `raw_discoveries` for S3 keys
2. Re-run extraction on raw HTML without re-crawling
3. Compare old vs. new extracted data, flag diffs for review
4. Workers check `processed_jobs` scoped to new pipeline version — prevents double-writes

---

**Next Steps:**
1. Review [Pipeline Architecture](./pipeline.md) for worker orchestration and event emission
2. Review [Adapter Strategy](./adapters.md) for scraping patterns
3. Implement schema in `packages/db/src/schema/`
4. Enable event emission in all workers from day one
