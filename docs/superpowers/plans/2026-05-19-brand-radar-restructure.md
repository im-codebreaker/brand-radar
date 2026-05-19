# Brand Radar Monorepo Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure Brand Radar monorepo from stackit boilerplate to production-ready architecture with new packages (shared, search, ai, taxonomy) and apps (workers, scheduler).

**Architecture:** Domain-driven monorepo with 8 packages and 4 apps. Consolidate validations/types/helpers into shared package, rename cache to redis, add new packages for search/ai/taxonomy, add workers and scheduler apps.

**Tech Stack:** pnpm workspaces, Turborepo, TypeScript, Fastify, Vue 3, Drizzle, Redis, OpenSearch

---

## File Structure Overview

**New Packages (create package.json):**
- `packages/shared/` - consolidated from validations/types/helpers
- `packages/redis/` - renamed from cache, expanded for BullMQ
- `packages/search/` - OpenSearch client (new)
- `packages/ai/` - AI/ML/NLP (new)
- `packages/taxonomy/` - brand classification (new)

**Existing Packages (keep, update imports):**
- `packages/auth/` - better-auth wrapper
- `packages/db/` - Drizzle ORM
- `packages/config/` - ESLint + TypeScript configs

**New Apps (create package.json):**
- `apps/workers/` - background job workers
- `apps/scheduler/` - job scheduling

**Existing Apps (update imports):**
- `apps/api/` - Fastify API
- `apps/web/` - Vue 3 frontend

**Configuration Files (update):**
- `pnpm-workspace.yaml` - update package paths
- `turbo.json` - update pipeline
- Root `package.json` - update workspace scripts
- `docker-compose.yml` - add opensearch, workers, scheduler
- `Dockerfile` - add workers and scheduler targets

---

## Task 1: Create packages/shared/package.json

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@brand-radar/shared",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    "./constants": "./src/constants/index.ts",
    "./dto": "./src/dto/index.ts",
    "./enums": "./src/enums/index.ts",
    "./errors": "./src/errors/index.ts",
    "./guards": "./src/guards/index.ts",
    "./schemas": "./src/schemas/index.ts",
    "./types": "./src/types/index.ts",
    "./utils": "./src/utils/index.ts"
  },
  "scripts": {
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "zod": "^4.1.0"
  },
  "devDependencies": {
    "@brand-radar/config": "workspace:*",
    "typescript": "^5.7.3"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "@brand-radar/config/tsconfig/base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create index files for each subdirectory**

Create `packages/shared/src/constants/index.ts`:
```typescript
export * from './index'
```

Create `packages/shared/src/dto/index.ts`:
```typescript
export * from './index'
```

Create `packages/shared/src/enums/index.ts`:
```typescript
export * from './index'
```

Create `packages/shared/src/errors/index.ts`:
```typescript
export * from './index'
```

Create `packages/shared/src/guards/index.ts`:
```typescript
export * from './index'
```

Create `packages/shared/src/types/index.ts`:
```typescript
// Re-export all types from moved packages/types
export * from './ApiResponse'
export * from './User'
```

Create `packages/shared/src/utils/index.ts`:
```typescript
// Re-export all utilities from moved packages/helpers
export * from './object'
export * from './result'
export * from './string'
```

Create `packages/shared/src/schemas/index.ts`:
```typescript
// Re-export all schemas from moved packages/validations
export * as users from './users'
export * as env from './env'
```

- [ ] **Step 4: Verify structure**

Run: `ls -R packages/shared/src/`
Expected: All subdirectories exist with index.ts files

- [ ] **Step 5: Commit**

```bash
git add packages/shared/
git commit -m "feat(shared): create consolidated shared package

- Consolidates validations, types, helpers into single package
- Exports organized by concern (schemas, types, utils, etc.)
- Provides subpath exports for clean imports"
```

---

## Task 2: Update packages/redis (rename from cache)

**Files:**
- Modify: `packages/redis/package.json`
- Create: `packages/redis/src/queues/index.ts`

- [ ] **Step 1: Update package.json name and add BullMQ**

Edit `packages/redis/package.json`:
```json
{
  "name": "@brand-radar/redis",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./queues": "./src/queues/index.ts"
  },
  "scripts": {
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "bullmq": "^5.34.1",
    "ioredis": "^5.4.2"
  },
  "devDependencies": {
    "@brand-radar/config": "workspace:*",
    "typescript": "^5.7.3"
  }
}
```

- [ ] **Step 2: Create queues index file**

Create `packages/redis/src/queues/index.ts`:
```typescript
// Queue definitions will be implemented later
// Placeholder for: discovery, crawl, social, embeddings, scoring, indexing queues
export const QUEUE_NAMES = {
  DISCOVERY: 'discovery',
  CRAWL: 'crawl',
  SOCIAL: 'social',
  EMBEDDINGS: 'embeddings',
  SCORING: 'scoring',
  INDEXING: 'indexing',
} as const

export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES]
```

- [ ] **Step 3: Verify build**

Run: `cd packages/redis && pnpm type-check`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add packages/redis/
git commit -m "refactor(redis): rename from cache and add BullMQ support

- Rename package from @brand-radar/cache to @brand-radar/redis
- Add BullMQ dependency for job queues
- Add queues subpath export
- Define queue name constants"
```

---

## Task 3: Create packages/search/package.json

**Files:**
- Create: `packages/search/package.json`
- Create: `packages/search/tsconfig.json`
- Create: `packages/search/src/index.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@brand-radar/search",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./client": "./src/client.ts",
    "./indexes": "./src/indexes/index.ts",
    "./queries": "./src/queries/index.ts",
    "./sync": "./src/sync/index.ts"
  },
  "scripts": {
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@opensearch-project/opensearch": "^2.15.0"
  },
  "devDependencies": {
    "@brand-radar/config": "workspace:*",
    "typescript": "^5.7.3"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "@brand-radar/config/tsconfig/base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create placeholder index files**

Create `packages/search/src/index.ts`:
```typescript
export * from './client'
export * from './indexes'
export * from './queries'
export * from './sync'
```

Create `packages/search/src/client.ts`:
```typescript
// OpenSearch client implementation - placeholder
export const createSearchClient = () => {
  // To be implemented
  return null
}
```

Create `packages/search/src/indexes/index.ts`:
```typescript
// Index definitions - placeholder
export {}
```

Create `packages/search/src/queries/index.ts`:
```typescript
// Query builders - placeholder
export {}
```

Create `packages/search/src/sync/index.ts`:
```typescript
// Sync utilities - placeholder
export {}
```

- [ ] **Step 4: Verify structure**

Run: `ls -R packages/search/src/`
Expected: All subdirectories exist with index.ts files

- [ ] **Step 5: Commit**

```bash
git add packages/search/
git commit -m "feat(search): create OpenSearch package

- Add @opensearch-project/opensearch dependency
- Structure for client, indexes, queries, sync
- Subpath exports for clean imports"
```

---

## Task 4: Create packages/ai/package.json

**Files:**
- Create: `packages/ai/package.json`
- Create: `packages/ai/tsconfig.json`
- Create: `packages/ai/src/index.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@brand-radar/ai",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./embeddings": "./src/embeddings/index.ts",
    "./nlp": "./src/nlp/index.ts",
    "./models": "./src/models/index.ts"
  },
  "scripts": {
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "openai": "^4.77.3"
  },
  "devDependencies": {
    "@brand-radar/config": "workspace:*",
    "typescript": "^5.7.3"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "@brand-radar/config/tsconfig/base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create placeholder index files**

Create `packages/ai/src/index.ts`:
```typescript
export * from './embeddings'
export * from './nlp'
export * from './models'
```

Create `packages/ai/src/embeddings/index.ts`:
```typescript
// Embeddings generation - placeholder
export {}
```

Create `packages/ai/src/nlp/index.ts`:
```typescript
// NLP processing - placeholder
export {}
```

Create `packages/ai/src/models/index.ts`:
```typescript
// Model interfaces - placeholder
export {}
```

- [ ] **Step 4: Verify structure**

Run: `ls -R packages/ai/src/`
Expected: All subdirectories exist with index.ts files

- [ ] **Step 5: Commit**

```bash
git add packages/ai/
git commit -m "feat(ai): create AI/ML package

- Add OpenAI SDK dependency
- Structure for embeddings, nlp, models
- Subpath exports for clean imports"
```

---

## Task 5: Create packages/taxonomy/package.json

**Files:**
- Create: `packages/taxonomy/package.json`
- Create: `packages/taxonomy/tsconfig.json`
- Create: `packages/taxonomy/src/index.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@brand-radar/taxonomy",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./categories": "./src/categories/index.ts",
    "./styles": "./src/styles/index.ts",
    "./classifiers": "./src/classifiers/index.ts"
  },
  "scripts": {
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@brand-radar/shared": "workspace:*"
  },
  "devDependencies": {
    "@brand-radar/config": "workspace:*",
    "typescript": "^5.7.3"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "@brand-radar/config/tsconfig/base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create placeholder index files**

Create `packages/taxonomy/src/index.ts`:
```typescript
export * from './categories'
export * from './styles'
export * from './classifiers'
```

Create `packages/taxonomy/src/categories/index.ts`:
```typescript
// Category definitions - placeholder
export const CATEGORIES = {
  CLOTHING: 'clothing',
  PERFUME: 'perfume',
} as const

export type Category = typeof CATEGORIES[keyof typeof CATEGORIES]
```

Create `packages/taxonomy/src/styles/index.ts`:
```typescript
// Style taxonomy - placeholder
export {}
```

Create `packages/taxonomy/src/classifiers/index.ts`:
```typescript
// Classification logic - placeholder
export {}
```

- [ ] **Step 4: Verify structure**

Run: `ls -R packages/taxonomy/src/`
Expected: All subdirectories exist with index.ts files

- [ ] **Step 5: Commit**

```bash
git add packages/taxonomy/
git commit -m "feat(taxonomy): create brand classification package

- Structure for categories, styles, classifiers
- Initial category constants (clothing, perfume)
- Subpath exports for clean imports"
```

---

## Task 6: Create apps/workers/package.json

**Files:**
- Create: `apps/workers/package.json`
- Create: `apps/workers/tsconfig.json`
- Create: `apps/workers/src/bootstrap.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@brand-radar/workers",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/bootstrap.ts",
    "start": "tsx src/bootstrap.ts",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@brand-radar/ai": "workspace:*",
    "@brand-radar/db": "workspace:*",
    "@brand-radar/redis": "workspace:*",
    "@brand-radar/search": "workspace:*",
    "@brand-radar/shared": "workspace:*",
    "@brand-radar/taxonomy": "workspace:*",
    "bullmq": "^5.34.1",
    "cheerio": "^1.0.0",
    "playwright": "^1.49.1"
  },
  "devDependencies": {
    "@brand-radar/config": "workspace:*",
    "@types/node": "^22.10.5",
    "tsx": "^4.19.2",
    "typescript": "^5.7.3"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "@brand-radar/config/tsconfig/node.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create bootstrap.ts placeholder**

Create `apps/workers/src/bootstrap.ts`:
```typescript
console.log('Workers starting...')

// Worker registration and startup logic will be implemented later
// This placeholder allows the app to build and run

process.on('SIGTERM', () => {
  console.log('Workers shutting down...')
  process.exit(0)
})
```

- [ ] **Step 4: Create placeholder index files for worker domains**

Create `apps/workers/src/discovery/index.ts`:
```typescript
// Discovery workers - placeholder
export {}
```

Create `apps/workers/src/crawl/index.ts`:
```typescript
// Crawl workers - placeholder
export {}
```

Create `apps/workers/src/social/index.ts`:
```typescript
// Social workers - placeholder
export {}
```

Create `apps/workers/src/embeddings/index.ts`:
```typescript
// Embeddings workers - placeholder
export {}
```

Create `apps/workers/src/scoring/index.ts`:
```typescript
// Scoring workers - placeholder
export {}
```

Create `apps/workers/src/indexing/index.ts`:
```typescript
// Indexing workers - placeholder
export {}
```

Create `apps/workers/src/workers/index.ts`:
```typescript
// Worker base classes - placeholder
export {}
```

Create `apps/workers/src/shared/index.ts`:
```typescript
// Shared worker utilities - placeholder
export {}
```

Create `apps/workers/src/queues/index.ts`:
```typescript
// Queue configuration - placeholder
export {}
```

- [ ] **Step 5: Verify build**

Run: `cd apps/workers && pnpm type-check`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add apps/workers/
git commit -m "feat(workers): create background workers app

- Add worker domain structure (discovery, crawl, social, etc.)
- Add dependencies (BullMQ, Playwright, Cheerio)
- Bootstrap placeholder for worker startup"
```

---

## Task 7: Create apps/scheduler/package.json

**Files:**
- Create: `apps/scheduler/package.json`
- Create: `apps/scheduler/tsconfig.json`
- Create: `apps/scheduler/src/main.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@brand-radar/scheduler",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/main.ts",
    "start": "tsx src/main.ts",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@brand-radar/redis": "workspace:*",
    "@brand-radar/shared": "workspace:*",
    "bullmq": "^5.34.1",
    "cron": "^3.2.0"
  },
  "devDependencies": {
    "@brand-radar/config": "workspace:*",
    "@types/cron": "^2.4.0",
    "@types/node": "^22.10.5",
    "tsx": "^4.19.2",
    "typescript": "^5.7.3"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "@brand-radar/config/tsconfig/node.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create main.ts placeholder**

Create `apps/scheduler/src/main.ts`:
```typescript
console.log('Scheduler starting...')

// Job scheduling logic will be implemented later
// This placeholder allows the app to build and run

process.on('SIGTERM', () => {
  console.log('Scheduler shutting down...')
  process.exit(0)
})
```

- [ ] **Step 4: Create placeholder files for scheduler structure**

Create `apps/scheduler/src/jobs/index.ts`:
```typescript
// Job definitions - placeholder
export {}
```

Create `apps/scheduler/src/schedules/index.ts`:
```typescript
// Cron schedules - placeholder
export {}
```

- [ ] **Step 5: Verify build**

Run: `cd apps/scheduler && pnpm type-check`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add apps/scheduler/
git commit -m "feat(scheduler): create job scheduler app

- Add cron and BullMQ dependencies
- Structure for jobs and schedules
- Main entry point placeholder"
```

---

## Task 8: Update pnpm-workspace.yaml

**Files:**
- Modify: `pnpm-workspace.yaml`

- [ ] **Step 1: Update workspace packages**

Edit `pnpm-workspace.yaml`:
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

- [ ] **Step 2: Verify workspace**

Run: `pnpm list --depth=0`
Expected: All 8 packages and 4 apps listed

- [ ] **Step 3: Commit**

```bash
git add pnpm-workspace.yaml
git commit -m "chore(workspace): update workspace configuration

- Simplified workspace pattern to apps/* and packages/*
- Includes new workers and scheduler apps
- Includes new shared, search, ai, taxonomy packages"
```

---

## Task 9: Update root package.json

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Update workspace name and scripts**

Edit root `package.json`:
```json
{
  "name": "brand-radar",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "turbo run dev --parallel",
    "dev:api": "turbo run dev --filter=@brand-radar/api",
    "dev:web": "turbo run dev --filter=@brand-radar/web",
    "dev:workers": "turbo run dev --filter=@brand-radar/workers",
    "dev:scheduler": "turbo run dev --filter=@brand-radar/scheduler",
    "build": "turbo run build",
    "type-check": "turbo run type-check",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "db:generate": "turbo run db:generate --filter=@brand-radar/db",
    "db:migrate": "turbo run db:migrate --filter=@brand-radar/db",
    "db:push": "turbo run db:push --filter=@brand-radar/db",
    "db:seed": "turbo run db:seed --filter=@brand-radar/db",
    "db:studio": "turbo run db:studio --filter=@brand-radar/db"
  },
  "devDependencies": {
    "@brand-radar/config": "workspace:*",
    "turbo": "^2.3.3"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  },
  "packageManager": "pnpm@9.15.4"
}
```

- [ ] **Step 2: Verify scripts work**

Run: `pnpm run type-check`
Expected: TypeScript checks all packages

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore(root): update root package.json for Brand Radar

- Rename from stackit to brand-radar
- Add dev scripts for workers and scheduler
- Update filter names to @brand-radar/*"
```

---

## Task 10: Update turbo.json

**Files:**
- Modify: `turbo.json`

- [ ] **Step 1: Update turbo pipeline**

Edit `turbo.json`:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", ".nuxt/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "type-check": {
      "dependsOn": ["^type-check"]
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "db:generate": {
      "cache": false
    },
    "db:migrate": {
      "cache": false
    },
    "db:push": {
      "cache": false
    },
    "db:seed": {
      "cache": false
    },
    "db:studio": {
      "cache": false,
      "persistent": true
    }
  }
}
```

- [ ] **Step 2: Verify turbo works**

Run: `pnpm turbo run type-check`
Expected: Turbo executes type-check across all packages

- [ ] **Step 3: Commit**

```bash
git add turbo.json
git commit -m "chore(turbo): update turbo pipeline configuration

- Add tasks for new apps (workers, scheduler)
- Ensure proper task dependencies"
```

---

## Task 11: Update package names in existing packages

**Files:**
- Modify: `packages/auth/package.json`
- Modify: `packages/db/package.json`
- Modify: `packages/config/eslint-config/package.json`
- Modify: `packages/config/tsconfig/package.json`

- [ ] **Step 1: Update packages/auth/package.json**

Edit `packages/auth/package.json` - change name to `@brand-radar/auth` and update dependencies:
```json
{
  "name": "@brand-radar/auth",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./client": "./src/client.ts",
    "./server": "./src/server.ts"
  },
  "scripts": {
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@brand-radar/db": "workspace:*",
    "better-auth": "^1.4.2"
  },
  "devDependencies": {
    "@brand-radar/config": "workspace:*",
    "typescript": "^5.7.3"
  }
}
```

- [ ] **Step 2: Update packages/db/package.json**

Edit `packages/db/package.json` - change name to `@brand-radar/db`:
```json
{
  "name": "@brand-radar/db",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:seed": "tsx scripts/seed.ts",
    "db:studio": "drizzle-kit studio",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "drizzle-orm": "^0.46.4",
    "postgres": "^3.4.6"
  },
  "devDependencies": {
    "@brand-radar/config": "workspace:*",
    "drizzle-kit": "^0.32.2",
    "tsx": "^4.19.2",
    "typescript": "^5.7.3"
  }
}
```

- [ ] **Step 3: Update packages/config/eslint-config/package.json**

Edit `packages/config/eslint-config/package.json`:
```json
{
  "name": "@brand-radar/eslint-config",
  "version": "0.1.0",
  "main": "./index.mjs",
  "dependencies": {
    "@antfu/eslint-config": "^3.21.3",
    "eslint": "^9.20.0"
  }
}
```

- [ ] **Step 4: Update packages/config/tsconfig/package.json**

Edit `packages/config/tsconfig/package.json`:
```json
{
  "name": "@brand-radar/tsconfig",
  "version": "0.1.0",
  "files": [
    "*.json"
  ]
}
```

- [ ] **Step 5: Verify all package names**

Run: `pnpm list --depth=0 | grep @brand-radar`
Expected: All packages show @brand-radar/* scope

- [ ] **Step 6: Commit**

```bash
git add packages/auth/ packages/db/ packages/config/
git commit -m "refactor(packages): rename from @stackit to @brand-radar

- Update package names in auth, db, config
- Update internal dependencies to @brand-radar/*"
```

---

## Task 12: Update apps/api/package.json

**Files:**
- Modify: `apps/api/package.json`

- [ ] **Step 1: Update package name and dependencies**

Edit `apps/api/package.json`:
```json
{
  "name": "@brand-radar/api",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "start": "node dist/server.js",
    "build": "tsc",
    "test": "vitest",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@brand-radar/auth": "workspace:*",
    "@brand-radar/db": "workspace:*",
    "@brand-radar/redis": "workspace:*",
    "@brand-radar/search": "workspace:*",
    "@brand-radar/shared": "workspace:*",
    "@brand-radar/taxonomy": "workspace:*",
    "@fastify/autoload": "^6.0.2",
    "@fastify/cors": "^10.0.1",
    "@fastify/helmet": "^12.0.1",
    "@fastify/rate-limit": "^10.1.1",
    "@fastify/sensible": "^6.0.1",
    "@fastify/swagger": "^9.3.0",
    "@fastify/swagger-ui": "^5.0.1",
    "@fastify/under-pressure": "^9.0.1",
    "bullmq": "^5.34.1",
    "fastify": "^5.2.0",
    "fastify-plugin": "^5.0.1",
    "fastify-type-provider-zod": "^4.0.2",
    "zod": "^4.1.0"
  },
  "devDependencies": {
    "@brand-radar/config": "workspace:*",
    "@types/node": "^22.10.5",
    "tsx": "^4.19.2",
    "typescript": "^5.7.3",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: Verify dependencies resolve**

Run: `cd apps/api && pnpm install`
Expected: All workspace dependencies resolve

- [ ] **Step 3: Commit**

```bash
git add apps/api/package.json
git commit -m "refactor(api): update dependencies to @brand-radar/*

- Rename package from @stackit/api to @brand-radar/api
- Update all workspace dependencies
- Add new dependencies (search, taxonomy, BullMQ)"
```

---

## Task 13: Update apps/web/package.json

**Files:**
- Modify: `apps/web/package.json`

- [ ] **Step 1: Update package name and dependencies**

Edit `apps/web/package.json`:
```json
{
  "name": "@brand-radar/web",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "type-check": "vue-tsc --noEmit"
  },
  "dependencies": {
    "@brand-radar/shared": "workspace:*",
    "@rebnd/ui": "^0.5.2",
    "pinia": "^2.3.0",
    "vue": "^3.5.13",
    "vue-router": "^4.5.0"
  },
  "devDependencies": {
    "@brand-radar/config": "workspace:*",
    "@vitejs/plugin-vue": "^5.2.1",
    "@vue/test-utils": "^2.4.6",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.7.3",
    "vite": "^6.0.7",
    "vitest": "^2.1.8",
    "vue-tsc": "^2.2.0"
  }
}
```

- [ ] **Step 2: Verify dependencies resolve**

Run: `cd apps/web && pnpm install`
Expected: All workspace dependencies resolve

- [ ] **Step 3: Commit**

```bash
git add apps/web/package.json
git commit -m "refactor(web): update dependencies to @brand-radar/*

- Rename package from @stackit/web to @brand-radar/web
- Update shared package dependency to @brand-radar/shared"
```

---

## Task 14: Update import statements in packages/shared

**Files:**
- Modify: `packages/shared/src/schemas/index.ts`
- Modify: All schema files in `packages/shared/src/schemas/`

- [ ] **Step 1: Update schema exports**

The schemas were moved from `packages/validations/src/` to `packages/shared/src/schemas/`. Update the index file:

Edit `packages/shared/src/schemas/index.ts`:
```typescript
export * as users from './users'
export * as env from './env'
```

- [ ] **Step 2: Check if schema files have internal imports**

Run: `grep -r "from '@stackit" packages/shared/src/schemas/`
Expected: No results (or list files that need updating)

If any files found, update them to use relative imports or `@brand-radar/*`.

- [ ] **Step 3: Verify schemas compile**

Run: `cd packages/shared && pnpm type-check`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/schemas/
git commit -m "refactor(shared): update schema imports and exports

- Fix internal imports in moved schema files
- Export all schemas from shared/schemas index"
```

---

## Task 15: Update import statements in apps/api

**Files:**
- Modify: All TypeScript files in `apps/api/src/`

- [ ] **Step 1: Find and replace @stackit imports**

Run find and replace in `apps/api/src/`:
```bash
find apps/api/src -type f -name "*.ts" -exec sed -i '' 's/@stackit\/validations/@brand-radar\/shared\/schemas/g' {} +
find apps/api/src -type f -name "*.ts" -exec sed -i '' 's/@stackit\/types/@brand-radar\/shared\/types/g' {} +
find apps/api/src -type f -name "*.ts" -exec sed -i '' 's/@stackit\/helpers/@brand-radar\/shared\/utils/g' {} +
find apps/api/src -type f -name "*.ts" -exec sed -i '' 's/@stackit\/cache/@brand-radar\/redis/g' {} +
find apps/api/src -type f -name "*.ts" -exec sed -i '' 's/@stackit\/auth/@brand-radar\/auth/g' {} +
find apps/api/src -type f -name "*.ts" -exec sed -i '' 's/@stackit\/db/@brand-radar\/db/g' {} +
```

- [ ] **Step 2: Verify no @stackit imports remain**

Run: `grep -r "@stackit" apps/api/src/`
Expected: No results

- [ ] **Step 3: Verify API compiles**

Run: `cd apps/api && pnpm type-check`
Expected: No errors (or list specific errors to fix)

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/
git commit -m "refactor(api): update imports from @stackit to @brand-radar

- Replace all @stackit/* imports with @brand-radar/*
- Update validations -> shared/schemas
- Update types -> shared/types
- Update helpers -> shared/utils
- Update cache -> redis"
```

---

## Task 16: Update import statements in apps/web

**Files:**
- Modify: All TypeScript/Vue files in `apps/web/src/`

- [ ] **Step 1: Find and replace @stackit imports**

Run find and replace in `apps/web/src/`:
```bash
find apps/web/src -type f \( -name "*.ts" -o -name "*.vue" \) -exec sed -i '' 's/@stackit\/validations/@brand-radar\/shared\/schemas/g' {} +
find apps/web/src -type f \( -name "*.ts" -o -name "*.vue" \) -exec sed -i '' 's/@stackit\/types/@brand-radar\/shared\/types/g' {} +
find apps/web/src -type f \( -name "*.ts" -o -name "*.vue" \) -exec sed -i '' 's/@stackit\/helpers/@brand-radar\/shared\/utils/g' {} +
```

- [ ] **Step 2: Verify no @stackit imports remain**

Run: `grep -r "@stackit" apps/web/src/`
Expected: No results

- [ ] **Step 3: Verify web compiles**

Run: `cd apps/web && pnpm type-check`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/
git commit -m "refactor(web): update imports from @stackit to @brand-radar

- Replace all @stackit/* imports with @brand-radar/*
- Update to shared package subpath exports"
```

---

## Task 17: Update docker-compose.yml

**Files:**
- Modify: `docker-compose.yml`

- [ ] **Step 1: Add OpenSearch service and update service names**

Edit `docker-compose.yml`:
```yaml
services:
  postgres:
    image: pgvector/pgvector:pg16
    container_name: brand-radar-postgres
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-postgres}
      POSTGRES_DB: ${POSTGRES_DB:-brand_radar}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: brand-radar-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  opensearch:
    image: opensearchproject/opensearch:2
    container_name: brand-radar-opensearch
    environment:
      - discovery.type=single-node
      - OPENSEARCH_JAVA_OPTS=-Xms512m -Xmx512m
      - DISABLE_SECURITY_PLUGIN=true
    ports:
      - "9200:9200"
      - "9600:9600"
    volumes:
      - opensearch_data:/usr/share/opensearch/data
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:9200/_cluster/health || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build:
      context: .
      target: api-dev
    container_name: brand-radar-api
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/brand_radar
      REDIS_URL: redis://redis:6379
      OPENSEARCH_URL: http://opensearch:9200
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      opensearch:
        condition: service_healthy
    volumes:
      - .:/app
      - /app/node_modules
    develop:
      watch:
        - path: ./apps/api/src
          target: /app/apps/api/src
          action: sync
        - path: ./packages
          target: /app/packages
          action: sync

  web:
    build:
      context: .
      target: web-dev
    container_name: brand-radar-web
    ports:
      - "5173:5173"
    environment:
      NODE_ENV: development
      VITE_API_URL: http://localhost:3000
    depends_on:
      - api
    volumes:
      - .:/app
      - /app/node_modules
    develop:
      watch:
        - path: ./apps/web/src
          target: /app/apps/web/src
          action: sync

  workers:
    build:
      context: .
      target: workers-dev
    container_name: brand-radar-workers
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/brand_radar
      REDIS_URL: redis://redis:6379
      OPENSEARCH_URL: http://opensearch:9200
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      opensearch:
        condition: service_healthy
    volumes:
      - .:/app
      - /app/node_modules
    develop:
      watch:
        - path: ./apps/workers/src
          target: /app/apps/workers/src
          action: sync
        - path: ./packages
          target: /app/packages
          action: sync

  scheduler:
    build:
      context: .
      target: scheduler-dev
    container_name: brand-radar-scheduler
    environment:
      NODE_ENV: development
      REDIS_URL: redis://redis:6379
    depends_on:
      redis:
        condition: service_healthy
    volumes:
      - .:/app
      - /app/node_modules
    develop:
      watch:
        - path: ./apps/scheduler/src
          target: /app/apps/scheduler/src
          action: sync

volumes:
  postgres_data:
  redis_data:
  opensearch_data:
```

- [ ] **Step 2: Verify compose file syntax**

Run: `docker compose config`
Expected: Valid YAML output

- [ ] **Step 3: Commit**

```bash
git add docker-compose.yml
git commit -m "feat(docker): add OpenSearch, workers, and scheduler services

- Add OpenSearch 2 for full-text search
- Add workers service for background jobs
- Add scheduler service for cron jobs
- Update container names to brand-radar-*
- Add health checks and watch mode"
```

---

## Task 18: Update Dockerfile

**Files:**
- Modify: `Dockerfile`

- [ ] **Step 1: Add workers and scheduler targets**

Edit `Dockerfile` - add these stages after the existing api/web stages:

```dockerfile
# ... (existing deps, api-build, api-prod, api-dev, web-build, web-prod, web-dev stages)

# Workers development
FROM deps AS workers-dev
WORKDIR /app
ENV NODE_ENV=development
CMD ["pnpm", "run", "dev", "--filter=@brand-radar/workers"]

# Workers production build
FROM deps AS workers-build
WORKDIR /app
RUN pnpm run build --filter=@brand-radar/workers

# Workers production
FROM node:20-alpine AS workers-prod
WORKDIR /app
COPY --from=workers-build /app/apps/workers/dist ./apps/workers/dist
COPY --from=workers-build /app/node_modules ./node_modules
COPY --from=workers-build /app/apps/workers/package.json ./apps/workers/
ENV NODE_ENV=production
CMD ["node", "apps/workers/dist/bootstrap.js"]

# Scheduler development
FROM deps AS scheduler-dev
WORKDIR /app
ENV NODE_ENV=development
CMD ["pnpm", "run", "dev", "--filter=@brand-radar/scheduler"]

# Scheduler production build
FROM deps AS scheduler-build
WORKDIR /app
RUN pnpm run build --filter=@brand-radar/scheduler

# Scheduler production
FROM node:20-alpine AS scheduler-prod
WORKDIR /app
COPY --from=scheduler-build /app/apps/scheduler/dist ./apps/scheduler/dist
COPY --from=scheduler-build /app/node_modules ./node_modules
COPY --from=scheduler-build /app/apps/scheduler/package.json ./apps/scheduler/
ENV NODE_ENV=production
CMD ["node", "apps/scheduler/dist/main.js"]
```

- [ ] **Step 2: Verify Dockerfile syntax**

Run: `docker build --target workers-dev --dry-run .`
Expected: No syntax errors

- [ ] **Step 3: Commit**

```bash
git add Dockerfile
git commit -m "feat(docker): add workers and scheduler build targets

- Add workers-dev, workers-build, workers-prod stages
- Add scheduler-dev, scheduler-build, scheduler-prod stages
- Multi-stage build supports 4 apps now"
```

---

## Task 19: Install all dependencies

**Files:**
- N/A (runs pnpm install)

- [ ] **Step 1: Clean install**

Run: `pnpm install`
Expected: All workspace packages resolve and install

- [ ] **Step 2: Verify lockfile updated**

Run: `git status pnpm-lock.yaml`
Expected: Modified

- [ ] **Step 3: Commit lockfile**

```bash
git add pnpm-lock.yaml
git commit -m "chore(deps): update lockfile for restructured workspace

- Install all new package dependencies
- Update workspace symlinks
- New packages: shared, search, ai, taxonomy
- New apps: workers, scheduler"
```

---

## Task 20: Verify full build

**Files:**
- N/A (verification only)

- [ ] **Step 1: Run type-check across workspace**

Run: `pnpm run type-check`
Expected: All packages compile without errors

If errors occur, note them for fixing:
- Missing exports in moved packages
- Import path issues
- Type mismatches

- [ ] **Step 2: Fix any type errors found**

For each error:
1. Identify the file and issue
2. Fix import paths or add missing exports
3. Re-run type-check

Continue until clean build.

- [ ] **Step 3: Verify all apps have proper structure**

Run: `ls -la apps/*/src/ packages/*/src/`
Expected: All directories exist with at least index.ts

- [ ] **Step 4: Document any remaining issues**

If there are issues that need user input (missing implementations, unclear dependencies), document them in a comment for the user.

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "chore: fix remaining type errors and build issues

- Resolve import path issues
- Add missing exports
- Ensure clean build across all packages"
```

---

## Task 21: Update README.md

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update package structure section**

Edit `README.md` - replace the "Structure" section:

```markdown
## Structure

\`\`\`
brand-radar/
├── apps/
│   ├── api/                    Fastify API Gateway (domain modules)
│   ├── web/                    Vue 3 SPA (discovery, search, trends)
│   ├── workers/                Background workers (crawl, social, AI)
│   └── scheduler/              Job scheduling (BullMQ + cron)
├── packages/
│   ├── shared/                 @brand-radar/shared       — consolidated types, schemas, utils
│   ├── db/                     @brand-radar/db           — Drizzle ORM + PostgreSQL
│   ├── redis/                  @brand-radar/redis        — Redis client + BullMQ queues
│   ├── search/                 @brand-radar/search       — OpenSearch client
│   ├── ai/                     @brand-radar/ai           — AI/ML/NLP/embeddings
│   ├── taxonomy/               @brand-radar/taxonomy     — Brand classification
│   ├── auth/                   @brand-radar/auth         — better-auth wrapper
│   └── config/
│       ├── tsconfig/           shared TypeScript configs
│       └── eslint-config/      shared ESLint config
├── infrastructure/             nginx config
├── docker-compose.yml          postgres + redis + opensearch + api + web + workers + scheduler
└── Dockerfile                  multi-stage: deps → apps {build, dev, prod}
\`\`\`
```

- [ ] **Step 2: Update package names in examples**

Find and replace `@stackit/*` with `@brand-radar/*` throughout README.md.

- [ ] **Step 3: Add OpenSearch to services**

Update the services section to include OpenSearch:

```markdown
## Services

- **PostgreSQL** (pgvector) - Primary database with vector embeddings
- **Redis** - Cache + BullMQ job queues
- **OpenSearch** - Full-text and semantic search
```

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: update README for Brand Radar restructure

- Update directory structure documentation
- Change @stackit to @brand-radar
- Add new packages and apps
- Document OpenSearch service"
```

---

## Task 22: Update .env.example

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Add OpenSearch URL**

Edit `.env.example` - add OpenSearch configuration:

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/brand_radar"

# Redis
REDIS_URL="redis://localhost:6379"

# OpenSearch
OPENSEARCH_URL="http://localhost:9200"

# Auth (better-auth)
BETTER_AUTH_SECRET="your-secret-key-min-32-chars"
BETTER_AUTH_URL="http://localhost:3000"

# API
API_PORT=3000
API_HOST="0.0.0.0"

# Web
VITE_API_URL="http://localhost:3000"
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "chore(env): add OpenSearch configuration to .env.example

- Add OPENSEARCH_URL environment variable
- Update database name to brand_radar"
```

---

## Verification & Completion

After completing all tasks, verify the restructuring:

- [ ] **All packages renamed** from @stackit to @brand-radar
- [ ] **All imports updated** to use new package names and subpaths
- [ ] **New packages created**: shared, search, ai, taxonomy
- [ ] **New apps created**: workers, scheduler
- [ ] **Package cache renamed** to redis with BullMQ support
- [ ] **Docker compose includes** OpenSearch, workers, scheduler
- [ ] **Full workspace builds** without errors (`pnpm run type-check`)
- [ ] **Documentation updated** (README, .env.example)

---

## Next Steps (Post-Restructure)

After this plan is complete, the directory structure will be in place but packages will be mostly empty placeholders. The next phases are:

1. **Implement database schema** - expand packages/db with Brand Radar entities
2. **Implement API modules** - move existing api code to domain modules, add new modules
3. **Implement workers** - build out discovery, crawl, social, AI workers
4. **Implement scheduler** - create job definitions and cron schedules
5. **Implement frontend** - add Brand Radar views and components

These will be separate implementation plans.
