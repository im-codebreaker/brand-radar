import type { FastifyPluginAsync } from 'fastify'
import { fastifyHeadersToWebHeaders } from '@brand-radar/auth'

const plugin: FastifyPluginAsync = async (fastify) => {
  fastify.route({
    method: ['GET', 'POST'],
    url: '/*',
    async handler(request, reply) {
      try {
        // Construct request URL
        const url = new URL(request.url, `http://${request.headers.host}`)
        fastify.log.info({ url: url.toString(), env: process.env }, 'Processing auth request')

        // Convert Fastify headers to standard Headers object
        const headers = fastifyHeadersToWebHeaders(request.headers)
        // Create Fetch API-compatible request
        const req = new Request(url.toString(), {
          method: request.method,
          headers,
          ...(request.body ? { body: JSON.stringify(request.body) } : {}),
        })
        // Process authentication request
        const response = await fastify.auth.handler(req)
        // Forward response to client
        reply.status(response.status)
        response.headers.forEach((value, key) => reply.header(key, value))
        return reply.send(response.body ? await response.text() : null)
      }
      catch (error) {
        fastify.log.error({ err: error }, 'Authentication Error')
        return reply.status(500).send({
          error: 'Internal authentication error',
          code: 'AUTH_FAILURE',
        })
      }
    },
  })
}

export default plugin
export const autoPrefix = '/auth'
