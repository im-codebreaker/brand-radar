import type { FastifyReply, FastifyRequest } from 'fastify'
import * as schemas from '@brand-radar/shared/schemas'
import type { UsersService } from './users.service.js'

type CreateUserInput = schemas.users.CreateUserInput
type UpdateUserInput = schemas.users.UpdateUserInput

export function createUserHandlers(service: UsersService) {
  return {
    async list(request: FastifyRequest<{ Querystring: { page: number, limit: number } }>) {
      const { users, total } = await service.listUsers(request.query)
      return { users, total }
    },

    async getById(
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply,
    ) {
      const user = await service.getUserById(request.params.id)
      return { user }
    },

    async create(
      request: FastifyRequest<{ Body: CreateUserInput }>,
      reply: FastifyReply,
    ) {
      const user = await service.createUser(request.body)
      return reply.code(201).send({ user })
    },

    async update(
      request: FastifyRequest<{ Params: { id: string }, Body: UpdateUserInput }>,
      reply: FastifyReply,
    ) {
      const user = await service.updateUser(request.params.id, request.body)
      return { user }
    },

    async delete(
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply,
    ) {
      await service.deleteUser(request.params.id)
      return reply.code(204).send()
    },
  }
}
