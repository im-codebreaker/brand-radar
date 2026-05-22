# Brand Radar — Strategic Overview & Roadmap

> **Product Vision:** A modular, pipeline-driven intelligence platform for discovering, resolving, and ranking emerging fashion and perfume brands from social platforms and the web.

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

### Biggest Strategic Risk

> **Building intelligence systems before stabilizing ingestion.**

If ingestion is unreliable:
- Embeddings become garbage
- Trends become noisy
- Recommendations mislead
- Graphs get polluted

**Stabilize the pipeline first. Intelligence follows.**

---

## What It Is NOT (Yet)

- ❌ Not a recommendation engine (Phase 3+)
- ❌ Not a graph exploration tool (Phase 3+)
- ❌ Not a viral prediction system (Phase 3+)
- ❌ Not a real-time social monitoring platform

---

## Core Principles

| Principle | What It Means |
|-----------|---------------|
| **Pipeline-first** | Every piece of data flows through defined stages, not ad-hoc scrapers |
| **Adapter abstraction** | Every source is a self-contained plugin with a standard interface |
| **Raw storage always** | Store raw HTML/JSON before parsing — replay extractions without re-crawling |
| **Entity resolution is foundational** | One canonical brand entity per brand, resolved before scoring or indexing |
| **Deterministic before AI** | Core pipeline must never depend on AI to function |
| **Observability from day one** | Silent scraper failures are the #1 reliability killer |
| **Phase discipline** | Don't build Phase 2 features until Phase 1 is stable and boring |

---

## Phased Roadmap

### Phase 1 — Stable Pipeline (Weeks 1–8)

**Goal:** Reliable ingestion, entity resolution, and basic search. Nothing more.

#### Discovery Sources
- Instagram hashtag crawler (β-tested niches: #nicheperfume, #artisanfragrance)
- TikTok keyword search (via unofficial API or Playwright)
- Generic web crawler (Shopify detection, brand homepage parsing)
- Reddit brand mentions (r/fragrance, r/indiemakeupandmore)

#### Core Features
- Raw HTML/JSON storage (S3/MinIO)
- Brand entity resolution (fuzzy matching + manual review queue)
- Basic metadata extraction (name, URL, description, founding year)
- PostgreSQL + pgvector schema
- Meilisearch indexing (full-text + faceted search)
- Simple discovery feed UI (Vue 3)

#### Success Criteria
- 95% scraper uptime across all adapters
- Zero data loss (all raw pages stored)
- Entity resolution false-positive rate < 5%
- Search returns results in < 200ms for 10k brands

---

### Phase 2 — Intelligence Layer (Weeks 9–16)

**Goal:** Add scoring, trends, and enrichment. Still no AI-dependent features.

#### New Capabilities
- Multi-source enrichment (social follower counts, ecommerce signals)
- Brand scoring system (v1: rule-based)
- Trend detection (growth velocity, spike detection)
- Admin review queue for entity resolution
- Social presence timeline (historical snapshots)

#### Success Criteria
- Scoring runs nightly, completes in < 1 hour
- Trend detection identifies 80% of viral brands within 7 days
- Admin review queue processes 100 brands/day

---

### Phase 3 — AI & Recommendations (Weeks 17–24)

**Goal:** Semantic search, embeddings, similarity, and recommendations.

#### New Capabilities
- Brand embeddings (from descriptions + metadata)
- Semantic search (pgvector cosine similarity)
- "Similar brands" recommendations
- Niche classification (ML-based)
- Brand graph visualization

#### Success Criteria
- Semantic search precision@10 > 80%
- Recommendation CTR > 15%
- Niche classifier accuracy > 90%

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

---

## Risks & Hidden Complexity

### 1. Anti-Bot Arms Race

**Risk:** Instagram, TikTok, and social platforms actively block scrapers. Detection methods evolve monthly.

**Mitigation:**
- Playwright with stealth plugins
- Rotating proxies (residential IPs)
- Behavioral mimicry (mouse movements, scroll patterns)
- Rate limiting per source (aggressive for social, gentle for owned sites)
- Fallback to official APIs where available (Instagram Basic Display, TikTok Research API)

**Contingency:** If a source becomes un-scrapable, pause that adapter and pivot to user-submitted brands or API-only sources.

---

### 2. Entity Resolution Accuracy

**Risk:** Fuzzy matching creates false positives (e.g., "Byredo" the perfume brand vs. "Byredo" the Swedish tech company).

**Mitigation:**
- Domain-aware heuristics (e.g., require `.com` match or social handle match)
- Manual review queue for ambiguous matches (confidence score < 0.7)
- User feedback loop ("Is this the same brand?")

**Baseline:** Expect 5-10% false positive rate initially. Improve with feedback.

---

### 3. Data Drift

**Risk:** Website structures change. Scrapers break silently. Data quality degrades.

**Mitigation:**
- Health probes per adapter (daily canary runs)
- Schema validation on extraction (Zod)
- Alerting on drop in extraction success rate (> 20% failure rate for 2 consecutive days)
- Version adapters (`instagram-v2`, `instagram-v3`) to allow gradual migration

---

### 4. Scaling Ingestion

**Risk:** Phase 1 targets 10k brands. Phase 2 could scale to 100k. Worker contention, database write load, and storage costs spike.

**Mitigation:**
- Horizontal worker scaling (BullMQ concurrency)
- Partitioned tables in Postgres (by `discovered_at` month)
- S3/MinIO lifecycle policies (archive raw HTML after 90 days)
- Meilisearch sharding (if index exceeds 1M documents)

**Benchmark:** Load test pipeline with 100k brands before Phase 2 launch.

---

## Implementation Checklist

### Phase 1 Prerequisites

- [ ] PostgreSQL + pgvector extension installed
- [ ] Redis instance running (for BullMQ)
- [ ] Meilisearch instance deployed
- [ ] S3/MinIO bucket configured (raw HTML storage)
- [ ] Playwright browser contexts configured (Chromium + stealth)
- [ ] Proxy pool subscribed (if using residential proxies)
- [ ] Domain whitelist defined (which sites to crawl)
- [ ] Rate limit config per adapter (requests/minute)
- [ ] Monitoring stack (Prometheus + Grafana or similar)
- [ ] Admin review queue UI scaffolded

### Phase 1 Deliverables

- [ ] 4 discovery adapters (Instagram, TikTok, web, Reddit) deployed
- [ ] Entity resolution pipeline (fuzzy match + manual queue)
- [ ] Basic metadata extraction (name, URL, description)
- [ ] Meilisearch index + full-text search API
- [ ] Discovery feed UI (Vue 3, filterable by source, date)
- [ ] Health monitoring dashboard (adapter uptime, extraction success rate)
- [ ] Raw HTML storage + S3 lifecycle policy

### Phase 2 Deliverables

- [ ] Enrichment workers (social follower counts, ecommerce signals)
- [ ] Scoring system v1 (rule-based)
- [ ] Trend detection (growth velocity, spike detection)
- [ ] Admin review queue (entity resolution approval/rejection)
- [ ] Social presence timeline (historical snapshots)

### Phase 3 Deliverables

- [ ] Brand embeddings (pgvector)
- [ ] Semantic search API
- [ ] "Similar brands" recommendations
- [ ] Niche classification (ML model)
- [ ] Brand graph visualization

---

## Decision Log

Key architectural decisions are documented in [`.claude/docs/decisions/`](../decisions/):

- [ADR-001: Playwright Only](../decisions/001-playwright-only.md)
- [ADR-002: Meilisearch Not OpenSearch](../decisions/002-meilisearch-not-opensearch.md)
- [ADR-003: Adapter vs Source Separation](../decisions/003-adapter-vs-source-separation.md)

---

**Next Steps:**
1. Review [Pipeline Architecture](./pipeline.md) for worker and job orchestration design
2. Review [Schema Design](./schema.md) for data model and search index structure
3. Review [Adapter Strategy](./adapters.md) for scraping and anti-bot tactics
