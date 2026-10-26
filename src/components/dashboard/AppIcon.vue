<script setup>
defineProps({ name: String })

const paths = {
  home: 'M3 10.5 12 3l9 7.5V21h-6v-7H9v7H3Z',
  transactions: 'M4 4h16v4H4Zm0 6h16v4H4Zm0 6h16v4H4Z',
  categories: 'm12 3 5 8H7ZM3 15h6v6H3Zm15 0a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
  accounts: 'm3 9 9-6 9 6ZM3 21h18M5 11v7m5-7v7m4-7v7m5-7v7',
  intentions: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-14v5l3 2',
  tasks: 'm3 6 2 2 4-4M12 6h9M3 16l2 2 4-4m3 2h9',
  projects: 'M12 9V6m-6 9 6-6 6 6M9 3h6v3H9ZM3 16h6v5H3Zm12 0h6v5h-6Z',
  weeks: 'M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1ZM3 9h18M9 3v18m6-18v18',
  options: 'M5 4h.01M12 4h.01M19 4h.01M5 12h.01M12 12h.01M19 12h.01M5 20h.01M12 20h.01M19 20h.01',
  plus: 'M12 5v14M5 12h14',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
}
</script>

<template>
  <svg class="app-icon" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" :stroke-width="name === 'options' ? 3.5 : 1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path :d="paths[name] || paths.tasks" />
  </svg>
</template>
