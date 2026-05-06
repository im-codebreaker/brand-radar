import type { Prisma, PrismaClient } from '@stackit/db'
import type { CreateUserInput, UpdateUserInput } from '@stackit/validations/users/requests'

export function createUsersRepository(db: PrismaClient) {
  return {
    async list(opts: { page: number, limit: number }, tx?: Prisma.TransactionClient) {
      const client = tx ?? db
      const skip = (opts.page - 1) * opts.limit
      const [users, total] = await Promise.all([
        client.user.findMany({ skip, take: opts.limit, orderBy: { createdAt: 'desc' } }),
        client.user.count(),
      ])
      return { users, total }
    },

    async findById(id: string, tx?: Prisma.TransactionClient) {
      return (tx ?? db).user.findUnique({ where: { id } })
    },

    async findByEmail(email: string, tx?: Prisma.TransactionClient) {
      return (tx ?? db).user.findUnique({ where: { email } })
    },

    async create(data: CreateUserInput, tx?: Prisma.TransactionClient) {
      return (tx ?? db).user.create({ data })
    },

    async update(id: string, data: UpdateUserInput, tx?: Prisma.TransactionClient) {
      return (tx ?? db).user.update({ where: { id }, data })
    },

    async delete(id: string, tx?: Prisma.TransactionClient) {
      return (tx ?? db).user.delete({ where: { id } })
    },
  }
}
