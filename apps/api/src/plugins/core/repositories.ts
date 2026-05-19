import fp from 'fastify-plugin'
import { createUsersRepository } from '../../modules/users/users.repository.js'

export default fp(async (fastify) => {
  fastify.decorate('usersRepository', createUsersRepository(fastify.db))
}, { name: 'repositories', dependencies: ['db'] })
