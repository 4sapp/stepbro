<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import FinanceDialog from '../finance/FinanceDialog.vue'
import FeedbackView from '../community/FeedbackView.vue'
import MainPanel from '../MainPanel.vue'
import BalanceSummary from '../BalanceSummary.vue'
import MovementPanel from '../MovementPanel.vue'
import DashboardSidebar from './DashboardSidebar.vue'
import SettingsPanel from '../settings/SettingsPanel.vue'
import AppearancePanel from '../settings/AppearancePanel.vue'
import FinanceLedger from '../finance/FinanceLedger.vue'
import FinanceAccounts from '../finance/FinanceAccounts.vue'
import FinanceCategories from '../finance/FinanceCategories.vue'
import FinanceIntentions from '../finance/FinanceIntentions.vue'
import '../finance/FinancePages.css'
import { useFinanceStore, money } from '../../composables/useFinanceStore'
import './DashboardView.css'

const paths = { home: 'dashboard', transactions: 'movements', categories: 'categories', accounts: 'accounts', intentions: 'intentions' }
function sectionFromHash() {
  const path = location.hash.split('?')[0].replace(/\/$/, '')
  if (path === '#/community/feedback') return 'feedback'
  return Object.keys(paths).find(key => path === `#/home/${paths[key]}`) || 'home'
}
const section = ref(sectionFromHash())
const syncHash = () => { section.value = sectionFromHash() }
window.addEventListener('hashchange', syncHash)
watch(section, value => {
  const path = value === 'feedback' ? '/community/feedback' : `/home/${paths[value]}`
  if (location.hash !== `#${path}`) location.hash = path
})
onBeforeUnmount(() => window.removeEventListener('hashchange', syncHash))
const quickConcept = ref('')
const movement = ref(null)
async function quickMovement() {
  await nextTick()
  movement.value?.openFromQuickEntry()
}
const transfer = ref(null)
const settings = ref(null)
const extraFields = ref(null)
const session = ref(null)
const appearance = ref(null)
const { accounts, activeCurrency, error } = useFinanceStore()
function openSettings({ section, origin }) {
  if (section === 'transfer') transfer.value.createTransfer({ currentTarget: origin })
  else if (section === 'session') session.value.open(origin)
  else if (section === 'fields') extraFields.value.open(origin)
  else if (section === 'appearance') appearance.value.open(origin)
  else settings.value.open(section, origin)
}
</script>

<template>
  <MainPanel>
    <DashboardSidebar :active="section" @navigate="section = $event" @settings="openSettings" />
    <main id="dashboard-content" class="dashboard-content">
      <div :key="section" class="dashboard-page" :class="{ 'dashboard-page--home': section === 'home' }">
      <p v-if="error" class="finance-storage-error" role="alert">{{ error }}</p>
      <template v-if="section === 'home'">
        <div v-if="accounts.length > 1" class="finance-home__accounts" aria-label="Saldos por cuenta"><button v-for="account in accounts" :key="account.id" type="button" @click="section = 'accounts'"><span>{{ account.name }}</span><strong>{{ money(account.balance, account.currency) }} {{ account.currency }}</strong></button></div>
        <BalanceSummary />
        <div class="finance-home__actions">
          <form class="finance-home__quick" @submit.prevent="quickMovement">
            <input v-model="quickConcept" aria-label="Concepto del nuevo movimiento" placeholder="Anota un movimiento" maxlength="120" />
            <button type="submit" aria-label="Completar movimiento"><span aria-hidden="true">↗</span></button>
          </form>
          <MovementPanel ref="movement" :description="quickConcept" />
        </div>
        <FinanceLedger compact @view-all="section = 'transactions'" @edit="(item, event) => movement.edit(item, event)" />
      </template>
      <FinanceLedger v-else-if="section === 'transactions'" />
      <FinanceCategories v-else-if="section === 'categories'" />
      <FinanceAccounts v-else-if="section === 'accounts'" />
      <FinanceIntentions v-else-if="section === 'intentions'" />
      <FeedbackView v-else @back="section = 'home'" />
      </div>
    </main>
  </MainPanel>
  <MovementPanel ref="transfer" hidden-trigger />
  <FinanceDialog ref="extraFields" title="Campos adicionales">
    <p class="finance-extra-fields__description">Agrega columnas personalizadas para guardar información extra en tus movimientos</p>
    <div class="finance-empty"><p>No se encontraron Campos adicionales</p></div>
  </FinanceDialog>
  <FinanceDialog ref="session" title="Cerrar Sesión">
    <p class="finance-extra-fields__description">Esta copia funciona con datos locales. No hay una sesión conectada que cerrar.</p>
    <footer class="finance-fields__footer"><button type="button" @click="session.close()">Volver</button></footer>
  </FinanceDialog>
  <SettingsPanel ref="settings" />
  <AppearancePanel ref="appearance" />
</template>
