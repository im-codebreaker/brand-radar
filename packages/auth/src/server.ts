import type { PrismaClient } from '@stackit/db'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'

export interface AuthConfig {
  db: PrismaClient
  baseURL: string
  secret: string
  trustedOrigins?: string[]
  socialProviders?: Parameters<typeof betterAuth>[0]['socialProviders']
}

export function createAuth(config: AuthConfig) {
  return betterAuth({
    database: prismaAdapter(config.db, { provider: 'postgresql' }),
    baseURL: config.baseURL,
    secret: config.secret,
    trustedOrigins: config.trustedOrigins,
    emailAndPassword: {
      enabled: true,
    },
    socialProviders: config.socialProviders,
  })
}
