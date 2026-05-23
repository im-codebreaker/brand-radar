<script setup lang="ts">
import type { z } from '@brand-radar/shared/schemas'
import { auth as authSchemas } from '@brand-radar/shared/schemas'
import { RButton, RForm, RFormGroup, RInput } from '@rebnd/ui'
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

type SignInState = z.infer<typeof authSchemas.SignInSchema>

const state = reactive<SignInState>({
  email: '',
  password: '',
})

const schema = authSchemas.SignInSchema

const error = ref<string | null>(null)

async function onSubmit(submitEvent: { state: typeof state }) {
  error.value = null
  try {
    const { error: e } = await auth.signIn(submitEvent.state.email, submitEvent.state.password)
    if (e) {
      error.value = e.message ?? 'Sign-in failed'
      return
    }
    await router.push('/')
  }
  catch (err) {
    error.value = err instanceof Error ? err.message : 'Sign-in failed'
  }
}
</script>

<template>
  <section class="mx-auto max-w-sm space-y-6">
    <h1 class="text-2xl font-bold">
      Sign in
    </h1>
    <RForm :state :schema @submit="onSubmit">
      <RFormGroup name="email">
        <template #label>
          Email
        </template>
        <RInput
          v-model="state.email"
          name="email"
          type="email"
          placeholder="you@example.com"
          autocomplete="email"
        />
      </RFormGroup>
      <RFormGroup name="password">
        <template #label>
          Password
        </template>
        <RInput
          v-model="state.password"
          name="password"
          type="password"
          placeholder="Enter your password"
          autocomplete="current-password"
        />
      </RFormGroup>
      <p v-if="error" class="text-xs text-rose-500">
        {{ error }}
      </p>
      <RButton type="submit" class="w-full">
        Sign in
      </RButton>
    </RForm>
  </section>
</template>
