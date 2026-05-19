import process from 'node:process'
import { env as envSchemas } from '@brand-radar/shared/schemas'

const { apiEnvSchema } = envSchemas

const parsed = apiEnvSchema.safeParse(process.env)

if (!parsed.success) {
  const message = parsed.error.issues
    .map(i => `  • ${i.path.join('.') || '(root)'}: ${i.message}`)
    .join('\n')
  console.error(`❌ Invalid environment variables:\n${message}`)
  throw new Error('Invalid environment variables')
}

export const env = parsed.data
export type Env = typeof env
