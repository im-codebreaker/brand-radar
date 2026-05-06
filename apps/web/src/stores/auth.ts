// OPTIONAL — pruned by `pnpm setup` if better-auth declined.
import { defineStore } from 'pinia'
import { computed } from 'vue'
import { authClient } from '@/lib/auth-client'

export const useAuthStore = defineStore('auth', () => {
  const session = authClient.useSession()
  const isAuthenticated = computed(() => !!session.value.data?.user)
  const user = computed(() => session.value.data?.user ?? null)

  async function signIn(email: string, password: string) {
    return authClient.signIn.email({ email, password })
  }

  async function signUp(email: string, password: string, name: string) {
    return authClient.signUp.email({ email, password, name })
  }

  async function signOut() {
    return authClient.signOut()
  }

  return { session, isAuthenticated, user, signIn, signUp, signOut }
})
