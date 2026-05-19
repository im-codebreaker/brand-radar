import type { createAuth } from '@brand-radar/auth'
import type { DatabaseClient } from '@brand-radar/db'
import type { RedisClientType } from '@brand-radar/redis'
import type { createUsersRepository } from '../modules/users/users.repository.js'

declare module 'fastify' {
  interface FastifyInstance {
    db: DatabaseClient
    usersRepository: ReturnType<typeof createUsersRepository>
    cache: RedisClientType
    auth: ReturnType<typeof createAuth>
  }

  interface FastifyRequest {
    userId?: string
    session?: { userId: string, [key: string]: unknown } | null
  }
}

export {}
