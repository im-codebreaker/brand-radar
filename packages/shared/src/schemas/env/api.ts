import { z } from 'zod'
import { LogLevelSchema, NodeEnvSchema, PortSchema } from './shared.js'

export const apiEnvSchema = z.object({
  // Runtime
  NODE_ENV: NodeEnvSchema.default('development'),
  LOG_LEVEL: LogLevelSchema.default('info'),

  // Server
  API_HOST: z.string().default('0.0.0.0'),
  API_PORT: PortSchema.default(3000),
  BASE_URL: z.string().min(1).default('http://localhost'),
  CLOSE_GRACE_DELAY: z.coerce.number().int().nonnegative().default(1000),

  // Database (required)
  DATABASE_URL: z.string().min(1),

  // Security
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  FRONTEND_URL: z.string().min(1).default('http://localhost'),

  // Redis (optional — pruned by setup if Redis declined)
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: PortSchema.default(6379),

  // Better Auth (optional — pruned by setup if auth declined)
  BETTER_AUTH_SECRET: z.string().min(16).default('change-me-in-production-please'),
  BETTER_AUTH_URL: z.string().min(1).default('http://localhost'),
  OAUTH_GITHUB_ID: z.string().optional(),
  OAUTH_GITHUB_SECRET: z.string().optional(),
  OAUTH_GOOGLE_ID: z.string().optional(),
  OAUTH_GOOGLE_SECRET: z.string().optional(),
})

export type ApiEnv = z.infer<typeof apiEnvSchema>

export { LogLevelSchema, type NodeEnv, NodeEnvSchema, PortSchema } from './shared.js'
