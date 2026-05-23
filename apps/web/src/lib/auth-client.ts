import { initiAuthClient } from '@brand-radar/auth/client'

export const authClient = initiAuthClient({
  baseURL: `${import.meta.env.VITE_API_URL || '/api'}/v1/auth`,
})
