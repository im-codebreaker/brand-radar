import { createDatabaseClient } from '@stackit/db'
import fp from 'fastify-plugin'
import { env } from '../../config/env.js'

export default fp(async (fastify) => {
  const db = createDatabaseClient({ url: env.DATABASE_URL })

  fastify.decorate('db', db)

  fastify.addHook('onClose', async () => {
    await db.$disconnect()
  })
}, { name: 'prisma' })
