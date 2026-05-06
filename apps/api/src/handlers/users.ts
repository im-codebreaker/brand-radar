import type { CreateUserInput, UpdateUserInput } from '@stackit/validations/users/requests'
import type { FastifyReply, FastifyRequest } from 'fastify'
import type { createUsersRepository } from '../repositories/users.js'

export function createUserHandlers(repo: ReturnType<typeof createUsersRepository>) {
  return {
    async list(request: FastifyRequest<{ Querystring: { page: number, limit: number } }>) {
      const { users, total } = await repo.list(request.query)
      return { users, total }
    },

    async getById(
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply,
    ) {
      const user = await repo.findById(request.params.id)
      if (!user)
        return reply.code(404).send({ message: 'User not found' })
      return { user }
    },

    async create(
      request: FastifyRequest<{ Body: CreateUserInput }>,
      reply: FastifyReply,
    ) {
      const existing = await repo.findByEmail(request.body.email)
      if (existing)
        return reply.code(400).send({ message: 'Email already in use' })

      const user = await repo.create(request.body)
      return reply.code(201).send({ user })
    },

    async update(
      request: FastifyRequest<{ Params: { id: string }, Body: UpdateUserInput }>,
      reply: FastifyReply,
    ) {
      const existing = await repo.findById(request.params.id)
      if (!existing)
        return reply.code(404).send({ message: 'User not found' })

      const user = await repo.update(request.params.id, request.body)
      return { user }
    },

    async delete(
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply,
    ) {
      const existing = await repo.findById(request.params.id)
      if (!existing)
        return reply.code(404).send({ message: 'User not found' })

      await repo.delete(request.params.id)
      return reply.code(204).send()
    },
  }
}
