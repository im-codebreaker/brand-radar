# Commit Conventions

stackit follows the **[Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/)** specification, adapted to the monorepo so the scope tells you *where* in the workspace a change landed.

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

1. **`!` after the scope**: `feat(api)!: rename users.list response shape`
2. **Footer**: `BREAKING CHANGE: response.users renamed to response.items`

Either bumps MAJOR semver. Use the footer if you want to explain the migration path; use `!` for a terse signal.

## Scopes

Scope describes the **area of the monorepo** affected. Always lowercase. One scope per commit — if a change genuinely spans multiple areas, see [Multiple scopes](#multiple-scopes) below.

| Scope | Maps to | When |
|-------|---------|------|
| `api` | `apps/api/**` | Backend code: plugins, routes, handlers, repositories, lib, server. |
| `web` | `apps/web/**` | Frontend code: views, components, composables, stores, router. |
| `db` | `packages/db/**` | Drizzle schema, migrations (`drizzle/`), client factory, seed script. |
| `auth` | `packages/auth/**` | better-auth wrapper. (Optional module — only when the package is present.) |
| `cache` | `packages/cache/**` | Redis client. (Optional module.) |
| `validations` | `packages/validations/**` | Shared Zod schemas. |
| `types` | `packages/types/**` | Pure TypeScript types and API envelopes. |
| `helpers` | `packages/helpers/**` | Shared utilities. |
| `config` | `packages/config/**` | tsconfig and eslint-config packages. |
| `infra` | `Dockerfile`, `docker-compose.yml`, `infrastructure/**` | Docker, nginx, deployment plumbing. |
| `repo` | Root `package.json`, `scripts/init.ts`, `pnpm-workspace.yaml`, `.gitignore` | Workspace-level config. |
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
fix(validations): add SignUpSchema for email + password
feat(api): wire SignUpSchema into /v1/auth/sign-up
feat(web): bind SignUpSchema to LoginView form
```

This makes `git log` readable and `git bisect` precise.

**Fallback**: use the broadest applicable scope (often `api` or `repo`) and list the touched areas in the body.

```
refactor(repo): consolidate env loading across api and web

- apps/api/src/config/env.ts now validates with shared Zod schema
- apps/web/src/lib/env.ts no longer duplicates fields
- packages/validations/src/env.ts is the new source of truth
```

## Description

- Imperative mood: "add", "fix", "rename" — not "added", "fixes", "renaming".
- Lowercase first letter.
- No trailing period.
- ≤ 72 chars total for the subject line (so it doesn't truncate in `git log --oneline`).

| Bad | Good |
|-----|------|
| `feat(api): Added new endpoint.` | `feat(api): add /v1/projects list endpoint` |
| `fix(web): fixes the login form bug` | `fix(web): clear LoginView errors on schema reset` |
| `chore: bump deps` | `chore(deps): bump drizzle-orm to ^0.46.1` |

## Body

Use the body to explain **why**, not what. The diff already shows what changed.

Wrap at ~72 columns. Blank line between subject and body.

```
fix(db): load monorepo .env from drizzle.config and align .env.example to host-run

drizzle-kit invokes the config from packages/db/, so the previous
`import 'dotenv/config'` only saw packages/db/.env (which doesn't exist)
and DATABASE_URL came through empty. Resolve the .env path relative to
the config file so any cwd works.

Also flip .env.example's DATABASE_URL from the docker-internal hostname
to localhost — the README's recommended flow runs apps + tooling on the
host, where `postgres` does not resolve.
```

## Footers

- **`BREAKING CHANGE: <description>`** — explain the breaking change and how to migrate.
- **`Closes #<n>`** / **`Fixes #<n>`** / **`Refs #<n>`** — link to issues / PRs.
- **`Reviewed-by: <person>`** — for trail when a co-reviewer signed off.

### What we explicitly do NOT include

- **No `Co-Authored-By: Claude` (or similar) trailers.** `.claude/settings.json` sets `includeCoAuthoredBy: false` so the CLI won't add one automatically. If you want to credit a human collaborator, add a regular `Co-Authored-By:` line for that person.

## Examples

### Common cases

```
feat(api): add /v1/projects routes with pagination
feat(web): add ProjectsView with infinite scroll
fix(db): handle drizzle migration race in db:reset
fix(api): return 409 on email unique-violation (SQLSTATE 23505)
refactor(web): extract UserCard to components/ui/
perf(api): cache user-by-id with redis for 60s
docs(repo): document pnpm setup pruning flow
test(api): cover users CRUD against a real postgres
chore(deps): bump drizzle-orm to ^0.46.1
build(infra): drop prisma generate step from Dockerfile
ci(repo): add type-check + lint gate to the PR workflow
style(web): apply tailwind utility ordering pass
```

### Breaking change with `!`

```
feat(api)!: rename users.list response shape

response.users renamed to response.items, response.total renamed to response.count.
```

### Breaking change with footer

```
refactor(db): migrate from Prisma to Drizzle ORM

Drizzle ships first-class pgvector support and a smaller runtime
footprint, covering both classic CRUD and AI/RAG workloads.

BREAKING CHANGE: @stackit/db no longer exports PrismaClient. Consumers
must use DatabaseClient from @stackit/db and import query helpers (eq,
sql, desc) from drizzle-orm directly.
```

### Revert

```
revert: feat(api): add /v1/projects routes with pagination

This reverts commit 1a2b3c4d5e — the route depends on a projects table
that hasn't been migrated yet.
```

## Quick reference card

```
<type>(<scope>): <imperative description, ≤ 72 chars, no period>

<body wrapped at ~72 cols — explain why, not what>

<optional footers: BREAKING CHANGE / Closes #N / Reviewed-by:>
```

Types: `feat fix refactor perf docs test build ci chore style revert`

Scopes: `api web db auth cache validations types helpers config infra repo deps docs tooling`

Breaking: `<type>(<scope>)!:` or `BREAKING CHANGE:` footer.

## Why these rules

- **Conventional Commits** gives us automated changelogs, semver bumps, and consistent history.
- **Monorepo scopes** let `git log --grep` find every change to a package in one filter.
- **One scope per commit** keeps `git bisect` precise and PR diffs reviewable.
- **No Claude attribution** keeps history attributed to the humans who own the change.

The full specification is at [conventionalcommits.org/en/v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/).
