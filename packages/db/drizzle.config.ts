import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { config as loadEnv } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

// drizzle-kit runs from packages/db/, so dotenv's default cwd lookup misses
// the monorepo root. Resolve relative to this file instead.
loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env') })

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  casing: 'snake_case',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
})
