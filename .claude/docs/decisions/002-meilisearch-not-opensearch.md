# ADR-002: Meilisearch Not OpenSearch

**Status:** Accepted  
**Date:** 2026-05-22  
**Deciders:** Engineering team  

---

## Context

Brand Radar needs full-text search with faceted filtering (category, score, founding year) and typo tolerance. We evaluated:

- **Meilisearch** (Rust-based, instant search focus)
- **OpenSearch** (Elasticsearch fork, enterprise-grade)
- **Typesense** (Similar to Meilisearch, newer)
- **Postgres full-text search** (Built-in, no external service)

---

## Decision

We will use **Meilisearch** as the primary search index.

---

## Rationale

### Why Meilisearch Over OpenSearch

| Aspect | Meilisearch | OpenSearch |
|--------|-------------|------------|
| **Setup complexity** | Single binary, 5-min setup | Requires JVM, cluster config |
| **Query speed** | < 50ms (optimized for < 1M docs) | Slower for small datasets |
| **Typo tolerance** | Built-in, tunable | Requires custom analyzers |
| **Faceted search** | First-class API | Complex aggregation queries |
| **Resource usage** | ~100MB RAM for 100k docs | ~1GB RAM minimum |
| **Maintenance** | Zero-ops (single node) | Cluster management overhead |

OpenSearch is overkill for Phase 1 (10k brands). Meilisearch is designed for instant search (Algolia-like) and handles our scale with minimal ops burden.

---

### Why Meilisearch Over Typesense

Typesense is similar but:
- Younger project (less battle-tested)
- Smaller community (fewer plugins, examples)
- No clear advantage over Meilisearch for our use case

Meilisearch has momentum (used by Astro, Nuxt, Docusaurus docs sites) and a mature ecosystem.

---

### Why Not Postgres Full-Text Search?

Postgres FTS is viable for Phase 1 but has limitations:
- **No typo tolerance** without extensions (pg_trgm is approximate)
- **Slower faceted search** (aggregations on large result sets)
- **No instant search UX** (lacks InstantSearch.js integration)

We'd rebuild Meilisearch features in SQL, which is tech debt. Better to use a purpose-built tool.

---

## Consequences

### Positive

- **Fast time-to-value:** Meilisearch up and running in < 1 hour.
- **Great DX:** Meilisearch InstantSearch SDK works out of the box with Vue 3.
- **Low ops burden:** Single Docker container, no cluster to manage.
- **Predictable scaling:** Handles 1M documents on a single node (Phase 3 upper bound).

### Negative

- **Vendor lock-in (mild):** If we outgrow Meilisearch, migrating to OpenSearch is non-trivial.
- **Limited ML features:** No vector search (we use pgvector for that in Phase 3).

---

## Mitigation

- **Data duplication is OK:** Postgres is source of truth, Meilisearch is a replica. We can re-index from Postgres if needed.
- **Exit strategy:** If we hit Meilisearch limits (> 10M brands), we can migrate to OpenSearch. The query interface is similar enough (REST JSON).

---

## When to Revisit

- When brand count exceeds 5M (Meilisearch slowdown threshold)
- When we need distributed search (multi-region, sharding)
- When we need advanced ML ranking (learning-to-rank models)

At that point, OpenSearch becomes worth the complexity.

---

## Alternatives Considered

1. **Algolia:** SaaS, expensive at scale (~$1/1k requests). Rejected due to cost.
2. **Elasticsearch:** Rejected same reasons as OpenSearch (overkill, ops burden).
3. **SQLite FTS5:** Rejected due to single-writer bottleneck, no network API.

---

## References

- [Meilisearch Documentation](https://docs.meilisearch.com/)
- [Meilisearch InstantSearch](https://github.com/meilisearch/meilisearch-js-plugins/tree/main/packages/instant-meilisearch)
- [Schema Design](../brand-platform/schema.md)
