export interface ApiSuccess<T> {
  data: T
  message?: string
}

export interface ApiError {
  message: string
  code?: string
  details?: unknown
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  limit: number
}
