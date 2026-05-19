import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import autoLoad from '@fastify/autoload'
import fastify from 'fastify'
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod'
import { fastifyOptions } from './config/server.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export async function build(opts: Record<string, unknown> = {}) {
  const app = fastify({ ...fastifyOptions, ...opts }).withTypeProvider<ZodTypeProvider>()

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  // Make Zod transform available to swagger plugin via decorator
  app.decorate('jsonSchemaTransform', jsonSchemaTransform)

  await app.register(autoLoad, {
    dir: join(__dirname, 'plugins/external'),
  })

  await app.register(autoLoad, {
    dir: join(__dirname, 'plugins/core'),
  })

  await app.register(autoLoad, {
    dir: join(__dirname, 'modules'),
    indexPattern: /.*routes\.(ts|js|cjs|mjs)$/,
    autoHooks: true,
    cascadeHooks: true,
    options: { prefix: '/api/v1' },
  })

  await app.register(autoLoad, {
    dir: join(__dirname, 'routes'),
    options: { prefix: '/api/v1' },
  })

  return app
}
