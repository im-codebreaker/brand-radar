// OPTIONAL — pruned by `pnpm setup` if better-auth declined.
import { createAuth } from '@brand-radar/auth'
import { createDatabaseClient } from '@brand-radar/db'
import { env } from '../config/env.js'

const db = createDatabaseClient({ url: env.DATABASE_URL })

export const auth = createAuth({
  db,
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.FRONTEND_URL],
  socialProviders: {
    ...(env.OAUTH_GITHUB_ID && env.OAUTH_GITHUB_SECRET
      ? { github: { clientId: env.OAUTH_GITHUB_ID, clientSecret: env.OAUTH_GITHUB_SECRET } }
      : {}),
    ...(env.OAUTH_GOOGLE_ID && env.OAUTH_GOOGLE_SECRET
      ? { google: { clientId: env.OAUTH_GOOGLE_ID, clientSecret: env.OAUTH_GOOGLE_SECRET } }
      : {}),
  },
})
