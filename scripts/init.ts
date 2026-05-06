/**
 * stackit setup — interactive scaffolding.
 *
 * Run once after `git clone && pnpm install`:
 *   pnpm setup
 *
 * Prompts for optional modules (Redis, better-auth) and project naming,
 * then prunes opted-out files, removes their dependencies, edits
 * docker-compose / .env / Prisma schema, and finally deletes itself.
 *
 * The pruning manifest is declarative — see MODULES below. Each module
 * lists files to remove and edits to perform across the repo. Because
 * Fastify autoload picks up plugins by directory scan, deleting a plugin
 * file IS the wiring change. The script does not need to edit app.ts.
 */
import * as p from '@clack/prompts'
import { execSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import YAML from 'yaml'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

interface ModuleSpec {
  files: string[]
  pkgRemovals?: { file: string, deps: string[] }[]
  envKeysToRemove?: string[]
  composeServicesToRemove?: string[]
  /** `// MARKER_START` … `// MARKER_END` blocks to delete (works for TS, Vue, Prisma) */
  markedBlocks?: { file: string, marker: string }[]
  rewriteFiles?: { file: string, content: string }[]
}

const NOOP_AUTOHOOK = `import type { FastifyInstance } from 'fastify'

// All routes are public. Add auth gating here when you wire authentication.
export default async function (_fastify: FastifyInstance) {}
`

const MODULES: Record<'redis' | 'auth', ModuleSpec> = {
  redis: {
    files: [
      'packages/cache',
      'apps/api/src/plugins/app/redis.ts',
    ],
    pkgRemovals: [
      { file: 'apps/api/package.json', deps: ['@stackit/cache'] },
    ],
    envKeysToRemove: ['REDIS_HOST', 'REDIS_PORT'],
    composeServicesToRemove: ['redis'],
    markedBlocks: [
      { file: 'apps/api/src/types/fastify.d.ts', marker: 'REDIS_AUGMENT' },
      { file: 'apps/api/src/types/fastify.d.ts', marker: 'REDIS_DECORATOR' },
    ],
  },
  auth: {
    files: [
      'packages/auth',
      'apps/api/src/plugins/app/auth.ts',
      'apps/api/src/lib/auth.ts',
      'apps/api/src/routes/auth.ts',
      'packages/db/prisma/models/auth.prisma',
      'apps/web/src/lib/auth-client.ts',
      'apps/web/src/views/LoginView.vue',
      'apps/web/src/stores/auth.ts',
    ],
    pkgRemovals: [
      { file: 'apps/api/package.json', deps: ['@stackit/auth', 'better-auth'] },
      { file: 'apps/web/package.json', deps: ['@stackit/auth', 'better-auth'] },
    ],
    envKeysToRemove: [
      'BETTER_AUTH_SECRET',
      'BETTER_AUTH_URL',
      'OAUTH_GITHUB_ID',
      'OAUTH_GITHUB_SECRET',
      'OAUTH_GOOGLE_ID',
      'OAUTH_GOOGLE_SECRET',
    ],
    markedBlocks: [
      { file: 'packages/db/prisma/models/user.prisma', marker: 'BETTER_AUTH_RELATIONS' },
      { file: 'apps/web/src/router/index.ts', marker: 'AUTH_ROUTES' },
      { file: 'apps/api/src/types/fastify.d.ts', marker: 'AUTH_AUGMENT' },
      { file: 'apps/api/src/types/fastify.d.ts', marker: 'AUTH_DECORATOR' },
      { file: 'apps/api/src/types/fastify.d.ts', marker: 'AUTH_REQUEST' },
    ],
    rewriteFiles: [
      { file: 'apps/api/src/routes/autohooks.ts', content: NOOP_AUTOHOOK },
    ],
  },
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T
}

function writeJson(path: string, data: unknown) {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`)
}

function rimraf(path: string) {
  if (existsSync(path))
    rmSync(path, { recursive: true, force: true })
}

function removeDeps(pkgPath: string, deps: string[]) {
  if (!existsSync(pkgPath))
    return
  const pkg = readJson<{ dependencies?: Record<string, string>, devDependencies?: Record<string, string> }>(pkgPath)
  for (const d of deps) {
    if (pkg.dependencies?.[d])
      delete pkg.dependencies[d]
    if (pkg.devDependencies?.[d])
      delete pkg.devDependencies[d]
  }
  writeJson(pkgPath, pkg)
}

function removeEnvKeys(envPath: string, keys: string[]) {
  if (!existsSync(envPath))
    return
  const lines = readFileSync(envPath, 'utf8').split('\n')
  const filtered = lines.filter(line => !keys.some(k => line.startsWith(`${k}=`)))
  writeFileSync(envPath, filtered.join('\n'))
}

function removeComposeServices(composePath: string, services: string[]) {
  if (!existsSync(composePath))
    return
  const doc = YAML.parseDocument(readFileSync(composePath, 'utf8'))
  const svc = doc.get('services') as YAML.YAMLMap | undefined
  if (!svc)
    return
  for (const name of services) {
    svc.delete(name)
    // Also strip from each remaining service's depends_on if present
    for (const item of svc.items) {
      const value = item.value as YAML.YAMLMap | null
      const dependsOn = value?.get('depends_on') as YAML.YAMLMap | undefined
      if (dependsOn?.has(name))
        dependsOn.delete(name)
    }
  }
  writeFileSync(composePath, doc.toString())
}

function removeMarkedBlock(filePath: string, marker: string) {
  if (!existsSync(filePath))
    return
  const content = readFileSync(filePath, 'utf8')
  const startRe = new RegExp(`^[ \\t]*//\\s*${marker}_START.*$\\n?`, 'm')
  const endRe = new RegExp(`^[ \\t]*//\\s*${marker}_END.*$\\n?`, 'm')
  const start = content.match(startRe)
  const end = content.match(endRe)
  if (!start || !end || start.index === undefined || end.index === undefined)
    return
  const before = content.slice(0, start.index)
  const after = content.slice(end.index + end[0].length)
  writeFileSync(filePath, before + after)
}

function renameProject(projectName: string) {
  if (projectName === 'stackit')
    return

  const namespace = projectName.startsWith('@') ? projectName : `@${projectName}`

  // Recursively replace @stackit/ across known package & ts files
  const targets = [
    'package.json',
    'pnpm-workspace.yaml',
    'docker-compose.yml',
    'Dockerfile',
    '.env.example',
    'README.md',
    ...findFiles(join(ROOT, 'apps'), /\.(json|ts|vue|mjs)$/),
    ...findFiles(join(ROOT, 'packages'), /\.(json|ts|mjs)$/),
  ]

  for (const file of targets) {
    if (!existsSync(file))
      continue
    const content = readFileSync(file, 'utf8')
    const replaced = content.replace(/@stackit\b/g, namespace).replace(/\bstackit\b/g, projectName.replace(/^@/, ''))
    if (replaced !== content)
      writeFileSync(file, replaced)
  }
}

function findFiles(dir: string, regex: RegExp): string[] {
  if (!existsSync(dir))
    return []
  const out: string[] = []
  const entries = readdirSync(dir, { withFileTypes: true })
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === '.git' || e.name === 'dist' || e.name === 'build' || e.name === 'generated')
      continue
    const full = join(dir, e.name)
    if (e.isDirectory())
      out.push(...findFiles(full, regex))
    else if (regex.test(e.name))
      out.push(full)
  }
  return out
}

async function applyModule(name: 'redis' | 'auth') {
  const spec = MODULES[name]

  for (const f of spec.files)
    rimraf(join(ROOT, f))

  for (const r of spec.pkgRemovals ?? [])
    removeDeps(join(ROOT, r.file), r.deps)

  if (spec.envKeysToRemove?.length) {
    removeEnvKeys(join(ROOT, '.env.example'), spec.envKeysToRemove)
    removeEnvKeys(join(ROOT, 'apps/api/.env.example'), spec.envKeysToRemove)
  }

  for (const s of spec.composeServicesToRemove ?? [])
    removeComposeServices(join(ROOT, 'docker-compose.yml'), [s])

  for (const b of spec.markedBlocks ?? [])
    removeMarkedBlock(join(ROOT, b.file), b.marker)

  for (const w of spec.rewriteFiles ?? [])
    writeFileSync(join(ROOT, w.file), w.content)
}

function selfDelete() {
  const rootPkgPath = join(ROOT, 'package.json')
  const pkg = readJson<{ scripts?: Record<string, string>, devDependencies?: Record<string, string> }>(rootPkgPath)
  delete pkg.scripts?.setup
  delete pkg.devDependencies?.['@clack/prompts']
  delete pkg.devDependencies?.yaml
  writeJson(rootPkgPath, pkg)

  rimraf(join(ROOT, 'scripts'))
}

async function main() {
  console.clear()
  p.intro('  stackit setup ')

  if (!existsSync(join(ROOT, 'pnpm-workspace.yaml'))) {
    p.cancel('Run this from the stackit repo root.')
    process.exit(1)
  }

  const result = await p.group(
    {
      projectName: () => p.text({
        message: 'Project name (used for @scope/* package renaming)',
        placeholder: 'stackit',
        defaultValue: 'stackit',
        validate: (v) => {
          if (v && !/^[a-z][a-z0-9-]*$/.test(v))
            return 'Use lowercase letters, digits, and hyphens (kebab-case).'
        },
      }),
      useRedis: () => p.confirm({
        message: 'Include Redis cache (@stackit/cache)?',
        initialValue: true,
      }),
      useAuth: () => p.confirm({
        message: 'Include better-auth (@stackit/auth)?',
        initialValue: false,
      }),
      confirm: ({ results }) => p.confirm({
        message: `Apply: ${[
          results.useRedis ? 'redis' : 'no-redis',
          results.useAuth ? 'auth' : 'no-auth',
          `name=${results.projectName ?? 'stackit'}`,
        ].join(', ')}?`,
        initialValue: true,
      }),
    },
    { onCancel: () => { p.cancel('Setup cancelled.'); process.exit(0) } },
  )

  if (!result.confirm) {
    p.cancel('Setup cancelled.')
    process.exit(0)
  }

  const s = p.spinner()

  if (!result.useRedis) {
    s.start('Removing Redis…')
    await applyModule('redis')
    s.stop('Redis removed')
  }

  if (!result.useAuth) {
    s.start('Removing better-auth…')
    await applyModule('auth')
    s.stop('better-auth removed')
  }

  if (result.projectName && result.projectName !== 'stackit') {
    s.start(`Renaming @stackit/* → @${result.projectName}/*…`)
    renameProject(result.projectName)
    s.stop(`Renamed to @${result.projectName}/*`)
  }

  s.start('Cleaning up setup script…')
  selfDelete()
  s.stop('Setup script removed')

  s.start('Reinstalling dependencies…')
  try {
    execSync('pnpm install', { cwd: ROOT, stdio: 'inherit' })
    s.stop('Dependencies installed')
  }
  catch {
    s.stop('pnpm install failed — run it manually')
  }

  const composeInfra = `docker compose up -d postgres${result.useRedis ? ' redis' : ''}`
  p.note(
    [
      'Local dev (apps on host, infra in docker):',
      `  1. cp .env.example .env`,
      `  2. ${composeInfra}`,
      `  3. pnpm db:migrate`,
      `  4. pnpm db:seed`,
      `  5. pnpm dev               # api :3000, web :5173`,
      '',
      'Or full stack in docker (one command, hot-reload):',
      `  docker compose up --build --watch`,
      '',
      'Then open http://localhost (nginx proxies / → web, /api → api).',
    ].join('\n'),
    'Next steps',
  )

  p.outro('Done — happy stacking!')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
