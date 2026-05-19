<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
    <header class="border-b border-slate-200 dark:border-slate-800">
      <nav class="mx-auto flex max-w-5xl items-center gap-6 px-6 py-4">
        <RouterLink to="/" class="text-lg font-semibold">
          brand-radar
        </RouterLink>
        <RouterLink to="/users" class="text-sm hover:underline">
          Users
        </RouterLink>
        <span class="ml-auto text-xs text-slate-500">
          Vue 3 + Fastify + Drizzle
        </span>
      </nav>
    </header>
    <main class="mx-auto max-w-5xl px-6 py-10">
      <RouterView />
    </main>
  </div>
</template>
