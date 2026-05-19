import type * as schemas from '@brand-radar/shared/schemas'
import type { UsersRepository } from './users.repository.js'
import { ConflictError, NotFoundError } from '../../lib/errors.js'

type CreateUserInput = schemas.users.CreateUserInput
type UpdateUserInput = schemas.users.UpdateUserInput

export function createUsersService(repo: UsersRepository) {
  return {
    async listUsers(opts: { page: number, limit: number }) {
      return repo.list(opts)
    },

    async getUserById(id: string) {
      const user = await repo.findById(id)
      if (!user) {
        throw new NotFoundError('User not found')
      }
      return user
    },

    async createUser(data: CreateUserInput) {
      const existing = await repo.findByEmail(data.email)
      if (existing) {
        throw new ConflictError('Email already in use')
      }

      return repo.create(data)
    },

    async updateUser(id: string, data: UpdateUserInput) {
      const existing = await repo.findById(id)
      if (!existing) {
        throw new NotFoundError('User not found')
      }

      return repo.update(id, data)
    },

    async deleteUser(id: string) {
      const existing = await repo.findById(id)
      if (!existing) {
        throw new NotFoundError('User not found')
      }

      await repo.delete(id)
    },
  }
}

export type UsersService = ReturnType<typeof createUsersService>
