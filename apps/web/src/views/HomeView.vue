<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api } from '@/lib/api'

const status = ref<'loading' | 'ok' | 'error'>('loading')
const uptime = ref(0)

onMounted(async () => {
  try {
    const data = await api<{ status: 'ok', uptime: number }>('/v1/health')
    uptime.value = data.uptime
    status.value = data.status
  }
  catch {
    status.value = 'error'
  }
})
</script>

<template>
  <section class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold">
        Stack it your way
      </h1>
      <p class="mt-2 text-slate-600 dark:text-slate-400">
        Minimal full-stack starter — Vue 3 + Fastify + Prisma
      </p>
    </div>

    <div class="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
      <div class="flex items-center gap-3">
        <span
          class="size-2 rounded-full"
          :class="{
            'bg-amber-500 animate-pulse': status === 'loading',
            'bg-emerald-500': status === 'ok',
            'bg-rose-500': status === 'error',
          }"
        />
        <span class="text-sm font-medium">
          API status: <code>{{ status }}</code>
        </span>
        <span v-if="status === 'ok'" class="ml-auto text-xs text-slate-500">
          uptime {{ uptime.toFixed(1) }}s
        </span>
      </div>
    </div>

    <div class="prose prose-sm dark:prose-invert">
      <h2>Next steps</h2>
      <ul>
        <li>Run <code>pnpm setup</code> to choose your modules.</li>
        <li>Edit <code>packages/validations/src/</code> to add your domain schemas.</li>
        <li>Add routes under <code>apps/api/src/routes/</code>.</li>
        <li>Add views under <code>apps/web/src/views/</code>.</li>
      </ul>
    </div>
  </section>
</template>
