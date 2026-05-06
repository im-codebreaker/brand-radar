import { z } from 'zod'

export const CreateUserSchema = z.object({
  email: z.email(),
  name: z.string().min(1).max(120),
})
export type CreateUserInput = z.infer<typeof CreateUserSchema>

export const UpdateUserSchema = CreateUserSchema.partial()
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>
