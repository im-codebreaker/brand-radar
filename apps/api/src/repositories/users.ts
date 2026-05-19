import type { DatabaseClient, DbClient, User } from '@brand-radar/db'
import * as schemas from '@brand-radar/shared/schemas'
import { users } from '@brand-radar/db'
import { eq, sql } from 'drizzle-orm'

type CreateUserInput = schemas.users.CreateUserInput
type UpdateUserInput = schemas.users.UpdateUserInput

export function createUsersRepository(db: DatabaseClient) {
  return {
    async list(opts: { page: number, limit: number }, tx?: DbClient) {
      const client = tx ?? db
      const offset = (opts.page - 1) * opts.limit

      const [rows, totals] = await Promise.all([
        client.query.users.findMany({
          orderBy: (u, { desc }) => desc(u.createdAt),
          limit: opts.limit,
          offset,
        }),
        client.select({ count: sql<number>`count(*)::int` }).from(users),
      ])

      return { users: rows, total: totals[0]?.count ?? 0 }
    },

    async findById(id: string, tx?: DbClient): Promise<User | undefined> {
      const client = tx ?? db
      return client.query.users.findFirst({ where: eq(users.id, id) })
    },

    async findByEmail(email: string, tx?: DbClient): Promise<User | undefined> {
      const client = tx ?? db
      return client.query.users.findFirst({ where: eq(users.email, email) })
    },

    async create(data: CreateUserInput, tx?: DbClient): Promise<User> {
      const client = tx ?? db
      const [row] = await client.insert(users).values(data).returning()
      if (!row)
        throw new Error('Failed to create user')
      return row
    },

    async update(id: string, data: UpdateUserInput, tx?: DbClient): Promise<User> {
      const client = tx ?? db
      const [row] = await client.update(users).set(data).where(eq(users.id, id)).returning()
      if (!row)
        throw new Error(`User ${id} not found`)
      return row
    },

    async delete(id: string, tx?: DbClient): Promise<User> {
      const client = tx ?? db
      const [row] = await client.delete(users).where(eq(users.id, id)).returning()
      if (!row)
        throw new Error(`User ${id} not found`)
      return row
    },
  }
}
