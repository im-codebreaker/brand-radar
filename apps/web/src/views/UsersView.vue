<script setup lang="ts">
import { RButton, RForm, RFormGroup, RInput } from '@rebnd/ui'
import { users } from '@brand-radar/validations'
import { onMounted, reactive } from 'vue'
import { useUsersStore } from '@/stores/users'

const store = useUsersStore()

const initial: users.requests.CreateUserInput = { email: '', name: '' }
const state = reactive({ ...initial })

async function onSubmit(event: SubmitEvent & { state: users.requests.CreateUserInput | null }) {
  if (!event.state)
    return
  try {
    await store.create(event.state)
    Object.assign(state, initial)
  }
  catch (err) {
    console.error(err)
  }
}

onMounted(() => store.fetchAll())
</script>

<template>
  <section class="space-y-8">
    <div>
      <h1 class="text-2xl font-bold">
        Users
      </h1>
      <p class="text-sm text-slate-600 dark:text-slate-400">
        Demo CRUD using shared Zod schemas from <code>@brand-radar/validations</code>.
      </p>
    </div>

    <RForm
      :schema="users.requests.CreateUserSchema"
      :state="state"
      class="rounded-lg border border-slate-200 p-4 dark:border-slate-800"
      @submit="onSubmit"
    >
      <div class="grid gap-3 sm:grid-cols-2">
        <RFormGroup name="email">
          <template #label>
            Email
          </template>
          <RInput v-model="state.email" type="email" />
        </RFormGroup>
        <RFormGroup name="name">
          <template #label>
            Name
          </template>
          <RInput v-model="state.name" />
        </RFormGroup>
      </div>
      <RButton type="submit">
        Add user
      </RButton>
    </RForm>

    <div v-if="store.loading" class="text-sm text-slate-500">
      Loading…
    </div>
    <div v-else-if="store.error" class="text-sm text-rose-500">
      {{ store.error }}
    </div>
    <ul v-else class="divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
      <li v-for="user in store.users" :key="user.id" class="flex items-center justify-between px-4 py-3">
        <div>
          <div class="font-medium">
            {{ user.name }}
          </div>
          <div class="text-xs text-slate-500">
            {{ user.email }}
          </div>
        </div>
        <button
          class="text-xs text-rose-500 hover:underline"
          @click="store.remove(user.id)"
        >
          Delete
        </button>
      </li>
      <li v-if="!store.users.length" class="px-4 py-6 text-center text-sm text-slate-500">
        No users yet.
      </li>
    </ul>
  </section>
</template>
