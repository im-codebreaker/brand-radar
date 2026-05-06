import rateLimit from '@fastify/rate-limit'
import fp from 'fastify-plugin'
import { env } from '../../config/env.js'

export default fp(async (fastify) => {
  await fastify.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: '1 minute',
  })
}, { name: 'rate-limit' })
