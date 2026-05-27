# Brand Radar — Strategic Overview & Roadmap

> **Product Vision:** A modular, pipeline-driven intelligence platform for discovering, resolving, and ranking emerging fashion and perfume brands from social platforms and the web.

> **Design Philosophy:** Build a pipeline-first, event-sourced data product. Ingestion reliability is everything. Every output is a projection of raw immutable events and versioned pipeline execution.

---

## Table of Contents

1. [What This Platform Does](#what-this-platform-does)
2. [What It Is NOT (Yet)](#what-it-is-not-yet)
3. [Core Principles](#core-principles)
4. [Phased Roadmap](#phased-roadmap)
5. [Future AI/ML Opportunities](#future-aiml-opportunities)
6. [Risks & Hidden Complexity](#risks--hidden-complexity)
7. [Implementation Checklist](#implementation-checklist)

---

## What This Platform Does

A modular, pipeline-driven intelligence platform that:

- **Discovers** emerging fashion and perfume brands from social platforms and the web
- **Resolves** discovered signals into canonical brand entities
- **Enriches** brands with structured metadata, social presence, and ecommerce signals
- **Scores** and ranks brands by niche relevance, growth velocity, and uniqueness
- **Surfaces** intelligence through a searchable, filterable dashboard
- **Supports** full system replay from raw data at any point in time

### Biggest Strategic Risk

> **Building intelligence systems before stabilizing ingestion AND event consistency.**

If ingestion is unreliable:
- Embeddings become garbage
- Trends become noisy
- Recommendations mislead
- Graphs get polluted

If event sourcing is missing:
- You cannot debug scoring drift
- You cannot rebuild embeddings safely
- You cannot compare pipeline versions
- You cannot trust historical analytics

**Stabilize the pipeline first. Intelligence follows.**

---

## What It Is NOT (Yet)

- ❌ Not a recommendation engine (Phase 3+)
- ❌ Not a graph exploration tool (Phase 3+)
- ❌ Not a viral prediction system (Phase 3+)
- ❌ Not a real-time stream processing system (Kafka not required yet)
- ❌ Not an AI-first system — AI is secondary, never authoritative
- ❌ Not a mutable dataset system — everything is append-only and versioned

---

## Core Principles

| Principle | What It Means |
|-----------|---------------|
| **Pipeline-first** | Every piece of data flows through defined stages, not ad-hoc scrapers |
| **Event-sourced core** | Every mutation emits a system event to the event backbone |
| **Append-only truth** | No destructive updates to core signals |
| **Adapter abstraction** | Every source is a self-contained plugin with a standard interface |
| **Raw storage always** | Store raw HTML/JSON before parsing — replay extractions without re-crawling |
| **Deterministic pipelines** | Same inputs + same version = same outputs, always |
| **Idempotent workers** | Every job is safe to retry without side effects |
| **Versioned DAG execution** | Pipelines evolve safely; old versions remain replayable |
| **Entity resolution is foundational** | One canonical brand entity per brand, resolved before scoring or indexing |
| **Deterministic before AI** | Core pipeline must never depend on AI to function |
| **Cost-aware AI usage** | AI is strictly gated and metered — never on the critical path |
| **Observability from day one** | Silent scraper failures are the #1 reliability killer |
| **Phase discipline** | Don't build Phase 2 features until Phase 1 is stable and boring |

---

## Phased Roadmap

### Phase 1 — Stable Event-Sourced Pipeline (Weeks 1–8)

**Goal:** Reliable ingestion, entity resolution, event backbone, and basic search. Nothing more.

#### Discovery Sources
- Instagram hashtag crawler (β-tested niches: #nicheperfume, #artisanfragrance)
- TikTok keyword search (via Playwright stealth or Apify fallback)
- Generic web crawler (Shopify detection, brand homepage parsing)
- Reddit brand mentions (r/fragrance, r/indiemakeupandmore)

#### Core Pipeline

```
Source → Discover candidates → Extract structured data
→ Normalize → Resolve entity → Deterministic Enrichment
→ Store → Score → Index → Emit Events (at every stage)
```

#### What Gets Built

- Adapter interface + 3–4 initial adapters
- Raw document storage (S3/MinIO)
- Normalization worker (slug canonicalization, fuzzy dedup)
- Canonical entity resolver + merge candidate queue
- `sources` table with cron scheduling (admin-configurable, no code changes)
- **Event backbone (`system_events`)** — every pipeline step emits events from day one
- **Trace ID propagated** through the entire pipeline
- **All workers idempotent** from the start (via `processed_jobs` table)
- **Pipeline versioning** (`pipeline_versions` table + DAG tracking)
- Deterministic enrichment worker (WHOIS, Shopify detect, logo fetch, tech stack)
- Basic scoring: mention frequency + follower count + website presence + data quality
- Keyword search + category filters (Meilisearch)
- Admin dashboard: source manager, job monitor, brand list, merge review, **event debug viewer**

#### What Gets Deferred

- AI enrichment (embeddings, classification)
- Semantic similarity
- Trend intelligence
- Recommendations
- Cost governance UI (tracked in DB, not surfaced yet)
- Backfill UI (engine built, UI in Phase 3)

#### Phase 1 Success Criteria

- 500+ unique canonical brand entities discovered
- < 5% duplicate rate after normalization
- All sources have health monitoring
- Any source can be paused/configured from the admin UI without code changes
- Failed jobs replay cleanly from raw storage
- **Every pipeline action has a corresponding `system_events` row with a `trace_id`**
- **All workers check `processed_jobs` before execution**
- **Pipeline version recorded on every job and event**

---

### Phase 2 — Intelligence Layer (Weeks 9–16)

**Goal:** Add AI enrichment and semantic search on top of a stable, observable, event-sourced pipeline.

#### New Capabilities

- OpenAI / sentence-transformers embeddings stored in pgvector
- **AI enrichment worker** (async, non-blocking, always cost-gated)
- Semantic brand similarity (HNSW index)
- AI auto-categorization (LLM classifier with confidence threshold)
- Style detection from brand descriptions + product pages
- Enhanced scoring: semantic score + uniqueness score + **data quality score**
- Hybrid search: keyword (Meilisearch) + semantic (pgvector) combined ranking
- Trend signals: mention frequency growth, hashtag velocity, follower growth rate
- Score history table → trend sparklines in UI
- **Data quality layer** per entity (completeness, freshness, consistency, source reliability)
- **Cost events tracked** per AI call; daily budget enforced

#### New Workers

- AI Enrichment Worker (async, never blocks core pipeline, always cost-gated)
- Trend Worker (weekly batch, not real-time)
- Data Quality Worker (computes quality scores)

#### Phase 2 Success Criteria

- Semantic search returns meaningfully better results than keyword-only
- Auto-categorization accuracy > 80% on validation set
- Score trend charts showing 30-day history per brand
- **Cost events tracked per AI call; daily budget enforced**
- **Data quality scores computed for all entities**
- AI enrichment never delays core pipeline

---

### Phase 3 — Graph & Prediction (Weeks 17–26)

**Goal:** Surface relationship intelligence, predictive signals, and enable system replay.

#### New Capabilities

- Brand relationship graph (brand ↔ hashtags, styles, influencers, communities)
- Similar brands graph visualization (Cytoscape.js)
- Trend acceleration + emerging niche detection
- Recommendation engine (based on mature embeddings + taxonomy)
- Export API (CSV / JSON brand datasets)
- Natural language brand search ("find niche French perfumers under 10k followers")
- **Backfill engine UI** (admin-triggered replay of raw data through new pipeline versions)
- **Event Debug Viewer** (full trace_id explorer for any entity or job)
- **Pipeline version comparison** (run v1 and v2 in parallel, compare outputs)

#### Note on Graph Storage

Do NOT add Neo4j yet. Model graph relationships in PostgreSQL join tables (`entity_edges`). Migrate to a graph DB only when query complexity demands it.

---

## Future AI/ML Opportunities

### After Phase 3 is Stable

| Opportunity | What It Enables | Complexity | Dependencies |
|-------------|-----------------|------------|--------------|
| **Viral prediction** | Forecast which brands will spike in 30 days | High | Time-series models, feature engineering |
| **Brand graph** | Explore brand relationships (stockists, collabs, influences) | Medium | Graph database, entity linking |
| **Auto-tagging** | Classify brands by aesthetic, price tier, values | Medium | LLM-based classification |
| **Content generation** | Auto-generate brand summaries, comparisons | Low | GPT-4 API |
| **Anomaly detection** | Flag suspicious brands (dropshippers, copycats) | Medium | Outlier detection, fraud signals |

**AI Rules (Non-Negotiable):**
- Never on the ingestion critical path
- Always async
- Always cost-gated before execution
- Always versioned (model name + dims recorded at time of embedding)
- AI workers are isolated — a failure never propagates to core pipeline

---

## Risks & Hidden Complexity

### High Severity

| Risk | Mitigation |
|------|------------|
| Platform API changes (TikTok/IG break scrapers regularly) | Adapter abstraction — swap implementation without touching pipeline |
| IP blocking | Residential proxies + conservative rate limits from day one |
| Entity resolution at scale (50k+ brands) | Build normalization worker in Phase 1, not later |
| Data freshness vs. cost | Tiered refresh schedule by score tier |
| Redis data loss on restart | Enable `appendonly yes` in Redis config immediately |
| Duplicate entity explosion under load | Idempotency system prevents double-processing at every stage |
| **Pipeline drift across versions** | **Versioned DAG + every job records `pipeline_version`** |
| **Debugging broken entities** | **`trace_id` system + Event Debug Viewer in admin** |
| **AI cost runaway** | **`cost_events` tracking + daily budget gate on `ai-queue`** |
| Bad entity merges | Merge review queue — all auto-merges below confidence threshold require human approval |

### Medium Severity

| Risk | Mitigation |
|------|------------|
| pgvector dimension lock-in | Choose one embedding model in migration 001, never change |
| OpenSearch operational overhead | Use Meilisearch for Phase 1, migrate only when scale demands |
| `raw_discoveries` table bloat | Store raw HTML in S3, keep only structured data in Postgres |
| Silent scraper failures | Source health monitoring from day one |
| Recommendation quality on bad data | Don't build recommendations until entity resolution is mature |
| **Event replay correctness** | **Idempotency keys scoped to pipeline version prevent double-writes** |
| Long-term raw data storage cost | Lifecycle policies on MinIO/S3 — archive after 90 days |

### Hidden Complexity

- **Name ambiguity** — "Rose & Co" could be 40 different brands globally. Geographic disambiguation requires verified website data.
- **Multi-language normalization** — Japanese, Arabic, Korean brand names need charset normalization from the start.
- **Headless Shopify** — custom storefronts defeat simple platform fingerprinting.
- **Score corruption from duplicates** — duplicate brands split social signals and corrupt scores. Entity resolution must be solid before scoring matters.
- **Multi-version embedding drift** — if you switch embedding models mid-flight, old and new vectors are not comparable. The HNSW index must be fully rebuilt.
- **Schema evolution safety** — adding columns to `system_events.payload` is safe (JSONB); changing event shapes requires a new `schema_version` and a backfill.
- **Graph data model migration** — model with join tables (`entity_edges`) that can be projected into a graph DB later, not a deeply nested relational schema.
- **Event replay ordering** — backfills must respect original `discovered_at` ordering to avoid score inflation from out-of-order signal injection.

---

## Implementation Checklist

### Phase 1 Prerequisites

- [ ] PostgreSQL + pgvector extension installed
- [ ] Redis instance running (for BullMQ + `appendonly yes` enabled)
- [ ] Meilisearch instance deployed
- [ ] S3/MinIO bucket configured (raw HTML storage)
- [ ] Playwright browser contexts configured (Chromium + stealth)
- [ ] Proxy pool subscribed (if using residential proxies)
- [ ] Domain whitelist defined (which sites to crawl)
- [ ] Rate limit config per adapter (requests/minute)
- [ ] Monitoring stack (Prometheus + Grafana or similar)
- [ ] Admin review queue UI scaffolded

### Phase 1 Deliverables

**Infrastructure:**
- [ ] Docker Compose: PostgreSQL + Redis + Meilisearch + MinIO
- [ ] PostgreSQL extensions: `pg_trgm`, `unaccent`
- [ ] S3/MinIO buckets: `raw/`, `logos/`, `exports/`

**Event Backbone (NEW in v2):**
- [ ] `system_events` table created
- [ ] `trace_id` generated at discovery and propagated through all downstream jobs
- [ ] All workers emit events on completion
- [ ] `processed_jobs` idempotency table created
- [ ] All workers check idempotency key before execution
- [ ] `pipeline_versions` table created + first version seeded as active
- [ ] Event Debug Viewer (trace_id explorer, basic version)

**Adapter Layer:**
- [ ] `ScraperAdapter` interface defined and documented
- [ ] `sources` table + admin source manager UI
- [ ] `crawl_profiles` table + profile registry
- [ ] Initial adapters: Instagram, TikTok (stealth), generic web crawler, Fragrantica

**Core Pipeline:**
- [ ] BullMQ queues: discovery, crawl, normalization, enrichment, scoring, index, dead-letter
- [ ] Per-queue: retry config, exponential backoff, dead-letter routing
- [ ] Per-adapter: circuit breaker + health check (`probe()`)
- [ ] Raw document storage → S3 before any extraction
- [ ] Normalization worker: slug canonicalization, fuzzy dedup via `pg_trgm`
- [ ] Canonical entity resolver + merge candidate queue
- [ ] Deterministic enrichment: WHOIS, Shopify detect, logo fetch
- [ ] Scoring worker: Phase 1 score → `brand_scores` table (includes data quality)
- [ ] Meilisearch index sync worker

**Database:**
- [ ] All Phase 1 tables created via migrations (include v2 tables from day one)
- [ ] `extractor_version`, `schema_version`, `pipeline_version` on crawl_jobs and raw_discoveries
- [ ] `brand_scores` time-series table (not just a score column on `canonical_entities`)

**Admin UI:**
- [ ] Source manager (enable/disable, manual trigger, last run, success rate)
- [ ] Job monitor (queue depth, log streaming, retry failed)
- [ ] Brand list (filter, sort, quick actions)
- [ ] Merge review queue (side-by-side, one-click merge)

**Observability:**
- [ ] Structured JSON logging with `trace_id` in every log line (Pino)
- [ ] Prometheus metrics per worker (including `adapter_circuit_state`)
- [ ] Source health tracking → `source_health` table
- [ ] Alert: source dark > 1h, error rate > 30%, CAPTCHA rate > 10%

---

### Phase 2 Deliverables

- [ ] Choose embedding model, lock dimensions in migration, create pgvector column + HNSW index
- [ ] AI enrichment worker (async, non-blocking, cost-gated)
- [ ] `cost_events` table + daily budget enforcement on `ai-queue`
- [ ] LLM auto-categorization (confidence threshold before firing)
- [ ] Hybrid search: Meilisearch + pgvector combined ranking endpoint
- [ ] Score history → trend sparklines in brand detail view
- [ ] Velocity detection: "rising brand" signal (score delta > 15 in 7d)
- [ ] Trends dashboard (mention frequency, follower growth charts)
- [ ] Similar brands list (cosine similarity via pgvector)
- [ ] `data_quality_scores` table + quality worker
- [ ] Data Quality dashboard in admin
- [ ] Cost governance dashboard (daily spend per service)

---

### Phase 3 Deliverables

- [ ] `entity_edges` join table (brand_hashtags, brand_styles, brand_influencers, brand_communities)
- [ ] Similar brands graph (Cytoscape.js force-directed)
- [ ] Trend acceleration + emerging niche detection
- [ ] Backfill engine (UI + scoped triggers in admin)
- [ ] Recommendation engine (only after entity resolution is fully mature)
- [ ] Export API (CSV / JSON)
- [ ] Natural language search (LLM query → structured filter translation)
- [ ] Evaluate graph DB migration (Neo4j / Apache AGE) if query complexity demands

---

## Decision Log

Key architectural decisions are documented in [`.claude/docs/decisions/`](../decisions/):

- [ADR-001: Playwright Only](../decisions/001-playwright-only.md)
- [ADR-002: Meilisearch Not OpenSearch](../decisions/002-meilisearch-not-opensearch.md)
- [ADR-003: Adapter vs Source Separation](../decisions/003-adapter-vs-source-separation.md)

---

**Next Steps:**
1. Review [Architecture](../architecture.md) for system-level design
2. Review [Pipeline Architecture](./pipeline.md) for worker and job orchestration design
3. Review [Schema Design](./schema.md) for data model and event sourcing tables
4. Review [Adapter Strategy](./adapters.md) for scraping and anti-bot tactics
