import type { FastifyInstance } from 'fastify'

// OPTIONAL behavior — when better-auth is enabled, this hook gates non-public routes.
// `pnpm setup` rewrites this file to a no-op when auth is declined.
export default async function (fastify: FastifyInstance) {
  fastify.addHook('onRequest', async (request, reply) => {
    const url = request.url

    // Public endpoints
    if (
      url.startsWith('/api/v1/health')
      || url.startsWith('/api/v1/auth')
      || url.startsWith('/docs')
    ) {
      return
    }

    if (!request.session)
      return reply.code(401).send({ message: 'Unauthorized' })
  })
}
