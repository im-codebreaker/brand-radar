# Brand Radar: Monorepo Restructure Design

**Date:** 2026-05-18  
**Status:** Approved  
**Type:** Architecture / Refactoring

---

## Overview

Restructure the Brand Radar monorepo from the stackit boilerplate template into a production-ready architecture for an AI-powered brand discovery and analysis platform.

**What Brand Radar does:**
- Discovers niche brands (initially clothing and perfume)
- Semantic search with AI-powered classification
- Social signals analysis (Instagram, TikTok, Reddit, etc.)
- Trend detection and scoring
- Brand similarity recommendations

**Technical Stack:**
- Frontend: Vue 3, Vite, Pinia, Vue Router, Tailwind v4
- Backend: Fastify 5, autoload, type-provider-zod
- Database: PostgreSQL + pgvector (vector embeddings)
- Search: OpenSearch (full-text + semantic search)
- Cache/Queues: Redis + BullMQ
- AI/ML: Embeddings, NLP, classification
- Workers: Background job processing
- Scheduler: Cron-based job creation

---

## Goals

1. **Evolve from template to product** - move beyond stackit boilerplate
2. **Domain-driven structure** - organize by business domains, not technical layers
3. **Scalability** - support 9+ API modules, 6+ worker types
4. **Clean architecture** - clear separation of concerns
5. **Monorepo clarity** - logical package organization

---

## Architecture Overview

```
                ┌─────────────┐
                │ Fastify API │
                └──────┬──────┘
                       │
                 ┌─────▼─────┐
                 │  BullMQ   │
                 └─────┬─────┘
                       │
  ┌────────────────────────────────────┐
  │         Workers Layer              │
  │  - Discovery  - Embeddings         │
  │  - Crawl      - Scoring            │
  │  - Social     - Indexing           │
  └────────────────┬───────────────────┘
                   │
      ┌────────────▼────────────┐
      │ PostgreSQL + pgvector  │
      └────────────┬────────────┘
                   │
            ┌──────▼──────┐
            │ OpenSearch  │
            └─────────────┘
```

**Data Flow:**
1. API creates jobs → BullMQ queues
2. Workers consume jobs → process data → write to PostgreSQL
3. Indexing workers sync PostgreSQL → OpenSearch
4. API reads from PostgreSQL (structured) + OpenSearch (search)

---

## Directory Structure

### Complete Tree

```
brand-radar/
├── apps/
│   ├── api/                    # Fastify API Gateway (domain modules)
│   ├── web/                    # Vue 3 Frontend
│   ├── workers/                # Background job workers
│   └── scheduler/              # Job scheduling (BullMQ + cron)
│
├── packages/
│   ├── shared/                 # Consolidated shared code
│   ├── db/                     # Drizzle ORM + PostgreSQL schema
│   ├── redis/                  # Redis client + BullMQ queues
│   ├── search/                 # OpenSearch client + search utilities
│   ├── ai/                     # AI/ML models, embeddings, NLP
│   ├── taxonomy/               # Brand classification + category system
│   ├── auth/                   # better-auth wrapper
│   └── config/                 # ESLint + TypeScript configs
│
├── infrastructure/             # nginx config (k8s/terraform reserved)
├── .claude/                    # Claude Code config + agents
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

### apps/api/ - Fastify API (Domain Modules)

```
apps/api/
├── src/
│   ├── modules/
│   │   ├── brands/
│   │   │   ├── brands.routes.ts
│   │   │   ├── brands.handlers.ts
│   │   │   ├── brands.service.ts
│   │   │   ├── brands.repository.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── search/
│   │   ├── discovery/
│   │   ├── trends/
│   │   ├── recommendations/
│   │   ├── taxonomy/
│   │   ├── social/
│   │   ├── auth/
│   │   └── admin/
│   │
│   ├── plugins/
│   │   ├── core/           # db, redis, search, auth, repositories
│   │   └── external/       # cors, helmet, swagger, rate-limit
│   │
│   ├── lib/
│   ├── config/
│   ├── types/
│   └── server.ts
│
├── tests/
└── package.json
```

**Why domain modules?**
- Each module is self-contained (routes → handlers → services → repositories)
- Clear boundaries prevent cross-domain coupling
- Scales well (9+ domains = 9 folders, not 36+ files in root)
- Follows Fastify best practices and clean architecture

### apps/web/ - Vue 3 Frontend

```
apps/web/
├── src/
│   ├── views/
│   │   ├── DiscoveryView.vue       # Discovery feed
│   │   ├── SearchView.vue          # Search explorer
│   │   ├── BrandDetailView.vue     # Brand detail page
│   │   ├── TrendsView.vue          # Trends dashboard
│   │   ├── SimilarBrandsView.vue   # Similar brands graph
│   │   └── AdminView.vue           # Admin panel
│   │
│   ├── components/
│   │   ├── brand/          # Brand components
│   │   ├── search/         # Search components
│   │   ├── trends/         # Trend components
│   │   └── ui/             # Reusable UI
│   │
│   ├── stores/             # Pinia stores (auth, brands, search, trends)
│   ├── composables/
│   ├── router/
│   ├── lib/
│   └── App.vue
│
└── package.json
```

### apps/workers/ - Background Workers

```
apps/workers/
├── src/
│   ├── workers/
│   │   ├── base-worker.ts
│   │   └── worker-registry.ts
│   │
│   ├── discovery/          # Discover brands (Google, Reddit, blogs)
│   ├── crawl/              # Crawl websites (Playwright, Cheerio)
│   ├── social/             # Social metrics (Instagram, TikTok, Reddit)
│   ├── embeddings/         # Generate embeddings, classify taxonomy
│   ├── scoring/            # Compute niche/trend/growth scores
│   ├── indexing/           # Sync PostgreSQL → OpenSearch
│   │
│   ├── queues/
│   ├── shared/
│   └── bootstrap.ts
│
└── package.json
```

### apps/scheduler/ - Job Scheduling

```
apps/scheduler/
├── src/
│   ├── jobs/
│   │   ├── discovery-jobs.ts
│   │   ├── crawl-jobs.ts
│   │   ├── social-jobs.ts
│   │   ├── trend-jobs.ts
│   │   └── maintenance-jobs.ts
│   │
│   ├── schedules/
│   │   ├── cron-config.ts
│   │   └── job-scheduler.ts
│   │
│   └── main.ts
│
└── package.json
```

### packages/shared/ - Consolidated Shared Code

```
packages/shared/
├── src/
│   ├── constants/      # App constants
│   ├── dto/            # Data Transfer Objects
│   ├── enums/          # TypeScript enums
│   ├── errors/         # Custom error classes
│   ├── guards/         # Type guards
│   ├── schemas/        # Zod schemas (was packages/validations)
│   ├── types/          # TypeScript types (was packages/types)
│   └── utils/          # Utilities (was packages/helpers)
│
└── package.json
```

**Why consolidate?**
- Reduces package count (3 → 1)
- Clear organization by concern
- Single import path: `@brand-radar/shared/{schemas,types,utils}`

### packages/redis/ - Redis + BullMQ

```
packages/redis/
├── src/
│   ├── client.ts
│   └── queues/         # Queue definitions
│       ├── discovery.ts
│       ├── crawl.ts
│       ├── social.ts
│       ├── embeddings.ts
│       ├── scoring.ts
│       └── indexing.ts
│
└── package.json
```

**Changed from packages/cache/ to packages/redis/** to reflect expanded scope (caching + job queues).

### packages/search/ - OpenSearch

```
packages/search/
├── src/
│   ├── client.ts       # OpenSearch client
│   ├── indexes/        # Index definitions
│   ├── queries/        # Query builders (hybrid search, facets)
│   └── sync/           # Sync utilities
│
└── package.json
```

**Why separate from packages/db/?**
- Different data store (search engine vs relational DB)
- Both API and workers need access
- Search logic is complex (hybrid search, ranking, faceting)

### packages/ai/ - AI/ML

```
packages/ai/
├── src/
│   ├── embeddings/     # Vector embeddings generation
│   ├── nlp/            # NLP (entity extraction, style detection)
│   └── models/         # Model interfaces and adapters
│
└── package.json
```

### packages/taxonomy/ - Brand Classification

```
packages/taxonomy/
├── src/
│   ├── categories/     # Category definitions (clothing, perfume, etc.)
│   ├── styles/         # Style taxonomy (minimalist, techwear, etc.)
│   └── classifiers/    # Classification logic
│
└── package.json
```

### packages/db/ - Drizzle ORM

```
packages/db/
├── src/
│   └── schema/
│       ├── users.ts              # User accounts
│       ├── auth.ts               # Auth sessions
│       ├── brands.ts             # Brand entities
│       ├── categories.ts         # Taxonomy categories
│       ├── brand-categories.ts   # Brand-category relationships
│       ├── social-signals.ts     # Social metrics
│       ├── crawl-results.ts      # Raw crawled data
│       ├── embeddings.ts         # Vector embeddings (pgvector)
│       ├── trends.ts             # Trend snapshots
│       ├── similar-brands.ts     # Brand similarities
│       └── index.ts
│
└── package.json
```

**Existing packages (keep as-is):**
- `packages/auth/` - better-auth wrapper
- `packages/config/` - ESLint + TypeScript configs

---

## Migration from stackit Boilerplate

### Remove
- ❌ `packages/validations/` → consolidated into `packages/shared/schemas/`
- ❌ `packages/types/` → consolidated into `packages/shared/types/`
- ❌ `packages/helpers/` → consolidated into `packages/shared/utils/`
- ❌ `scripts/init.ts` - stackit setup script (no longer needed)

### Rename
- 🔄 `packages/cache/` → `packages/redis/`
- 🔄 `@stackit/*` → `@brand-radar/*` (all package names)

### Keep
- ✅ `packages/auth/` - better-auth (may expand for RBAC)
- ✅ `packages/db/` - Drizzle ORM (expand schema)
- ✅ `packages/config/` - ESLint + TypeScript configs

### Add (new packages)
- ➕ `packages/shared/` - consolidated shared code
- ➕ `packages/search/` - OpenSearch client
- ➕ `packages/ai/` - AI/ML/embeddings
- ➕ `packages/taxonomy/` - brand classification

### Add (new apps)
- ➕ `apps/workers/` - background job workers
- ➕ `apps/scheduler/` - job scheduling

### Restructure
- 🔄 `apps/api/` - flat (routes/, handlers/, repositories/) → domain modules
- 🔄 `apps/web/` - add new views for Brand Radar

---

## Docker & Infrastructure

### docker-compose.yml Services

```yaml
services:
  postgres:      # PostgreSQL + pgvector extension
  redis:         # Redis (cache + BullMQ queues)
  opensearch:    # OpenSearch (full-text + semantic search)
  api:           # Fastify API
  web:           # Vue 3 SPA
  workers:       # Background workers
  scheduler:     # Job scheduler
  nginx:         # Reverse proxy (optional)
```

### Dockerfile Targets

Multi-stage build with targets for:
- `api-dev` / `api-prod`
- `web-dev` / `web-prod`
- `workers-dev` / `workers-prod`
- `scheduler-dev` / `scheduler-prod`

### infrastructure/ (keep as-is)

```
infrastructure/
└── nginx/
    └── nginx.conf
```

Reserved for k8s/terraform in the future.

---

## Package Naming & Imports

### Package Names

All packages use `@brand-radar/*` scope:
- `@brand-radar/shared`
- `@brand-radar/db`
- `@brand-radar/redis`
- `@brand-radar/auth`
- `@brand-radar/search`
- `@brand-radar/ai`
- `@brand-radar/taxonomy`
- `@brand-radar/config`

### Import Path Changes

```ts
// Before (stackit)
import { CreateUserSchema } from '@stackit/validations'
import { User } from '@stackit/types'
import { formatDate } from '@stackit/helpers'
import { cache } from '@stackit/cache'

// After (Brand Radar)
import { CreateUserSchema } from '@brand-radar/shared/schemas'
import { User } from '@brand-radar/shared/types'
import { formatDate } from '@brand-radar/shared/utils'
import { redis } from '@brand-radar/redis'
```

---

## Implementation Approach

**Chosen: Big Bang Restructure** (approved)

**Why?**
- Current code is stackit boilerplate (no production risk)
- Clean slate allows proper structure from day one
- No migration complexity or adapter layers needed
- Faster than incremental approach

**Phases:**
1. **Phase 1:** Directory structure + package scaffolding (this design)
2. **Phase 2:** Implement package internals (user to provide details)
3. **Phase 3:** Implement app modules/views

---

## Success Criteria

- ✅ Directory structure matches design
- ✅ All packages renamed from `@stackit/*` to `@brand-radar/*`
- ✅ Old packages (validations, types, helpers, cache) removed/consolidated
- ✅ New packages (shared, search, ai, taxonomy) created
- ✅ New apps (workers, scheduler) created
- ✅ API restructured to domain modules
- ✅ No code files added (structure only)
- ✅ Existing needed files preserved (auth, db, config, web components)

---

## Next Steps

1. Create directory structure (keep existing files, remove useless)
2. User provides package implementation details
3. Write implementation plan (writing-plans skill)
4. Execute implementation

---

## Decisions & Trade-offs

### Decision 1: Domain modules vs flat structure for API
**Chosen:** Domain modules  
**Why:** 9+ domains would create 36+ files in root with flat structure. Domain modules scale better and follow clean architecture.

### Decision 2: Consolidate validations/types/helpers vs keep separate
**Chosen:** Consolidate into packages/shared/  
**Why:** Reduces package count, clearer organization, single import path.

### Decision 3: packages/search/ vs include in packages/db/
**Chosen:** Separate packages/search/  
**Why:** Different data stores (search engine vs relational DB), both API and workers need access, search logic is complex enough to warrant separation.

### Decision 4: Incremental migration vs big bang
**Chosen:** Big bang restructure  
**Why:** Current code is boilerplate (no production risk), clean slate is faster and simpler.

---

## Open Questions

**Q: Should better-auth be expanded for RBAC?**  
A: Deferred to Phase 2 (implementation details)

**Q: Should OpenSearch be in docker-compose for local dev?**  
A: Yes - added to services list

**Q: How to handle Drizzle migrations during restructure?**  
A: Deferred to Phase 2 - migrations will be generated as schema expands

---

## References

- stackit boilerplate: https://github.com/im-codebreaker/stackit
- Fastify best practices: https://fastify.dev/docs/latest/Guides/Style-Guide/
- Clean Architecture: https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html
- Monorepo structure: https://turbo.build/repo/docs/handbook
