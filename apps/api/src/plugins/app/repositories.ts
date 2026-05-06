import fp from 'fastify-plugin'
import { createUsersRepository } from '../../repositories/users.js'

export default fp(async (fastify) => {
  fastify.decorate('usersRepository', createUsersRepository(fastify.db))
}, { name: 'repositories', dependencies: ['prisma'] })
