import process from 'node:process'
import { env } from './env.js'

function buildLoggerOptions() {
  if (process.stdout.isTTY) {
    return {
      level: env.LOG_LEVEL,
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
    }
  }
  return { level: env.LOG_LEVEL }
}

export const fastifyOptions = {
  logger: buildLoggerOptions(),
  connectionTimeout: 120_000,
  requestTimeout: 60_000,
  keepAliveTimeout: 10_000,
  ajv: {
    customOptions: {
      coerceTypes: 'array' as const,
      removeAdditional: 'all' as const,
    },
  },
}
