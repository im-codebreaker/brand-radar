import { z } from 'zod'
import { IdSchema } from '../shared/id.js'

export const UserIdParamsSchema = z.object({
  id: IdSchema,
})

export type UserIdParams = z.infer<typeof UserIdParamsSchema>
