# Commit Conventions

Brand Radar follows the **[Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/)** specification, adapted to the monorepo so the scope tells you *where* in the workspace a change landed.

## Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

- **type**: required — see the [Types](#types) table.
- **scope**: required for code changes — see the [Scopes](#scopes) table. Maps to a package/area of the monorepo.
- **description**: imperative mood, present tense, lowercase, no trailing period. Aim ≤ 72 chars total for the subject line.
- **body**: optional — explain *why*, not *what*. Wrap at ~72 columns.
- **footer**: optional — `BREAKING CHANGE: …`, issue refs like `Closes #42`, etc.

## Types

From the Conventional Commits spec, plus a couple of common Angular-flavored extras:

| Type | When to use |
|------|-------------|
| `feat` | A user-visible new capability (route, view, schema, feature). Triggers a MINOR semver bump. |
| `fix` | A bug fix that resolves incorrect behavior. Triggers a PATCH semver bump. |
| `refactor` | Code restructure with no behavior change (rename, extract, inline). |
| `perf` | Performance improvement with no behavior change. |
| `docs` | Documentation only — README, `.claude/docs/`, JSDoc, comments. |
| `test` | Adding or fixing tests only. |
| `build` | Build system, dependencies, or compilation config (Vite, tsconfig, Dockerfile build stage). |
| `ci` | CI configuration only (GitHub Actions, hooks). |
| `chore` | Miscellaneous repo housekeeping (lockfile bumps, dotfiles) that don't fit elsewhere. |
| `style` | Formatting / whitespace / lint-only changes (no logic). |
| `revert` | Reverts a previous commit. Body should reference the reverted hash. |

### Breaking changes

Two equivalent ways to mark a breaking change:

1. **`!` after the scope**: `feat(api)!: rename brands.list response shape`
2. **Footer**: `BREAKING CHANGE: response.brands renamed to response.items`

Either bumps MAJOR semver. Use the footer if you want to explain the migration path; use `!` for a terse signal.

## Scopes

Scope describes the **area of the monorepo** affected. Always lowercase. One scope per commit — if a change genuinely spans multiple areas, see [Multiple scopes](#multiple-scopes) below.

| Scope | Maps to | When |
|-------|---------|------|
| `api` | `apps/api/**` | Backend code: plugins, routes, handlers, repositories, lib, server. |
| `web` | `apps/web/**` | Frontend code: views, components, composables, stores, router. |
| `workers` | `apps/workers/**` | BullMQ workers: job processors, queue config, worker registration. |
| `scheduler` | `apps/scheduler/**` | Cron job scheduler: scheduled discovery runs, periodic tasks. |
| `db` | `packages/db/**` | Drizzle schema, migrations (`drizzle/`), client factory, seed script. |
| `search` | `packages/search/**` | Meilisearch client, index configuration, sync strategies. |
| `redis` | `packages/redis/**` | Redis client, queue configuration, cache utilities. |
| `adapters` | `packages/adapters/**` | Scraping adapters: Instagram, TikTok, web crawlers, health probes. |
| `shared` | `packages/shared/**` | Shared utilities, types, job schemas, validators. |
| `ai` | `packages/ai/**` | Embeddings, NLP utilities, semantic search (Phase 3). |
| `taxonomy` | `packages/taxonomy/**` | Brand classification, category mapping. |
| `auth` | `packages/auth/**` | better-auth wrapper, session management. |
| `config` | `packages/config/**` | tsconfig and eslint-config packages. |
| `infra` | `Dockerfile`, `docker-compose.yml`, `infrastructure/**` | Docker, nginx, deployment plumbing. |
| `repo` | Root `package.json`, `pnpm-workspace.yaml`, `.gitignore` | Workspace-level config. |
| `deps` | Any `package.json` dependency bump that touches multiple packages or is cross-cutting | Dependency-only commits. |
| `docs` | `README.md`, `.claude/docs/**`, in-repo `*.md` files | Documentation-only commits. |
| `tooling` | `.claude/**`, `eslint.config.*`, `tsconfig.json` at the workspace level | Developer-tooling-only commits. |

### How to pick the scope

A practical rule of thumb:

1. **What's the *primary* directory the change touches?** Use that scope.
2. If only `package.json`s changed (a dep bump), use `deps`.
3. If only docs changed, use `docs`.
4. If the change is a generated migration in `packages/db/drizzle/`, use `db`.
5. If you can't decide between `repo` and a package scope, prefer the package scope — `repo` is for things that genuinely don't belong to any package.

### Multiple scopes

Conventional Commits 1.0.0 only allows a single scope. If a change spans areas, you have two options:

**Preferred**: split into multiple commits, one per scope.

```
feat(shared): add ScoringJobSchema for brand scoring
feat(workers): implement scoring worker with BullMQ
feat(api): expose /brands/:id/score endpoint
```

This makes `git log` readable and `git bisect` precise.

**Fallback**: use the broadest applicable scope (often `api` or `repo`) and list the touched areas in the body.

```
refactor(repo): consolidate brand types across packages

- packages/shared/src/types/brand.ts is now the source of truth
- apps/api/src/types/brand.ts removed (duplicated fields)
- apps/web/src/types/brand.ts now imports from @brand-radar/shared
```

### Examples by scope

#### api

```
feat(api): add /v1/brands/:id/social-profiles endpoint
fix(api): handle missing brand in getBrandById handler
refactor(api): extract brand service from handlers
```

#### web

```
feat(web): add discovery feed with infinite scroll
fix(web): correct brand card image aspect ratio
refactor(web): extract BrandFilters to composable
```

#### workers

```
feat(workers): add enrichment worker for social stats
fix(workers): handle extraction timeout in normalization worker
perf(workers): batch brand scoring updates to reduce DB calls
```

#### scheduler

```
feat(scheduler): add daily Instagram discovery cron job
fix(scheduler): correct timezone handling in scheduled tasks
```

#### db

```
feat(db): add social_profiles table with snapshots
fix(db): add missing index on brands.slug
refactor(db): split schema into domain-specific files
```

#### search

```
feat(search): configure typo tolerance for brand search
fix(search): correct facet filtering on category field
```

#### adapters

```
feat(adapters): add Instagram hashtag crawler adapter
fix(adapters): handle rate limiting in TikTok adapter
perf(adapters): reduce Playwright memory usage with browser pooling
```

#### shared

```
feat(shared): add BrandSchema with Zod validation
refactor(shared): consolidate error types in errors.ts
```

#### infra

```
feat(infra): add nginx reverse proxy config
fix(infra): correct Meilisearch container healthcheck
```

#### deps

```
chore(deps): bump drizzle-orm to ^0.46
chore(deps): upgrade Playwright to v1.40
```

#### docs

```
docs(docs): update pipeline architecture with scoring flow
docs(brand-platform): add adapter health probe patterns
```

## Common Patterns

### Feature additions

```
feat(api): add trend detection endpoint
feat(web): implement brand comparison view
feat(workers): add scoring worker with rule-based algorithm
feat(adapters): add Reddit adapter for brand mentions
```

### Bug fixes

```
fix(api): return 404 when brand not found
fix(workers): prevent duplicate discovery jobs
fix(adapters): handle Instagram captcha gracefully
```

### Refactoring

```
refactor(api): extract brand repository from handlers
refactor(workers): standardize error handling across workers
refactor(web): convert BrandCard to composition API
```

### Documentation

```
docs(docs): add adapter implementation guide
docs(brand-platform): update scoring system formula
docs(repo): explain worker queue topology
```

### Dependencies

```
chore(deps): bump fastify to 5.1.0
chore(deps): upgrade Vue to 3.5
```

### Breaking changes

```
feat(api)!: rename brands.status to brands.reviewStatus

BREAKING CHANGE: The `status` field on brand objects has been renamed to
`reviewStatus` to avoid confusion with HTTP status codes. Update API clients
to use the new field name.
```

## Anti-Patterns

### ❌ Don't

**Don't use vague descriptions**
```
fix(api): fix bug
feat(web): update UI
```

**Don't mix concerns**
```
feat(api): add brand scoring endpoint and fix bug in discovery
```
Split into two commits instead.

**Don't skip the scope**
```
feat: add brand scoring
```
Always include scope: `feat(workers): add brand scoring worker`

**Don't use past tense**
```
fix(api): fixed brand query bug
```
Use imperative mood: `fix(api): fix brand query bug`

### ✅ Do

**Do be specific**
```
fix(workers): handle extraction timeout in normalization worker
feat(adapters): add Instagram hashtag discovery
```

**Do split cross-cutting changes**
```
feat(shared): add BrandScoringSchema
feat(workers): implement scoring worker
feat(api): expose scoring endpoint
```

**Do use imperative mood**
```
fix(api): correct brand score calculation
refactor(web): extract brand filters to composable
```

## Commit Message Template

```
<type>(<scope>): <short summary>

<optional body explaining why, not what>

<optional footer for breaking changes or issue refs>
```

### Example

```
feat(workers): add enrichment worker for social stats

Fetches Instagram and TikTok follower counts for brands that have
social profiles. Runs daily via scheduler and enqueues indexing
job after completion.

Closes #42
```

## Tools

### commitlint

Brand Radar enforces commit conventions via `commitlint` in the pre-commit hook. Invalid commits are rejected with a helpful error message.

### Commitizen (optional)

For interactive commit message prompts:

```bash
pnpm exec cz
```

This guides you through type, scope, description, body, and footer.

## References

- [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/)
- [Angular Commit Guidelines](https://github.com/angular/angular/blob/main/CONTRIBUTING.md#commit)
- [Semantic Versioning 2.0.0](https://semver.org/)
