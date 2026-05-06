<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <section class="space-y-3 text-center">
    <h1 class="text-3xl font-bold">
      404
    </h1>
    <p class="text-slate-600 dark:text-slate-400">
      Page not found.
    </p>
    <RouterLink to="/" class="text-sm text-blue-500 hover:underline">
      Go home
    </RouterLink>
  </section>
</template>
