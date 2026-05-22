# Brand Radar — Style Guide

## Reference Files

Canonical examples of project patterns. Read the relevant one before implementing.

### Backend (api)

| Pattern | Reference File |
|---------|----------------|
| App wiring & autoload | `apps/api/src/app.ts` |
| Server startup | `apps/api/src/server.ts` |
| Env loader (Zod-validated) | `apps/api/src/config/env.ts` |
| App plugin (db) | `apps/api/src/plugins/app/db.ts` |
| App plugin (search) | `apps/api/src/plugins/app/search.ts` |
| App plugin (redis) | `apps/api/src/plugins/app/redis.ts` |
| App plugin (repositories) | `apps/api/src/plugins/app/repositories.ts` |
| App plugin (auth) | `apps/api/src/plugins/app/auth.ts` |
| Error handler | `apps/api/src/plugins/app/error-handler.ts` |
| External plugin (swagger) | `apps/api/src/plugins/external/swagger.ts` |
| Repository (Drizzle queries) | `apps/api/src/repositories/brands.ts` |
| Handler factory | `apps/api/src/handlers/brands.ts` |
| Route (Zod-typed) | `apps/api/src/routes/brands.ts` |
| Auth gate | `apps/api/src/routes/autohooks.ts` |
| Decorator augmentation | `apps/api/src/types/fastify.d.ts` |
| better-auth wrapper | `apps/api/src/lib/auth.ts` |

### Workers

| Pattern | Reference File |
|---------|----------------|
| Worker factory (BullMQ) | `apps/workers/src/workers/scoring.worker.ts` |
| Queue configuration | `apps/workers/src/queues/config.ts` |
| Job schema (Zod) | `packages/shared/src/jobs/scoring-job.ts` |
| Metrics emission | `apps/workers/src/metrics.ts` |
| Worker registration | `apps/workers/src/index.ts` |

### Adapters (Scraping)

| Pattern | Reference File |
|---------|----------------|
| Adapter interface | `packages/adapters/src/types.ts` |
| Instagram adapter | `packages/adapters/instagram/instagram-adapter.ts` |
| Playwright config | `packages/adapters/src/browser/config.ts` |
| Health probe | `packages/adapters/src/health.ts` |
| Adapter registry | `packages/adapters/src/registry.ts` |

### Frontend (web)

| Pattern | Reference File |
|---------|----------------|
| App shell | `apps/web/src/App.vue` |
| Discovery feed page | `apps/web/src/views/DiscoveryView.vue` |
| Search page | `apps/web/src/views/SearchView.vue` |
| Brand detail page | `apps/web/src/views/BrandDetailView.vue` |
| Router | `apps/web/src/router/index.ts` |
| Pinia store | `apps/web/src/stores/auth.ts` |
| Composable | `apps/web/src/composables/useSearch.ts` |
| API client | `apps/web/src/lib/api.ts` |
| Auth client | `apps/web/src/lib/auth-client.ts` |

### Shared

| Pattern | Reference File |
|---------|----------------|
| Job schemas | `packages/shared/src/jobs/` |
| Brand types | `packages/shared/src/types/brand.ts` |
| Utilities | `packages/shared/src/utils/` |
| Drizzle client factory | `packages/db/src/client.ts` |
| Drizzle schema (brands) | `packages/db/src/schema/brands.ts` |
| Drizzle schema (social) | `packages/db/src/schema/social-profiles.ts` |
| Drizzle migrations | `packages/db/drizzle/` |
| Meilisearch client | `packages/search/src/client.ts` |
| Redis client | `packages/redis/src/client.ts` |

## General Principles

- **Clarity over cleverness** — readable, maintainable, reusable code.
- **Consistency** — match established patterns; the reference files above are canonical.
- **Simplicity** — no speculative abstractions; three repeated lines is fine, premature DRY is not.
- **Documentation** — code should be self-documenting; only comment the *why* (constraints, invariants, gotchas).
- **Testability** — write tests for non-trivial logic.
- **Zod for validation** — validate at system boundaries (user input, external APIs, job data).

## TypeScript & JavaScript

- **Files**: `kebab-case.ts` for TS, `PascalCase.vue` for components.
- **Variables / functions**: `camelCase`.
- **Constants**: `UPPER_SNAKE_CASE`.
- **Types / interfaces / classes**: `PascalCase`.
- **Booleans**: `is*` / `has*` / `should*` prefix.

```ts
// 1. Imports — perfectionist/sort-imports handles order
import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { env } from '../../config/env.js'

// 2. Type definitions
interface ServiceOptions { /* … */ }

// 3. Constants
const PLUGIN_NAME = 'my-plugin'

// 4. Main function
async function plugin(fastify: FastifyInstance) { /* … */ }

// 5. Export
export default fp(plugin, { name: PLUGIN_NAME })
```

**Variables**
- Searchable names over magic numbers (use `UPPER_SNAKE_CASE` constants).
- Avoid single-letter variables except in tight callbacks (`arr.map(x => …)`), math (`(a, b) => a + b`), or indices (`i`, `j`).
- Default parameters over short-circuiting (`function f(x = 'default')` not `function f(x) { x = x || 'default' }`).

**Functions**
- **Function declarations** for top-level, exported, hoisted utilities.
- **Arrow functions** for callbacks, array methods, lexical `this` binding.
- Single responsibility; one job per function.
- 1–2 parameters ideal; 3+ → options object.
- No flag parameters — split into separately named functions.

**Errors**
- Use typed error classes from `@brand-radar/shared`.
- Throw domain errors from services: `NotFoundError`, `ConflictError`, `ValidationError`.
- Let the error handler plugin map domain errors to HTTP status codes.

```ts
// ❌ Don't throw raw Error
if (!brand) throw new Error('Brand not found')

// ✅ Do throw typed domain error
if (!brand) throw new NotFoundError('Brand not found')
```

## Fastify Patterns

### Route Modules

Routes live in `apps/api/src/routes/` (flat structure) or `apps/api/src/modules/<domain>/<domain>.routes.ts` (DDD structure).

```ts
// apps/api/src/modules/brands/brands.routes.ts
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { createBrandsHandlers } from './brands.handlers.js'
import { createBrandsService } from './brands.service.js'

const plugin: FastifyPluginAsyncZod = async (fastify) => {
  const service = createBrandsService(fastify.brandsRepository)
  const handlers = createBrandsHandlers(service)
  
  fastify.get('/', { 
    schema: {
      querystring: z.object({ category: z.string().optional() }),
      response: { 200: z.array(BrandSchema) }
    }
  }, handlers.list)
  
  fastify.get('/:id', {
    schema: {
      params: z.object({ id: z.string().uuid() }),
      response: { 200: BrandSchema }
    }
  }, handlers.getById)
}

export default plugin
export const autoPrefix = '/brands'
```

### Repository Pattern

Repositories live in `apps/api/src/repositories/` or `apps/api/src/modules/<domain>/<domain>.repository.ts`.

```ts
// apps/api/src/repositories/brands.ts
import type { DatabaseClient, DbClient } from '@brand-radar/db'
import { brands } from '@brand-radar/db/schema'
import { eq } from 'drizzle-orm'

export function createBrandsRepository(db: DatabaseClient) {
  return {
    async findById(id: string, tx?: DbClient) {
      return (tx ?? db).query.brands.findFirst({
        where: eq(brands.id, id)
      })
    },
    
    async create(data: InsertBrand, tx?: DbClient) {
      const [brand] = await (tx ?? db)
        .insert(brands)
        .values(data)
        .returning()
      return brand
    },
    
    // Optional tx parameter allows transaction support
    async updateScore(id: string, score: number, tx?: DbClient) {
      await (tx ?? db)
        .update(brands)
        .set({ score, lastScoredAt: new Date() })
        .where(eq(brands.id, id))
    }
  }
}
```

**Key points:**
- Factory pattern: `createXRepository(db)` returns methods
- Optional `tx` parameter for transaction support
- Methods return plain objects, not Drizzle result types
- Type narrowing: `(tx ?? db)` allows passing transaction or client

## Worker Patterns (BullMQ)

### Worker Factory

Workers live in `apps/workers/src/workers/<name>.worker.ts`.

```ts
// apps/workers/src/workers/scoring.worker.ts
import { Worker, Job } from 'bullmq'
import { z } from 'zod'
import { db } from '@brand-radar/db'
import { redis } from '@brand-radar/redis'

const ScoringJobSchema = z.object({
  brandId: z.string().uuid()
})

type ScoringJob = z.infer<typeof ScoringJobSchema>

export function createScoringWorker() {
  return new Worker<ScoringJob>(
    'scoring',
    async (job: Job<ScoringJob>) => {
      // 1. Validate job data
      const { brandId } = ScoringJobSchema.parse(job.data)
      
      // 2. Perform work
      const brand = await db.query.brands.findFirst({ 
        where: eq(brands.id, brandId),
        with: { socialProfiles: true }
      })
      
      const score = computeScore(brand)
      await db.update(brands).set({ score }).where(eq(brands.id, brandId))
      
      // 3. Emit metrics
      metrics.jobDuration.observe(
        { worker: 'scoring', status: 'success' },
        (Date.now() - job.timestamp) / 1000
      )
      
      // 4. Enqueue downstream job
      await job.queue.add('indexing', { brandId }, { priority: 5 })
      
      return { brandId, score }
    },
    {
      connection: redis,
      concurrency: 10,
      limiter: { max: 500, duration: 60000 }
    }
  )
}
```

**Key points:**
- Validate job data with Zod at the start
- Emit Prometheus metrics for observability
- Enqueue downstream jobs after successful completion
- Return structured result for logging

## Adapter Patterns (Scraping)

### Adapter Implementation

Adapters live in `packages/adapters/<source>/<source>-adapter.ts`.

```ts
// packages/adapters/instagram/instagram-adapter.ts
import type { ScraperAdapter, AdapterHealth } from '../types.js'
import { createBrowserContext } from '../browser/config.js'

export const instagramAdapter: ScraperAdapter = {
  id: 'instagram-v1',
  sourceType: 'instagram',
  rateLimit: { requestsPerMinute: 5, cooldownMs: 12000 },
  
  async extract(profileUrl: string) {
    const { browser, context } = await createBrowserContext()
    
    try {
      const page = await context.newPage()
      await page.goto(profileUrl, { waitUntil: 'networkidle' })
      
      // Extract from meta tags (more stable than DOM scraping)
      const ogDescription = await page
        .locator('meta[property="og:description"]')
        .getAttribute('content')
      
      const followers = ogDescription?.match(/(\d+) Followers/)?.[1]
      const name = await page.locator('h2').first().textContent()
      
      return {
        name: name?.trim(),
        source: 'instagram',
        sourceUrl: profileUrl,
        metadata: { followers: parseInt(followers || '0') }
      }
    } finally {
      await browser.close()
    }
  },
  
  async probe() {
    try {
      await this.extract('https://www.instagram.com/byredo/')
      return { adapterId: this.id, status: 'healthy', lastProbeAt: new Date() }
    } catch (error) {
      return { 
        adapterId: this.id, 
        status: 'down', 
        lastProbeAt: new Date(),
        errorMessage: error.message
      }
    }
  }
}
```

**Key points:**
- Implement `ScraperAdapter` interface
- Use Playwright with `createBrowserContext()` helper
- Extract from meta tags (more stable than DOM)
- Implement `probe()` health check with known-good URL
- Always close browser in `finally` block

## Vue Patterns

### Composition API

Use `<script setup lang="ts">` only.

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useBrandsStore } from '@/stores/brands'

const router = useRouter()
const brandsStore = useBrandsStore()

const searchQuery = ref('')
const filteredBrands = computed(() => 
  brandsStore.brands.filter(b => 
    b.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
)

async function selectBrand(id: string) {
  await router.push(`/brands/${id}`)
}
</script>

<template>
  <div class="space-y-4">
    <input v-model="searchQuery" type="text" placeholder="Search brands..." />
    <BrandCard
      v-for="brand in filteredBrands"
      :key="brand.id"
      :brand="brand"
      @click="selectBrand(brand.id)"
    />
  </div>
</template>
```

### Pinia Stores

Stores live in `apps/web/src/stores/<feature>.ts`.

```ts
// apps/web/src/stores/brands.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/lib/api'

export const useBrandsStore = defineStore('brands', () => {
  const brands = ref<Brand[]>([])
  const loading = ref(false)
  
  const brandsByCategory = computed(() => {
    return brands.value.reduce((acc, brand) => {
      const category = brand.category || 'uncategorized'
      acc[category] = acc[category] || []
      acc[category].push(brand)
      return acc
    }, {} as Record<string, Brand[]>)
  })
  
  async function fetchBrands() {
    loading.value = true
    try {
      const response = await api.get('/brands')
      brands.value = response.data
    } finally {
      loading.value = false
    }
  }
  
  return {
    brands,
    loading,
    brandsByCategory,
    fetchBrands
  }
})
```

## Drizzle Patterns

### Schema Definition

Schema files live in `packages/db/src/schema/<domain>.ts`.

```ts
// packages/db/src/schema/brands.ts
import { pgTable, uuid, text, timestamp, numeric, jsonb } from 'drizzle-orm/pg-core'

export const brands = pgTable('brands', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  websiteUrl: text('website_url'),
  logoUrl: text('logo_url'),
  foundedYear: numeric('founded_year'),
  category: text('category'),
  
  // Scoring
  score: numeric('score', { precision: 5, scale: 2 }).default('0'),
  scoreVersion: numeric('score_version').default('1'),
  lastScoredAt: timestamp('last_scored_at'),
  
  // Metadata
  metadata: jsonb('metadata').default({}),
  
  // Timestamps
  discoveredAt: timestamp('discovered_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
})
```

**Key points:**
- One table per file
- `snake_case` column names (Drizzle maps from camelCase)
- Use `defaultRandom()` for UUIDs
- Use `defaultNow()` for timestamps
- Use `jsonb` for flexible metadata

## Anti-Patterns

### ❌ Don't

**Don't use `any`**
```ts
// ❌ Bad
function process(data: any) { ... }

// ✅ Good
function process(data: unknown) {
  if (typeof data === 'object' && data !== null) { ... }
}
```

**Don't skip validation**
```ts
// ❌ Bad — trust job data
async function worker(job: Job) {
  const { brandId } = job.data
}

// ✅ Good — validate with Zod
const schema = z.object({ brandId: z.string().uuid() })
async function worker(job: Job) {
  const { brandId } = schema.parse(job.data)
}
```

**Don't hardcode URLs or credentials**
```ts
// ❌ Bad
const apiUrl = 'https://api.example.com'

// ✅ Good
const apiUrl = env.API_URL
```

**Don't mix concerns**
```ts
// ❌ Bad — handler does business logic
async function handler(request, reply) {
  const existing = await db.query.brands.findFirst(...)
  if (existing) throw new Error('Brand exists')
  const brand = await db.insert(brands).values(...)
  return { brand }
}

// ✅ Good — handler delegates to service
async function handler(request, reply) {
  const brand = await brandsService.create(request.body)
  return reply.code(201).send({ brand })
}
```

### ✅ Do

**Do validate at boundaries**
- HTTP requests (Fastify schema)
- Worker jobs (Zod schema in worker)
- External API responses (Zod schema)
- User input (Zod schema in forms)

**Do emit metrics**
- Worker success/failure rates
- Job durations
- Queue depths
- API response times

**Do write integration tests**
- Test routes end-to-end (request → DB → response)
- Test workers end-to-end (enqueue → process → result)
- Test adapters with health probes

**Do follow DRY**
- Extract repeated logic to functions
- Share types in `@brand-radar/shared`
- Reuse Zod schemas across API and web

## Common Mistakes

1. **Forgetting to close Playwright browser** → memory leaks
2. **Not validating job data** → worker crashes on malformed input
3. **Skipping health probes** → silent adapter failures
4. **Hardcoding rate limits** → getting blocked by platforms
5. **Not using transactions** → partial updates on errors
6. **Mixing service logic in handlers** → hard to test
7. **Not emitting metrics** → blind to production issues

## Quick Reference

| What | Where | Pattern |
|------|-------|---------|
| API route | `apps/api/src/modules/<domain>/<domain>.routes.ts` | Fastify plugin, autoPrefix |
| Repository | `apps/api/src/repositories/<domain>.ts` | Factory, optional `tx` |
| Worker | `apps/workers/src/workers/<name>.worker.ts` | BullMQ Worker, Zod validation |
| Adapter | `packages/adapters/<source>/<source>-adapter.ts` | ScraperAdapter interface |
| Vue view | `apps/web/src/views/<Name>View.vue` | `<script setup>` |
| Pinia store | `apps/web/src/stores/<feature>.ts` | Composition API |
| DB schema | `packages/db/src/schema/<domain>.ts` | `pgTable`, snake_case |
| Job schema | `packages/shared/src/jobs/<name>-job.ts` | Zod schema |
