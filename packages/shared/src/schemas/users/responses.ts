import { z } from 'zod'
import { UserSchema } from './entity.js'

export const UserResponseSchema = z.object({
  user: UserSchema,
})
export type UserResponse = z.infer<typeof UserResponseSchema>

export const UsersListResponseSchema = z.object({
  users: z.array(UserSchema),
  total: z.number().int().nonnegative(),
})
export type UsersListResponse = z.infer<typeof UsersListResponseSchema>

export const ErrorResponseSchema = z.object({
  message: z.string(),
})
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>
