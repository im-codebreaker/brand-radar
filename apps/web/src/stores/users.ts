import type { User } from '@stackit/types'
import type { CreateUserInput } from '@stackit/validations/users/requests'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/lib/api'

export const useUsersStore = defineStore('users', () => {
  const users = ref<User[]>([])
  const total = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchAll() {
    loading.value = true
    error.value = null
    try {
      const data = await api<{ users: User[], total: number }>('/v1/users')
      users.value = data.users
      total.value = data.total
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load users'
    }
    finally {
      loading.value = false
    }
  }

  async function create(input: CreateUserInput) {
    const data = await api<{ user: User }>('/v1/users', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    await fetchAll()
    return data.user
  }

  async function remove(id: string) {
    await api<void>(`/v1/users/${id}`, { method: 'DELETE' })
    users.value = users.value.filter(u => u.id !== id)
    total.value = Math.max(0, total.value - 1)
  }

  return { users, total, loading, error, fetchAll, create, remove }
})
