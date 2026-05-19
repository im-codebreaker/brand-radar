# Brand Radar

> AI-powered brand intelligence platform — monitor, analyze, and discover brands across the web.

A comprehensive brand monitoring and analysis system built with Vue 3, Fastify, and a modern AI/ML stack. Track brand mentions, analyze sentiment, discover emerging brands, and gain competitive intelligence through automated web crawling and natural language processing.

## Features

- 🔍 **Brand Discovery** — Automated web crawling and social media monitoring
- 🤖 **AI Classification** — ML-powered brand categorization and taxonomy
- 📊 **Sentiment Analysis** — NLP-based sentiment tracking across sources
- 🔎 **Semantic Search** — Vector embeddings for intelligent brand discovery
- 📈 **Trend Analysis** — Track brand mentions and sentiment over time
- ⚡ **Real-time Alerts** — Configurable notifications for brand mentions
- 🌐 **Multi-source** — Web, social media, news, and custom sources

## Stack

| Layer        | Technology                                                           |
| ------------ | -------------------------------------------------------------------- |
| Frontend     | Vue 3.5, Vite 7, Pinia, Vue Router, Tailwind v4, ECharts, Cytoscape |
| API          | Fastify 5, autoload, Zod validation, DDD architecture               |
| Workers      | BullMQ, Playwright, Cheerio, Proxy rotation, User-agent spoofing    |
| AI/ML        | Transformers.js, embeddings, NLP, classification                     |
| Search       | OpenSearch (full-text + semantic), pgvector (embeddings)            |
| Database     | PostgreSQL + pgvector, Drizzle ORM                                   |
| Cache/Queue  | Redis + BullMQ job queues                                            |
| Auth         | better-auth with credential provider                                 |
| Tooling      | TypeScript, ESLint (antfu), Vitest, Docker, Traefik                 |

## Quickstart

**Local dev (recommended)** — apps run on host, infra in Docker:

```bash
git clone git@github.com:im-codebreaker/brand-radar.git
cd brand-radar
pnpm install
cp .env.example .env                    # configure DATABASE_URL, REDIS_HOST, etc.
docker compose up -d postgres redis opensearch
pnpm db:push                            # create tables
pnpm db:seed                            # seed dev users (password: password123)
pnpm dev                                # api :3000, web :5173, workers, scheduler
```

**Full stack in Docker** — everything containerized with hot-reload:

```bash
cp .env.example .env
docker compose up --build --watch       # traefik, postgres, redis, opensearch, api, web, workers, scheduler
```

Open <http://localhost>. Traefik routes:
- `/` → Vue web app
- `/api` → Fastify API
- `/docs` → Swagger UI

Traefik dashboard: <http://localhost:8080>

**Development accounts:**
- `admin@brand-radar.dev` / `password123`
- `analyst@brand-radar.dev` / `password123`
- `viewer@brand-radar.dev` / `password123`
- `demo@brand-radar.dev` / `password123`

## Architecture

```
brand-radar/
├── apps/
│   ├── api/                    # Fastify API with DDD modules
│   │   ├── modules/            # Domain modules (users, brands, mentions, etc.)
│   │   │   └── users/          # Example: routes → handlers → service → repository
│   │   ├── plugins/            # Fastify plugins (db, redis, auth, error-handler)
│   │   └── routes/             # Standalone routes (health, auth catch-all)
│   ├── web/                    # Vue 3 SPA
│   │   ├── views/              # Page components
│   │   ├── components/         # Reusable UI components
│   │   ├── stores/             # Pinia stores
│   │   └── composables/        # Vue composables
│   ├── workers/                # Background job processors
│   │   ├── crawl/              # Web scraping workers (Playwright + Cheerio)
│   │   ├── social/             # Social media monitoring
│   │   └── ai/                 # ML/NLP processing
│   └── scheduler/              # Cron-based job scheduler (BullMQ)
├── packages/
│   ├── shared/                 # Types, schemas (Zod), DTOs, utils
│   ├── db/                     # Drizzle ORM + PostgreSQL schema
│   ├── redis/                  # Redis client + BullMQ queue definitions
│   ├── search/                 # OpenSearch client + index management
│   ├── ai/                     # Transformers.js, embeddings, NLP utilities
│   ├── taxonomy/               # Brand classification + category hierarchy
│   ├── auth/                   # better-auth wrapper
│   └── config/                 # Shared tsconfig + eslint-config
└── docker-compose.yml          # Full infrastructure stack
```

## Services

| Service      | Purpose                                    | Port |
| ------------ | ------------------------------------------ | ---- |
| PostgreSQL   | Primary database with pgvector             | 5432 |
| Redis        | Cache + BullMQ job queues                  | 6379 |
| OpenSearch   | Full-text + semantic search                | 9200 |
| API          | Fastify backend                            | 3000 |
| Web          | Vue 3 frontend                             | 5173 |
| Workers      | Background jobs (crawling, AI processing)  | —    |
| Scheduler    | Cron job orchestration                     | —    |
| Traefik      | Reverse proxy + load balancer              | 80   |

## Domain-Driven Design (DDD)

API follows clean architecture with domain modules:

```
modules/users/
├── users.routes.ts        # Fastify plugin, route definitions
├── users.handlers.ts      # HTTP layer (request/response)
├── users.service.ts       # Business logic + domain errors
└── users.repository.ts    # Data access (Drizzle queries)
```

**Dependency flow:** routes → handlers → service → repository

**Adding a new domain:**

1. Create `modules/<domain>/<domain>.{routes,handlers,service,repository}.ts`
2. Define Zod schemas in `packages/shared/src/schemas/<domain>/`
3. Add repository to `plugins/core/repositories.ts`
4. Register types in `types/fastify.d.ts`

## Background Jobs

**Workers** process jobs from Redis queues:

```typescript
// packages/redis/src/queues/crawl.ts
export const crawlQueue = createQueue('crawl')

// apps/workers/src/crawl/scraper.ts
crawlQueue.process(async (job) => {
  const html = await scrapeUrl(job.data.url)
  const brands = await extractBrands(html)
  await indexBrands(brands)
})
```

**Scheduler** enqueues jobs on cron schedules:

```typescript
// apps/scheduler/src/schedules/daily-crawl.ts
cron.schedule('0 2 * * *', async () => {
  await crawlQueue.add('daily-crawl', { sources: ['web', 'social'] })
})
```

## AI/ML Pipeline

1. **Crawl** — Workers scrape web/social with Playwright + Cheerio
2. **Extract** — Parse brand mentions, products, sentiment
3. **Classify** — Transformers.js models categorize brands (taxonomy)
4. **Embed** — Generate vector embeddings for semantic search
5. **Index** — Store in OpenSearch + PostgreSQL (pgvector)
6. **Analyze** — Sentiment analysis, trend detection, alerts

## Scripts

| Command             | What it does                                          |
| ------------------- | ----------------------------------------------------- |
| `pnpm dev`          | Run all apps in parallel (api, web, workers, scheduler) |
| `pnpm build`        | Build every workspace                                 |
| `pnpm lint`         | ESLint across the repo                                |
| `pnpm test`         | Vitest across api + web                               |
| `pnpm type-check`   | tsc / vue-tsc across all packages                     |
| `pnpm db:generate`  | Generate Drizzle migration from schema changes        |
| `pnpm db:migrate`   | Apply pending migrations                              |
| `pnpm db:push`      | Push schema to DB (dev only, no migration)            |
| `pnpm db:seed`      | Seed database with dev users + accounts               |
| `pnpm db:studio`    | Open Drizzle Studio (database GUI)                    |

## Key Technologies

### Validation (Zod)

Single source of truth for schemas:

```typescript
// packages/shared/src/schemas/brands/requests.ts
export const CreateBrandSchema = z.object({
  name: z.string().min(1),
  website: z.string().url(),
  category: z.string(),
})

// API: typed request/response
fastify.post('/', { schema: brands.routes.createBrandRoute }, handlers.create)

// Web: form validation
const { form, errors } = useZodForm(CreateBrandSchema, { /* defaults */ })
```

### Search (OpenSearch + pgvector)

Hybrid search combining full-text and semantic:

```typescript
// Full-text search
const results = await search.brands.search({ query: 'sustainable fashion' })

// Semantic search (vector similarity)
const embedding = await ai.embed('eco-friendly clothing')
const similar = await db.query.brands.findMany({
  where: cosineDistance(brands.embedding, embedding) < 0.3,
})
```

### Web Scraping

Playwright for JavaScript-heavy sites, Cheerio for static HTML:

```typescript
// apps/workers/src/crawl/scraper.ts
const browser = await playwright.chromium.launch()
const page = await browser.newPage()
await page.goto(url, { userAgent: randomUserAgent() })
const html = await page.content()
const $ = cheerio.load(html)
const brands = $('.brand-mention').map((i, el) => $(el).text()).get()
```

### AI/ML (Transformers.js)

On-device inference with ONNX Runtime:

```typescript
// packages/ai/src/embeddings/generate.ts
import { pipeline } from '@xenova/transformers'

const embedder = await pipeline('feature-extraction', 'sentence-transformers/all-MiniLM-L6-v2')
const embedding = await embedder(text, { pooling: 'mean', normalize: true })
```

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/brand-radar

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# OpenSearch
OPENSEARCH_NODE=http://localhost:9200

# API
API_HOST=0.0.0.0
API_PORT=3000
BASE_URL=http://localhost
FRONTEND_URL=http://localhost

# better-auth
BETTER_AUTH_SECRET=your-secret-key-here
BETTER_AUTH_URL=http://localhost
```

## Project Goals

- **Fast MVP** — Ship a working brand monitoring MVP quickly
- **Scalable** — Handle thousands of brands and millions of mentions
- **Modular** — Easy to add new sources, classifiers, or features
- **Type-safe** — End-to-end TypeScript with Zod validation
- **AI-ready** — Built for ML/NLP from day one (embeddings, classification)
- **Production-grade** — Docker, migrations, seeding, error handling, tests

## License

MIT — see [LICENSE](./LICENSE).
