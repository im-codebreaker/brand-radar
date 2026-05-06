// OPTIONAL — pruned by `pnpm setup` if better-auth declined.
import fp from 'fastify-plugin'
import { auth } from '../../lib/auth.js'

export default fp(async (fastify) => {
  fastify.decorate('auth', auth)

  fastify.addHook('onRequest', async (request) => {
    const headers = new Headers()
    for (const [key, value] of Object.entries(request.headers)) {
      if (typeof value === 'string')
        headers.set(key, value)
      else if (Array.isArray(value))
        headers.set(key, value.join(','))
    }

    const session = await auth.api.getSession({ headers })
    request.session = session?.session ?? null
    request.userId = session?.user?.id
  })
}, { name: 'auth', dependencies: ['prisma'] })
