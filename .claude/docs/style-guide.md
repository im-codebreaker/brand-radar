# stackit — Style Guide

## Reference Files

Canonical examples of project patterns. Read the relevant one before implementing.

### Backend (api)

| Pattern | Reference File |
|---------|----------------|
| App wiring & autoload | `apps/api/src/app.ts` |
| Server startup | `apps/api/src/server.ts` |
| Env loader (Zod-validated) | `apps/api/src/config/env.ts` |
| App plugin (db) | `apps/api/src/plugins/app/db.ts` |
| App plugin (repositories) | `apps/api/src/plugins/app/repositories.ts` |
| App plugin (auth, optional) | `apps/api/src/plugins/app/auth.ts` |
| Error handler | `apps/api/src/plugins/app/error-handler.ts` |
| External plugin (swagger) | `apps/api/src/plugins/external/swagger.ts` |
| Repository (Drizzle queries) | `apps/api/src/repositories/users.ts` |
| Handler factory | `apps/api/src/handlers/users.ts` |
| Route (Zod-typed) | `apps/api/src/routes/users.ts` |
| Auth gate | `apps/api/src/routes/autohooks.ts` |
| Decorator augmentation | `apps/api/src/types/fastify.d.ts` |
| better-auth wrapper | `apps/api/src/lib/auth.ts` |

### Frontend (web)

| Pattern | Reference File |
|---------|----------------|
| App shell | `apps/web/src/App.vue` |
| Page (read-only) | `apps/web/src/views/HomeView.vue` |
| Page (form) | `apps/web/src/views/LoginView.vue` |
| CRUD list view | `apps/web/src/views/UsersView.vue` |
| Router | `apps/web/src/router/index.ts` |
| Pinia store | `apps/web/src/stores/auth.ts` |
| Zod-form composable | `apps/web/src/composables/useZodForm.ts` |
| API client | `apps/web/src/lib/api.ts` |
| Auth client | `apps/web/src/lib/auth-client.ts` |

### Shared

| Pattern | Reference File |
|---------|----------------|
| Validation barrel | `packages/validations/src/index.ts` |
| Request schemas | `packages/validations/src/users/requests.ts` |
| Response schemas | `packages/validations/src/users/responses.ts` |
| Route schemas (combined) | `packages/validations/src/users/routes.ts` |
| Shared timestamps schema | `packages/validations/src/shared/timestamps.ts` |
| Drizzle client factory | `packages/db/src/client.ts` |
| Drizzle schema | `packages/db/src/schema/users.ts` |
| Drizzle migrations | `packages/db/drizzle/` |
| Helpers | `packages/helpers/src/index.ts` |

## General Principles

- **Clarity over cleverness** — readable, maintainable, reusable code.
- **Consistency** — match established patterns; the reference files above are canonical.
- **Simplicity** — no speculative abstractions; three repeated lines is fine, premature DRY is not.
- **Documentation** — code should be self-documenting; only comment the *why* (constraints, invariants, gotchas).
- **Testability** — write tests for non-trivial logic.
- **Zod is the contract** — every cross-boundary shape lives in `@stackit/validations`.

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
- Pure when feasible; isolate side effects (I/O, state).

**Objects & arrays**
- Literals `{}` / `[]`, never `new Object()` / `new Array()`.
- Shorthand: `{ name, age }`, `{ add(a, b) { /* … */ } }`.
- Spread for copies, not mutation: `{ ...obj, c: 3 }`, `[...arr, item]`.
- Array methods over loops: `.map`, `.filter`, `.reduce`, `.flatMap`.

**Immutability**
- Spread to copy; never mutate inputs.
- `Object.freeze()` for shallow immutability when needed.
- `readonly` modifiers on type properties that shouldn't change.

| Operation | Avoid | Prefer |
|-----------|-------|--------|
| Create object | `new Object()` | `{}` |
| Copy object | `Object.assign(obj, …)` | `{ ...obj, … }` |
| Copy array | `arr.slice()` | `[...arr]` |
| Add to array | `arr.push(item)` (mutates) | `[...arr, item]` |
| Remove | `arr.splice(i, 1)` (mutates) | `arr.filter(…)` |
| Update field | `obj.k = v` (mutates) | `{ ...obj, k: v }` |

### Error handling

1. **Never fail silently** — log or rethrow.
2. **Fail fast** — throw early when invariants are violated.
3. **Provide context** — include relevant data in the message.
4. **Preserve the chain** — re-throw with `{ cause }`.

**Throw when**: validation fails, required data missing, preconditions violated, unrecoverable state.

**Catch when**: you can recover, you need to enrich context, you're at a boundary (HTTP, plugin, component), you need to convert to user-friendly output.

```ts
try {
  return await fetchUserData(userId)
}
catch (error) {
  request.log.error({ error: error instanceof Error ? error.message : error, userId }, 'fetchUserData failed')
  throw new Error(`Failed to fetch user ${userId}`, { cause: error })
}
```

See the [`javascript-expert`](../agents/javascript-expert.md) agent for anti-patterns and additional patterns.

## Vue 3

**External reference**: [Vue Official Style Guide][Vue]

### Project conventions

- Components live in `apps/web/src/{views,components,layouts}/` with `PascalCase` filenames.
- One component per file. Multi-word component names (`UserCard.vue`, not `Card.vue`).
- `<script setup lang="ts">` only. Composition API only.
- Order: `<script>` → `<template>` → `<style>`.

Script section order:
1. `import` statements
2. `defineProps` / `defineEmits` / `defineModel`
3. Composables (`useRouter`, `useAuthStore`, …)
4. Reactive state (`ref`, `reactive`)
5. Computed properties
6. Lifecycle hooks (`onMounted`, etc.)
7. Watchers (`watch`, `watchEffect`)
8. Methods / functions

**TypeScript**
- Typed props: `defineProps<{ user: User }>()`.
- Typed emits: `defineEmits<{ update: [user: User] }>()`.
- No `any`.

**Composables**
- Live in `apps/web/src/composables/`.
- `use*` prefix.
- One composable per file.
- Return an object with named properties: `return { data, loading, error }`.

**State management**
- Pinia, composition style.
- Stores in `apps/web/src/stores/<feature>.ts`.
- Lift truly shared state into stores; keep view-local state in `ref`/`reactive`.
- Avoid prop drilling — use a store, provide/inject, or a composable.

**Routing**
- Vue Router in `apps/web/src/router/`.
- Route names in kebab-case.
- Navigate with `useRouter()` — never `window.location`.

**Forms**
- Zod schemas come from `@stackit/validations` — never duplicated in the frontend.
- `useZodForm(SchemaFromValidations, initialValues)`.
- Always provide error messages.
- Prefer `v-model` over manual `:value` + `@input`.

**Styling**
- Tailwind v4 utility-first.
- Use `<style scoped>` only when truly necessary.
- Dynamic styles: `:style` binding or `v-bind()` in CSS.

See the [`vue-expert`](../agents/vue-expert.md) agent for anti-patterns and the full Priority A/B checklist.

## Fastify

**External reference**: [Fastify Documentation][Fastify]

### Project conventions

- Two-tier plugin directories:
  - `apps/api/src/plugins/external/` — third-party
  - `apps/api/src/plugins/app/` — custom
- One plugin per file; `kebab-case` filename.
- Always wrap with `fastify-plugin`. Always set `name`. Declare `dependencies` when needed.

```ts
import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'

declare module 'fastify' {
  interface FastifyInstance {
    myService: MyServiceType
  }
}

async function plugin(fastify: FastifyInstance) {
  const service = createService()
  fastify.decorate('myService', service)

  fastify.addHook('onClose', async () => {
    await service.disconnect()
  })
}

export default fp(plugin, { name: 'my-plugin' })
```

**Routes**
- One file per domain in `apps/api/src/routes/`.
- Export `autoPrefix = '/feature'`.
- Schemas come from `@stackit/validations/<feature>/routes`.

**Validation**
- `fastify-type-provider-zod` — Zod is the single schema language.
- No TypeBox, no JSON Schema literals, no AJV directly.

**Error handling**
- Global handler at `apps/api/src/plugins/app/error-handler.ts`.
- Use `request.server.httpErrors.*` (from `@fastify/sensible`) for canonical status codes.
- Preserve original errors with `{ cause }` when converting.

**Hooks & lifecycle**
- `onClose` for cleanup (DB disconnect, cache quit).
- `close-with-grace` wraps `server.ts` for graceful shutdown.
- Plugin order: external → app → routes.

See the [`fastify-expert`](../agents/fastify-expert.md) agent for anti-patterns.

## PostgreSQL & Drizzle ORM

**External reference**: [Drizzle Documentation][Drizzle]

### Project conventions

**Package layout**
- Drizzle client + schema at `packages/db/`.
- Schema files under `packages/db/src/schema/<domain>.ts`, re-exported from `schema/index.ts`.
- Migrations under `packages/db/drizzle/` — committed to git.
- `drizzle.config.ts` loads `.env` from the monorepo root (it knows where it lives).

**Client**
- Factory pattern: `createDatabaseClient({ url })` returns a Drizzle instance with `$disconnect` attached.
- Driver: `postgres` (postgres-js). Do not mix with `pg`.

```ts
const queryClient = postgres(url)
const db = drizzle(queryClient, { schema, casing: 'snake_case' })
```

**Schema conventions**
- Table objects in `camelCase`; SQL column names map to `snake_case` via `casing` config.
- `uuid().primaryKey().defaultRandom()` for IDs (unless the domain dictates `text()` like better-auth's `sessions.id`).
- Always include `createdAt` and `updatedAt` (the latter with `$onUpdate(() => new Date())`).
- Declare `relations()` bidirectionally when joins are needed.
- Foreign keys: `references(() => other.id, { onDelete: 'cascade' })` when appropriate.

```ts
export const users = pgTable('users', {
  id: uuid().primaryKey().defaultRandom(),
  email: text().notNull().unique(),
  name: text().notNull(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow().$onUpdate(() => new Date()),
})
```

**Query patterns**
- Relational API (`db.query.users.findFirst`, `findMany`) for typed ergonomic queries — use this first.
- Builder API (`select / insert / update / delete`) for aggregates, set ops, or raw `sql`.
- `.returning()` on writes that need the row back.
- `db.transaction(async (tx) => …)` for atomicity; pass `tx` into repository methods.

**Repository pattern**
- One file per domain: `apps/api/src/repositories/<feature>.ts`.
- Factory function taking the `DatabaseClient`.
- Each method accepts `tx?: DbClient` so it can join an outer transaction.
- Drizzle types never leak past the repository boundary.

**Error handling**
- `postgres` driver throws `PostgresError` with SQLSTATE `code` fields.
- Map known codes to HTTP errors:
  - `23505` unique violation → 409
  - `23503` FK violation → 400
  - `23502` not-null → 400
  - `23514` check constraint → 400
- See the [`drizzle-expert`](../agents/drizzle-expert.md) agent for the full pattern.

**Migrations**
- `pnpm db:generate` after every schema change. Inspect the SQL diff before applying.
- `pnpm db:push` for dev (skips migration history, fast for prototyping).
- `pnpm db:migrate` for prod path (writes to `_journal.json`).
- Never edit an already-applied migration file — create a new one.

**pgvector** (opt-in)
- Add `CREATE EXTENSION IF NOT EXISTS vector;` to a new migration manually.
- Declare columns: `vector('embedding', { dimensions: 1536 })`.
- Index with HNSW or IVFFlat in the migration's manual SQL section.
- Query with `cosineDistance` / `l2Distance` / `innerProduct` — fully typed.

## Redis (optional)

**External reference**: [Redis Documentation][Redis]

### Project conventions

- `packages/cache/` exports `createCacheClient({ host, port })`.
- Fastify plugin at `apps/api/src/plugins/app/redis.ts` decorates `fastify.cache`.
- Call `await cache.connect()` in the plugin; `await cache.quit()` in the `onClose` hook (not `disconnect()`).

**Key naming**
- Colon separator: `resource:id` or `resource:id:field`.
- Domain prefix: `user:123`, `session:abc`, `rate:ip:127.0.0.1`.

**Common operations**
- `get(key)` / `set(key, value)`
- `setEx(key, seconds, value)` — set with TTL
- `del(key)` / `exists(key)`
- `expire(key, seconds)` — set TTL on existing key
- `incr(key)` / `decr(key)` — atomic counters

**Caching strategies**
- **Cache-aside**: check cache → miss → fetch DB → cache result with TTL.
- **TTL**: always set expiration — stale data is worse than no cache.
- **Invalidation**: delete the key on mutation.
- **Prefix scan**: `user:*` for bulk invalidation.

**Resilience**
- Cache failures must not break the app — log and fall back to DB.
- Wrap cache reads in try/catch on critical paths.

[Vue]: https://vuejs.org/style-guide/
[Fastify]: https://fastify.dev/docs/latest/
[Drizzle]: https://orm.drizzle.team/docs/overview
[Redis]: https://redis.io/docs/
