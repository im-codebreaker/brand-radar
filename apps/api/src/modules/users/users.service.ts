import * as schemas from '@brand-radar/shared/schemas'
import { ConflictError, NotFoundError } from '../../lib/errors.js'
import type { UsersRepository } from './users.repository.js'

type CreateUserInput = schemas.users.CreateUserInput
type UpdateUserInput = schemas.users.UpdateUserInput

/**
 * Users Service - Business Logic Layer
 *
 * Encapsulates business rules and orchestrates repository calls.
 * Throws domain errors (NotFoundError, ConflictError) instead of HTTP responses.
 */
export function createUsersService(repo: UsersRepository) {
  return {
    /**
     * List users with pagination
     */
    async listUsers(opts: { page: number, limit: number }) {
      return repo.list(opts)
    },

    /**
     * Get user by ID
     * @throws {NotFoundError} if user doesn't exist
     */
    async getUserById(id: string) {
      const user = await repo.findById(id)
      if (!user) {
        throw new NotFoundError('User not found')
      }
      return user
    },

    /**
     * Create a new user
     * @throws {ConflictError} if email is already in use
     */
    async createUser(data: CreateUserInput) {
      // Business rule: email must be unique
      const existing = await repo.findByEmail(data.email)
      if (existing) {
        throw new ConflictError('Email already in use')
      }

      return repo.create(data)
    },

    /**
     * Update an existing user
     * @throws {NotFoundError} if user doesn't exist
     */
    async updateUser(id: string, data: UpdateUserInput) {
      // Business rule: user must exist to be updated
      const existing = await repo.findById(id)
      if (!existing) {
        throw new NotFoundError('User not found')
      }

      return repo.update(id, data)
    },

    /**
     * Delete a user
     * @throws {NotFoundError} if user doesn't exist
     */
    async deleteUser(id: string) {
      // Business rule: user must exist to be deleted
      const existing = await repo.findById(id)
      if (!existing) {
        throw new NotFoundError('User not found')
      }

      await repo.delete(id)
    },
  }
}

export type UsersService = ReturnType<typeof createUsersService>
