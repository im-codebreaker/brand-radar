import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import process from 'node:process'
import { z } from '@brand-radar/shared/schemas'

const HealthResponseSchema = z.object({
  status: z.literal('ok'),
  uptime: z.number(),
  timestamp: z.iso.datetime(),
})

const plugin: FastifyPluginAsyncZod = async (fastify) => {
  fastify.get('/', {
    schema: {
      response: { 200: HealthResponseSchema },
      tags: ['Health'],
    },
  }, async () => ({
    status: 'ok' as const,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  }))
}

export default plugin
export const autoPrefix = '/health'
