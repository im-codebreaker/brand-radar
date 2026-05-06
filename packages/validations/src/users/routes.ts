import { PaginationQuerySchema } from '../shared/pagination.js'
import { UserIdParamsSchema } from './params.js'
import { CreateUserSchema, UpdateUserSchema } from './requests.js'
import { ErrorResponseSchema, UserResponseSchema, UsersListResponseSchema } from './responses.js'

export const listUsersRoute = {
  querystring: PaginationQuerySchema,
  response: {
    200: UsersListResponseSchema,
  },
  tags: ['Users'] as string[],
} as const

export const getUserRoute = {
  params: UserIdParamsSchema,
  response: {
    200: UserResponseSchema,
    404: ErrorResponseSchema,
  },
  tags: ['Users'] as string[],
} as const

export const createUserRoute = {
  body: CreateUserSchema,
  response: {
    201: UserResponseSchema,
    400: ErrorResponseSchema,
  },
  tags: ['Users'] as string[],
} as const

export const updateUserRoute = {
  params: UserIdParamsSchema,
  body: UpdateUserSchema,
  response: {
    200: UserResponseSchema,
    404: ErrorResponseSchema,
  },
  tags: ['Users'] as string[],
} as const

export const deleteUserRoute = {
  params: UserIdParamsSchema,
  response: {
    204: ErrorResponseSchema.optional(),
    404: ErrorResponseSchema,
  },
  tags: ['Users'] as string[],
} as const
