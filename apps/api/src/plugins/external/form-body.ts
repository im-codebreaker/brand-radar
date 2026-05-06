import formBody from '@fastify/formbody'
import fp from 'fastify-plugin'

export default fp(async (fastify) => {
  await fastify.register(formBody)
}, { name: 'form-body' })
