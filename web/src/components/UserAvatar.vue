<script setup>
import { computed } from 'vue'

const props = defineProps({
  src: { type: String, default: '' },
  name: { type: String, default: '' },
  size: { type: Number, default: 36 }
})

const initial = computed(() => (props.name || '?').trim().slice(0, 1).toUpperCase())
const style = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  fontSize: `${Math.round(props.size * 0.44)}px`
}))
</script>

<template>
  <img v-if="src" class="avatar" :src="src" :alt="name" :style="style" />
  <span v-else class="avatar avatar-fallback" :style="style">{{ initial }}</span>
</template>
