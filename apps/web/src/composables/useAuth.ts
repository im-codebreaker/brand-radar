import { useRouter } from 'vue-router'
import { authClient } from '@/lib/auth-client'

type SignInParams = Parameters<typeof authClient.signIn.email>[0]
type SignUpParams = Parameters<typeof authClient.signUp.email>[0]
type ResetPasswordParams = Parameters<typeof authClient.resetPassword>[0]
type UpdatePasswordParams = Parameters<typeof authClient.changePassword>[0]

/**
 * Authentication composable
 * @see https://www.better-auth.com/docs/authentication/email-password
 */
export function useAuth() {
  const router = useRouter()

  async function requestPasswordReset(email: string) {
    return await authClient.forgetPassword({
      email,
      redirectTo: '/reset-password',
    })
  }

  async function resetPassword({ newPassword, token }: ResetPasswordParams) {
    return await authClient.resetPassword({
      newPassword,
      token,
    })
  }

  async function sendVerificationEmail(email: string) {
    await authClient.sendVerificationEmail({ email })
  }

  async function signIn({ email, password, rememberMe }: SignInParams) {
    return await authClient.signIn.email({ email, password, rememberMe })
  }

  async function signInWithProvider(provider: 'google' | 'github') {
    return await authClient.signIn.social({ provider })
  }

  async function signOut() {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => void router.push({ name: 'login' }) as void | Promise<void>,
      },
    })
  }

  async function signUp({ name, email, password }: SignUpParams) {
    return await authClient.signUp.email({ name, email, password })
  }

  async function updatePassword({ newPassword, currentPassword, revokeOtherSessions = true }: UpdatePasswordParams) {
    return await authClient.changePassword({
      newPassword,
      currentPassword,
      revokeOtherSessions,
    })
  }

  return {
    requestPasswordReset,
    resetPassword,
    sendVerificationEmail,
    signIn,
    signInWithProvider,
    signOut,
    signUp,
    updatePassword,
  }
}
