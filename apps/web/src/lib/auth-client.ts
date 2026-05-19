// OPTIONAL — pruned by `pnpm setup` if better-auth declined.
import { createStackitAuthClient } from '@brand-radar/auth/client'

export const authClient = createStackitAuthClient({
  baseURL: `${import.meta.env.VITE_API_URL || '/api'}/v1/auth`,
})
