// OPTIONAL — pruned by `pnpm setup` if better-auth declined.
// Mounts the better-auth catch-all handler at /api/v1/auth/*
import type { FastifyPluginAsync } from 'fastify'

const plugin: FastifyPluginAsync = async (fastify) => {
  fastify.route({
    method: ['GET', 'POST'],
    url: '/*',
    schema: { hide: true },
    async handler(request, reply) {
      const url = new URL(request.url, `http://${request.headers.host}`)
      const headers = new Headers()
      for (const [key, value] of Object.entries(request.headers)) {
        if (typeof value === 'string')
          headers.set(key, value)
        else if (Array.isArray(value))
          headers.set(key, value.join(','))
      }

      const req = new Request(url, {
        method: request.method,
        headers,
        body: ['GET', 'HEAD'].includes(request.method) ? undefined : JSON.stringify(request.body),
      })

      const response = await fastify.auth.handler(req)

      reply.status(response.status)
      response.headers.forEach((value, key) => reply.header(key, value))
      reply.send(response.body ? await response.text() : null)
    },
  })
}

export default plugin
export const autoPrefix = '/auth'
