import type { DatabaseClient } from '@brand-radar/db'
import { accounts, sessions, users, verifications } from '@brand-radar/db'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { fromNodeHeaders } from 'better-auth/node'

export interface AuthConfig {
  db: DatabaseClient
  baseURL: string
  secret: string
  trustedOrigins?: string[]
  socialProviders?: Parameters<typeof betterAuth>[0]['socialProviders']
}

export function createAuth(config: AuthConfig) {
  return betterAuth({
    database: drizzleAdapter(config.db, {
      provider: 'pg',
      schema: {
        user: users,
        session: sessions,
        account: accounts,
        verification: verifications,
      },
    }),
    baseURL: config.baseURL,
    secret: config.secret,
    trustedOrigins: config.trustedOrigins,
    emailAndPassword: {
      enabled: true,
    },
    socialProviders: config.socialProviders,
  })
}

/**
 * Convert Fastify/Node.js headers to Web API Headers
 * @param headers - Fastify IncomingHttpHeaders
 * @returns Web API Headers instance
 */
export function fastifyHeadersToWebHeaders(
  headers: Record<string, string | string[] | undefined>,
): Headers {
  return fromNodeHeaders(headers)
}
