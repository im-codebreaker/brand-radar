import { z } from 'zod'
import { IdSchema } from '../shared/id.js'
import { TimestampsSchema } from '../shared/timestamps.js'

export const UserSchema = z.object({
  id: IdSchema,
  email: z.email(),
  name: z.string().min(1).max(120),
}).extend(TimestampsSchema.shape)

export type User = z.infer<typeof UserSchema>
