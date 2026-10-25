<script setup>
import MainPanel from './components/MainPanel.vue'
import BalanceSummary from './components/BalanceSummary.vue'
import MovementPanel from './components/MovementPanel.vue'
</script>

<template>
  <main class="app-background">
    <MainPanel>
      <BalanceSummary />
      <MovementPanel />
    </MainPanel>
  </main>
</template>
