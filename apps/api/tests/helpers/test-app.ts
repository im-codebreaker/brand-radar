import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import fastify from 'fastify'
import {
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod'

import errorHandler from '../../src/plugins/app/error-handler.js'
import healthRoute from '../../src/routes/health.js'

/**
 * Minimal test app — registers only what each test needs.
 * Bypasses @fastify/autoload (which uses dynamic absolute-path imports
 * that don't play well with Vitest + NodeNext .js extensions).
 *
 * Add plugins here as your tests grow.
 */
export async function buildTestApp(): Promise<FastifyInstance> {
  const app = fastify({ logger: false }).withTypeProvider<ZodTypeProvider>()
  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  await app.register(errorHandler)
  await app.register(healthRoute, { prefix: '/api/v1/health' })

  await app.ready()
  return app
}
