import { PrismaPg } from '@prisma/adapter-pg'
import { Prisma, PrismaClient } from '../generated/prisma/client.js'

export interface DatabaseConfig {
  url: string
}

export function createDatabaseClient(config: DatabaseConfig): PrismaClient {
  const adapter = new PrismaPg({ connectionString: config.url })
  return new PrismaClient({ adapter })
}

export { Prisma, PrismaClient }
export type { User } from '../generated/prisma/client.js'
