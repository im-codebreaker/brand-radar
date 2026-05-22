# ADR-003: Adapter vs Source Separation

**Status:** Accepted  
**Date:** 2026-05-22  
**Deciders:** Engineering team  

---

## Context

Brand Radar scrapes data from multiple sources (Instagram, TikTok, Reddit, ecommerce sites). We debated two architectural patterns:

1. **Monolithic scraper per source** (`instagram.ts`, `tiktok.ts`) — each file handles discovery + extraction + normalization
2. **Adapter pattern** — each source is a plugin implementing a standard interface, orchestrated by a shared pipeline

---

## Decision

We will use the **adapter pattern** with a standard `ScraperAdapter` interface.

---

## Rationale

### Why Adapter Pattern

**Problem with monolithic scrapers:**
- Code duplication (rate limiting, retries, logging, S3 storage)
- Hard to test in isolation (no clear input/output contract)
- Difficult to swap sources (e.g., Instagram API → Instagram scraper)
- No enforced error handling (each scraper rolls its own)

**Adapter pattern benefits:**
- **Separation of concerns:** Adapters focus on extraction logic only. Pipeline handles orchestration (queueing, retries, storage).
- **Pluggability:** Adding a new source = drop a new adapter folder. Zero changes to worker code.
- **Testability:** Mock adapters for integration tests. Stub `discover()` and `extract()`.
- **Versioning:** When Instagram changes structure, create `instagram-v2/` without breaking `instagram-v1/`.
- **Observability:** Standardized health probes (`probe()` method) across all adapters.

---

## Interface Design

```typescript
interface ScraperAdapter {
  id: string                          // 'instagram-profile-v1'
  sourceType: 'instagram' | 'tiktok' | 'website' | 'reddit'

  configure(params: AdapterConfig): void
  discover(query: DiscoveryQuery): AsyncGenerator<RawCandidate>
  extract(url: string): Promise<ExtractedBrand>

  rateLimit: { requestsPerMinute: number; cooldownMs: number }
  probe(): Promise<AdapterHealth>    // Health check
}
```

---

## Folder Structure

```
packages/adapters/
├── instagram/
│   ├── hashtag-crawler.ts       # Implements discover()
│   ├── profile-extractor.ts     # Implements extract()
│   └── config.schema.json       # Zod schema for adapter config
├── tiktok/
│   ├── keyword-crawler.ts
│   └── config.schema.json
├── web/
│   ├── generic-crawler.ts
│   ├── shopify-detector.ts
│   └── config.schema.json
└── registry.ts                  # All adapters registered here
```

---

## Consequences

### Positive

- **Maintainability:** Adding/removing sources is surgical (one folder).
- **Consistency:** Every adapter has rate limiting, error handling, health checks.
- **Parallelization:** Workers can process multiple adapters concurrently (separate queues).
- **Reusability:** Same adapter interface works for batch discovery and ad-hoc extraction.

### Negative

- **Upfront abstraction cost:** Defining the interface takes time initially.
- **Interface evolution:** Changing the interface breaks all adapters (mitigated by versioning).

---

## Mitigation

- **Versioned adapters:** When a source changes, create `v2/` instead of modifying `v1/`.
- **Shared utilities:** Extract common logic (Playwright config, rate limiters) to `packages/adapters/src/utils/`.
- **Adapter registry:** Centralized registration (`registry.ts`) makes it easy to see all sources at a glance.

---

## When to Revisit

- If we add 20+ sources and the interface becomes too rigid (unlikely in Phase 1-3).
- If we need adapter-specific orchestration (e.g., Instagram requires multi-step OAuth) — add `setup()` method to interface.

---

## Alternatives Considered

1. **Monolithic scrapers:** Rejected due to code duplication and lack of pluggability.
2. **Microservices per source:** Overkill for Phase 1 (10k brands, 4 sources). Network overhead not justified.
3. **Shared base class:** Rejected because TypeScript interfaces are more flexible than inheritance.

---

## References

- [Adapter Architecture](../brand-platform/adapters.md)
- [Pipeline Architecture](../brand-platform/pipeline.md)
- [System Architecture](../architecture.md)
