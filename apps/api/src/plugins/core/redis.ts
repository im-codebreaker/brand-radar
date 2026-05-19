// OPTIONAL — pruned by `pnpm setup` if Redis declined.
import { createRedisClient } from '@brand-radar/redis'
import fp from 'fastify-plugin'
import { env } from '../../config/env.js'

export default fp(async (fastify) => {
  const cache = createRedisClient({ host: env.REDIS_HOST, port: env.REDIS_PORT })

  // Connect in the background — don't block server startup.
  // Commands queued before connection complete; failures surface via the `error` listener.
  cache.connect().catch((err) => {
    fastify.log.warn({ err }, 'redis connection failed; cache operations will fail until reconnected')
  })

  fastify.decorate('cache', cache)

  fastify.addHook('onClose', async () => {
    if (cache.status === 'ready')
      await cache.quit()
  })
}, { name: 'redis' })
