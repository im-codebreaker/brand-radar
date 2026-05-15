import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema/index.js'

export interface DatabaseConfig {
  url: string
}

export function createDatabaseClient(config: DatabaseConfig) {
  const queryClient = postgres(config.url)
  const db = drizzle(queryClient, { schema, casing: 'snake_case' })

  return Object.assign(db, {
    $disconnect: () => queryClient.end(),
  })
}

export type DatabaseClient = ReturnType<typeof createDatabaseClient>
export type DatabaseTx = Parameters<Parameters<DatabaseClient['transaction']>[0]>[0]
export type DbClient = DatabaseClient | DatabaseTx
