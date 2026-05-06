import { createAuthClient } from 'better-auth/vue'

export interface AuthClientConfig {
  baseURL: string
}

export function createStackitAuthClient(config: AuthClientConfig) {
  return createAuthClient({ baseURL: config.baseURL })
}

export { createAuthClient }
