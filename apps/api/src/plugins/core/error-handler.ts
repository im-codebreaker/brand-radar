import type { FastifyError } from 'fastify'
import fp from 'fastify-plugin'
import { hasZodFastifySchemaValidationErrors, isResponseSerializationError } from 'fastify-type-provider-zod'
import { DomainError } from '../../lib/errors.js'

export default fp(async (fastify) => {
  fastify.setErrorHandler((rawErr, request, reply) => {
    const err = rawErr as FastifyError

    // Domain errors (business logic errors with status codes)
    if (err instanceof DomainError) {
      return reply.code(err.statusCode).send({
        message: err.message,
      })
    }

    if (hasZodFastifySchemaValidationErrors(err)) {
      return reply.code(400).send({
        message: 'Request validation failed',
        details: err.validation,
      })
    }

    if (isResponseSerializationError(err)) {
      fastify.log.error({ err }, 'Response serialization failed')
      return reply.code(500).send({ message: 'Internal Server Error' })
    }

    fastify.log.error({
      err,
      request: { method: request.method, url: request.url, params: request.params },
    }, 'Unhandled error')

    const statusCode = err.statusCode ?? 500
    const message = statusCode < 500 ? err.message : 'Internal Server Error'
    return reply.code(statusCode).send({ message })
  })
}, { name: 'error-handler' })
