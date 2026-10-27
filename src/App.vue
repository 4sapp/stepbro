<script setup>
import DashboardView from './components/dashboard/DashboardView.vue'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import LandingView from './components/landing/LandingView.vue'
import FinanceDialog from './components/finance/FinanceDialog.vue'
import CloudAccount from './components/account/CloudAccount.vue'
import { useCloudSession } from './composables/useCloudSession'
import { initializeFinance, resetCloudFinance } from './composables/useFinanceStore'

const session = useCloudSession()
const financeError = ref('')
const route = ref(location.hash)
const showLanding = computed(() => ['', '#', '#/'].includes(route.value))
const accountDialog = ref(null)
let entering = false
const syncRoute = () => { route.value = location.hash }
window.addEventListener('hashchange', syncRoute)
onBeforeUnmount(() => window.removeEventListener('hashchange', syncRoute))
function enterApp(event) {
  if (session.enabled && !session.user.value) {
    entering = true
    accountDialog.value.open(event.currentTarget)
    return
  }
  location.hash = '/home/dashboard'
}
watch(() => session.user.value?.id, async id => {
  financeError.value = ''
  resetCloudFinance()
  if (!id) return
  try {
    await initializeFinance()
    if (entering && session.user.value?.id === id) {
      entering = false
      accountDialog.value?.close()
      location.hash = '/home/dashboard'
    }
  }
  catch (cause) { if (session.user.value?.id === id) financeError.value = cause.message }
})
onMounted(() => {
  if (session.enabled) session.initializeSession().catch(() => { /* El panel de cuenta muestra el error. */ })
})
</script>

<template>
  <div class="app-background">
    <p v-if="financeError" class="finance-storage-error" role="alert">{{ financeError }}</p>
    <LandingView v-if="showLanding" @start="enterApp" />
    <DashboardView v-else />
    <FinanceDialog ref="accountDialog" title="Cuenta">
      <CloudAccount />
    </FinanceDialog>
  </div>
</template>
