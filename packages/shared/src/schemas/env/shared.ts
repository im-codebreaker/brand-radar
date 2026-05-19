import { z } from 'zod'

export const NodeEnvSchema = z.enum(['development', 'production', 'test'])
export type NodeEnv = z.infer<typeof NodeEnvSchema>

export const PortSchema = z.coerce.number().int().min(1).max(65535)
export const LogLevelSchema = z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
