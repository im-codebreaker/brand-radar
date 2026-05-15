/* eslint-disable perfectionist/sort-imports */
// Import order is load-bearing: the BETTER_AUTH_RELATIONS marker block
// (and only that block) is removed by `pnpm setup` when auth is declined.
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
// BETTER_AUTH_RELATIONS_START — pruned by `pnpm setup` if auth declined
import { relations } from 'drizzle-orm'
import { accounts, sessions } from './auth.js'
// BETTER_AUTH_RELATIONS_END

export const users = pgTable('users', {
  id: uuid().primaryKey().defaultRandom(),
  email: text().notNull().unique(),
  name: text().notNull(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow().$onUpdate(() => new Date()),
})

// BETTER_AUTH_RELATIONS_START
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
}))
// BETTER_AUTH_RELATIONS_END

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
