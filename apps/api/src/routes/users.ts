import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { users } from '@brand-radar/validations'
import { createUserHandlers } from '../handlers/users.js'

const plugin: FastifyPluginAsyncZod = async (fastify) => {
  const handlers = createUserHandlers(fastify.usersRepository)

  fastify.get('/', { schema: users.routes.listUsersRoute }, handlers.list)
  fastify.get('/:id', { schema: users.routes.getUserRoute }, handlers.getById)
  fastify.post('/', { schema: users.routes.createUserRoute }, handlers.create)
  fastify.patch('/:id', { schema: users.routes.updateUserRoute }, handlers.update)
  fastify.delete('/:id', { schema: users.routes.deleteUserRoute }, handlers.delete)
}

export default plugin
export const autoPrefix = '/users'
