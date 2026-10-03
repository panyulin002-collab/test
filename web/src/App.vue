<script setup>
import AppHeader from './components/AppHeader.vue'
import AppFooter from './components/AppFooter.vue'
import { toasts } from './composables/toast'
</script>

<template>
  <AppHeader />
  <main>
    <router-view />
  </main>
  <AppFooter />

  <div class="toast-wrap">
    <div v-for="item in toasts" :key="item.id" class="toast" :class="{ 'toast-error': item.type === 'error' }">
      {{ item.message }}
    </div>
  </div>
</template>
