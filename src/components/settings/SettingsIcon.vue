<script setup>
defineProps({ name: String })
const paths = {
  account: 'M20 20a8 8 0 0 0-16 0M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  agent: 'M8 21v-4H5v-6a7 7 0 1 1 14 0l2 3h-3v7M9 12a4 4 0 1 1 6-3c0 2-3 2-3 4',
  verified: 'm12 2 3 2 4 .5.5 4 2 3-2 3-.5 4-4 .5-3 2-3-2-4-.5-.5-4-2-3 2-3 .5-4L9 4Zm-4 10 3 3 5-6',
}
</script>
<template>
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <template v-if="name === 'general'"><circle v-for="i in 9" :key="i" :cx="5 + ((i - 1) % 3) * 7" :cy="5 + Math.floor((i - 1) / 3) * 7" r="1.3" fill="currentColor" /></template>
    <template v-else><circle v-if="name === 'account'" cx="12" cy="12" r="10"/><path :d="paths[name] || paths.agent" /></template>
  </svg>
</template>
