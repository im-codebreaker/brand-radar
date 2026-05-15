import { z } from 'zod'

/**
 * Accepts a Date or ISO datetime string at the boundary; emits an ISO string.
 * Used for response shapes so Drizzle's Date values pass through validation
 * and serialize cleanly to JSON.
 */
export const DateTimeStringSchema = z.preprocess(
  v => (v instanceof Date ? v.toISOString() : v),
  z.iso.datetime(),
)

export const TimestampsSchema = z.object({
  createdAt: DateTimeStringSchema,
  updatedAt: DateTimeStringSchema,
})

export type Timestamps = z.infer<typeof TimestampsSchema>
