<script setup lang="ts">
// OPTIONAL — pruned by `pnpm setup` if better-auth declined.
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const email = ref('')
const password = ref('')
const error = ref<string | null>(null)
const loading = ref(false)

async function onSubmit() {
  error.value = null
  loading.value = true
  try {
    const { error: e } = await auth.signIn(email.value, password.value)
    if (e) {
      error.value = e.message ?? 'Sign-in failed'
      return
    }
    router.push('/')
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="mx-auto max-w-sm space-y-6">
    <h1 class="text-2xl font-bold">
      Sign in
    </h1>
    <form class="space-y-3" @submit.prevent="onSubmit">
      <label class="block">
        <span class="block text-sm font-medium">Email</span>
        <input
          v-model="email"
          type="email"
          required
          class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
        >
      </label>
      <label class="block">
        <span class="block text-sm font-medium">Password</span>
        <input
          v-model="password"
          type="password"
          required
          class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
        >
      </label>
      <button
        type="submit"
        :disabled="loading"
        class="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-slate-900"
      >
        {{ loading ? 'Signing in…' : 'Sign in' }}
      </button>
      <p v-if="error" class="text-xs text-rose-500">
        {{ error }}
      </p>
    </form>
  </section>
</template>
