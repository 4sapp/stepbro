<script setup>
import DashboardView from './components/dashboard/DashboardView.vue'
import { onMounted, ref, watch } from 'vue'
import { useCloudSession } from './composables/useCloudSession'
import { initializeFinance, resetCloudFinance } from './composables/useFinanceStore'

const session = useCloudSession()
const financeError = ref('')
watch(() => session.user.value?.id, async id => {
  financeError.value = ''
  resetCloudFinance()
  if (!id) return
  try { await initializeFinance() }
  catch (cause) { if (session.user.value?.id === id) financeError.value = cause.message }
})
onMounted(() => {
  if (session.enabled) session.initializeSession().catch(() => { /* El panel de cuenta muestra el error. */ })
})
</script>

<template>
  <div class="app-background">
    <p v-if="financeError" class="finance-storage-error" role="alert">{{ financeError }}</p>
    <DashboardView />
  </div>
</template>
