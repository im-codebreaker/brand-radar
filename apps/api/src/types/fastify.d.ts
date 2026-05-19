/* eslint-disable perfectionist/sort-imports */
// Import order is load-bearing: REDIS_AUGMENT / AUTH_AUGMENT marker blocks
// are removed independently by `pnpm setup` if those modules are declined.
import type { DatabaseClient } from '@brand-radar/db'
import type { createUsersRepository } from '../repositories/users.js'
// REDIS_AUGMENT_START
import type { RedisClientType } from '@brand-radar/redis'
// REDIS_AUGMENT_END
// AUTH_AUGMENT_START
import type { createAuth } from '@brand-radar/auth'
// AUTH_AUGMENT_END

declare module 'fastify' {
  interface FastifyInstance {
    db: DatabaseClient
    usersRepository: ReturnType<typeof createUsersRepository>

    // REDIS_DECORATOR_START
    cache: RedisClientType
    // REDIS_DECORATOR_END

    // AUTH_DECORATOR_START
    auth: ReturnType<typeof createAuth>
    // AUTH_DECORATOR_END
  }

  interface FastifyRequest {
    // AUTH_REQUEST_START
    userId?: string
    session?: { userId: string, [key: string]: unknown } | null
    // AUTH_REQUEST_END
  }
}

export {}
