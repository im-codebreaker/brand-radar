import helmet from '@fastify/helmet'
import fp from 'fastify-plugin'

export default fp(async (fastify) => {
  await fastify.register(helmet, {
    contentSecurityPolicy: false,
  })
}, { name: 'helmet' })
