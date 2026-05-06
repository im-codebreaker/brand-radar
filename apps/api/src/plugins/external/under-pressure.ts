import underPressure from '@fastify/under-pressure'
import fp from 'fastify-plugin'

export default fp(async (fastify) => {
  await fastify.register(underPressure, {
    maxEventLoopDelay: 1000,
    maxHeapUsedBytes: 1_000_000_000,
    maxRssBytes: 1_000_000_000,
    retryAfter: 50,
  })
}, { name: 'under-pressure' })
