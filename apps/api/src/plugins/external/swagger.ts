import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import fp from 'fastify-plugin'
import { jsonSchemaTransform } from 'fastify-type-provider-zod'

export default fp(async (fastify) => {
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'stackit API',
        description: 'Minimal full-stack starter — Vue 3 + Fastify + Drizzle',
        version: '0.1.0',
      },
      servers: [{ url: '/api/v1' }],
    },
    transform: jsonSchemaTransform,
  })

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
  })
}, { name: 'swagger' })
