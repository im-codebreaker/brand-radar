# Brand Radar — Data Layer & Schema

> **Database schema, pgvector configuration, and Meilisearch index design.**

---

## Table of Contents

1. [Data Layer Overview](#data-layer-overview)
2. [PostgreSQL Schema](#postgresql-schema)
3. [pgvector Configuration](#pgvector-configuration)
4. [Meilisearch Index](#meilisearch-index)
5. [Redis Cache Strategy](#redis-cache-strategy)
6. [S3/MinIO Raw Storage](#s3minio-raw-storage)

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
│   PostgreSQL    │  ← Source of truth (entities, relations)
│   + pgvector    │  ← Semantic embeddings (Phase 3)
└────────┬────────┘
         │ ephemeral
         ▼
┌─────────────────┐
│      Redis      │  ← Queue state, rate limits, session cache
└─────────────────┘

┌─────────────────┐
│   S3 / MinIO    │  ← Raw HTML/JSON, logos, screenshots
└─────────────────┘
```

**Responsibilities:**
- **PostgreSQL:** Canonical brand entities, discovery events, scores, relations
- **pgvector:** Semantic embeddings for similarity search (Phase 3)
- **Meilisearch:** Fast full-text + faceted search, typo tolerance
- **Redis:** BullMQ job queues, rate limit counters, ephemeral cache
- **S3/MinIO:** Immutable raw data, replays, compliance

---

## PostgreSQL Schema

### Core Tables

#### `brands`

```sql
CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  website_url TEXT,
  logo_url TEXT,
  founded_year INT,
  category TEXT,  -- 'perfume', 'fashion', 'beauty'
  status TEXT DEFAULT 'pending',  -- 'pending', 'approved', 'rejected'
  
  -- Scoring
  score NUMERIC(5,2) DEFAULT 0,
  score_version INT DEFAULT 1,
  last_scored_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes
  CHECK (score >= 0 AND score <= 100)
);

CREATE INDEX idx_brands_slug ON brands(slug);
CREATE INDEX idx_brands_score ON brands(score DESC) WHERE status = 'approved';
CREATE INDEX idx_brands_category ON brands(category) WHERE status = 'approved';
CREATE INDEX idx_brands_discovered_at ON brands(discovered_at DESC);
CREATE INDEX idx_brands_metadata_gin ON brands USING gin(metadata);
```

#### `discovery_events`

```sql
CREATE TABLE discovery_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  source TEXT NOT NULL,  -- 'instagram', 'tiktok', 'web', 'reddit'
  source_url TEXT NOT NULL,
  adapter_version TEXT NOT NULL,
  
  -- Raw data
  raw_html_s3_key TEXT,
  raw_json JSONB,
  
  -- Extraction
  extracted_data JSONB,
  extraction_success BOOLEAN DEFAULT FALSE,
  extraction_error TEXT,
  
  -- Timestamps
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  
  CONSTRAINT unique_discovery_event UNIQUE(brand_id, source, source_url)
);

CREATE INDEX idx_discovery_events_brand_id ON discovery_events(brand_id);
CREATE INDEX idx_discovery_events_source ON discovery_events(source);
CREATE INDEX idx_discovery_events_discovered_at ON discovery_events(discovered_at DESC);
```

#### `social_profiles`

```sql
CREATE TABLE social_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,  -- 'instagram', 'tiktok', 'youtube'
  handle TEXT NOT NULL,
  profile_url TEXT NOT NULL,
  
  -- Metrics (snapshotted daily)
  follower_count INT,
  following_count INT,
  post_count INT,
  engagement_rate NUMERIC(5,2),
  
  -- Timestamps
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_social_profile UNIQUE(brand_id, platform, handle)
);

CREATE INDEX idx_social_profiles_brand_id ON social_profiles(brand_id);
CREATE INDEX idx_social_profiles_platform ON social_profiles(platform);
```

#### `social_snapshots`

```sql
CREATE TABLE social_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES social_profiles(id) ON DELETE CASCADE,
  follower_count INT,
  post_count INT,
  engagement_rate NUMERIC(5,2),
  snapshot_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_social_snapshots_profile_id ON social_snapshots(profile_id);
CREATE INDEX idx_social_snapshots_snapshot_at ON social_snapshots(snapshot_at DESC);
```

#### `ecommerce_signals`

```sql
CREATE TABLE ecommerce_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  platform TEXT,  -- 'shopify', 'woocommerce', 'etsy', 'ssense'
  shop_url TEXT,
  product_count INT,
  price_range_min NUMERIC(10,2),
  price_range_max NUMERIC(10,2),
  currency TEXT DEFAULT 'USD',
  
  -- Timestamps
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  last_checked_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_ecommerce_signal UNIQUE(brand_id, platform, shop_url)
);

CREATE INDEX idx_ecommerce_signals_brand_id ON ecommerce_signals(brand_id);
CREATE INDEX idx_ecommerce_signals_platform ON ecommerce_signals(platform);
```

#### `trends`

```sql
CREATE TABLE trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  metric TEXT NOT NULL,  -- 'follower_growth', 'mention_spike', 'search_volume'
  value NUMERIC(10,2),
  change_percent NUMERIC(5,2),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  detected_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trends_brand_id ON trends(brand_id);
CREATE INDEX idx_trends_metric ON trends(metric);
CREATE INDEX idx_trends_detected_at ON trends(detected_at DESC);
```

---

## pgvector Configuration

**Phase 3 addition:** Semantic brand embeddings for similarity search.

### Install Extension

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Add Embedding Column

```sql
ALTER TABLE brands
ADD COLUMN embedding vector(1536);  -- OpenAI text-embedding-3-small

CREATE INDEX idx_brands_embedding ON brands
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

### Similarity Query

```typescript
// Find similar brands
const similar = await db
  .select({
    id: brands.id,
    name: brands.name,
    distance: sql<number>`1 - (${brands.embedding} <=> ${queryEmbedding})`,
  })
  .from(brands)
  .orderBy(sql`${brands.embedding} <=> ${queryEmbedding}`)
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
    'name',
    'description',
    'category',
    'tags',
  ],
  filterableAttributes: [
    'category',
    'status',
    'founded_year',
    'score',
    'has_ecommerce',
    'discovered_at',
  ],
  sortableAttributes: [
    'score',
    'founded_year',
    'discovered_at',
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
  name: string
  slug: string
  description: string | null
  category: string
  website_url: string | null
  logo_url: string | null
  founded_year: number | null
  score: number
  status: 'pending' | 'approved' | 'rejected'
  has_ecommerce: boolean
  social_platforms: string[]  // ['instagram', 'tiktok']
  tags: string[]
  discovered_at: number  // Unix timestamp
}
```

### Sync Strategy

- **Initial sync:** Bulk import all approved brands on index creation
- **Incremental sync:** Workers push updates to Meilisearch after scoring/enrichment
- **Rebuild:** Weekly full re-index (off-peak hours) to ensure consistency

---

## Redis Cache Strategy

### Use Cases

1. **Rate limiting:** Track API calls per adapter, per source domain
2. **Job deduplication:** Prevent duplicate discovery jobs (cache `source_url` for 24h)
3. **Session state:** Store OAuth tokens, crawler session cookies
4. **Computed aggregates:** Cache brand score distributions, category counts (TTL: 1 hour)

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

---

## S3/MinIO Raw Storage

### Bucket Structure

```
brand-radar-raw/
├── instagram/
│   └── YYYY-MM-DD/
│       └── <post_id>.html
├── tiktok/
│   └── YYYY-MM-DD/
│       └── <video_id>.json
├── web/
│   └── <domain>/
│       └── YYYY-MM-DD/
│           └── <sha256(url)>.html
└── logos/
    └── <brand_id>/
        └── logo.png
```

### Lifecycle Policy

- **Raw HTML/JSON:** Transition to Glacier after 90 days
- **Logos:** Keep in standard storage indefinitely

### Replay Strategy

When an adapter is updated and extraction logic changes:
1. Query `discovery_events` for raw S3 keys
2. Re-run extraction on raw HTML without re-crawling
3. Compare old vs. new extracted data, flag diffs for review

---

**Next Steps:**
1. Review [Pipeline Architecture](./pipeline.md) for worker orchestration
2. Review [Adapter Strategy](./adapters.md) for scraping patterns
3. Implement schema in `packages/db/src/schema/`
