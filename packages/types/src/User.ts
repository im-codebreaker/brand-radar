import type { users } from '@stackit/validations'
import type { z } from 'zod'

export type User = z.infer<typeof users.UserSchema>
