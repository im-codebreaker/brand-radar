import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { users } from '@brand-radar/shared/schemas'
import { createUserHandlers } from './users.handlers.js'
import { createUsersService } from './users.service.js'

/**
 * Users Module Routes
 *
 * Registers all user-related endpoints under /users prefix.
 * Uses service layer for business logic.
 */
const plugin: FastifyPluginAsyncZod = async (fastify) => {
  // Create service from repository (injected via plugin)
  const service = createUsersService(fastify.usersRepository)

  // Create handlers from service
  const handlers = createUserHandlers(service)

  // Register routes with Zod validation
  fastify.get('/', { schema: users.routes.listUsersRoute }, handlers.list)
  fastify.get('/:id', { schema: users.routes.getUserRoute }, handlers.getById)
  fastify.post('/', { schema: users.routes.createUserRoute }, handlers.create)
  fastify.patch('/:id', { schema: users.routes.updateUserRoute }, handlers.update)
  fastify.delete('/:id', { schema: users.routes.deleteUserRoute }, handlers.delete)
}

export default plugin
export const autoPrefix = '/users'
