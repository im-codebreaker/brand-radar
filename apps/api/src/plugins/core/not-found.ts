import fp from 'fastify-plugin'

export default fp(async (fastify) => {
  fastify.setNotFoundHandler({
    preHandler: fastify.rateLimit({ max: 3, timeWindow: 500 }),
  }, (_request, reply) => {
    return reply.code(404).send({ message: 'Not Found' })
  })
}, { name: 'not-found', dependencies: ['rate-limit'] })
