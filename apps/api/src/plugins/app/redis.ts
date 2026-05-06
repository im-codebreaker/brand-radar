// OPTIONAL — pruned by `pnpm setup` if Redis declined.
import { createCacheClient } from '@stackit/cache'
import fp from 'fastify-plugin'
import { env } from '../../config/env.js'

export default fp(async (fastify) => {
  const cache = createCacheClient({ host: env.REDIS_HOST, port: env.REDIS_PORT })

  // Connect in the background — don't block server startup.
  // Commands queued before connection complete; failures surface via the `error` listener.
  cache.connect().catch((err) => {
    fastify.log.warn({ err }, 'redis connection failed; cache operations will fail until reconnected')
  })

  fastify.decorate('cache', cache)

  fastify.addHook('onClose', async () => {
    if (cache.isOpen)
      await cache.quit()
  })
}, { name: 'redis' })
