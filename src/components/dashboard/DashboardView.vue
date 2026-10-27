<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'
import gsap from 'gsap'
import FinanceDialog from '../finance/FinanceDialog.vue'
import AssistantChat from '../chat/AssistantChat.vue'
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
import { useCloudSession } from '../../composables/useCloudSession'

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
const movement = ref(null)
const transfer = ref(null)
const settings = ref(null)
const extraFields = ref(null)
const session = ref(null)
const appearance = ref(null)
const assistant = ref(null)
const { accounts, activeCurrency, error } = useFinanceStore()
const cloudSession = useCloudSession()
async function openSettings({ section, origin }) {
  if (section === 'transfer') transfer.value.createTransfer({ currentTarget: origin })
  else if (section === 'session') {
    if (!cloudSession.enabled) session.value.open(origin)
    else {
      try { await cloudSession.logout() }
      catch { settings.value.open('account', origin) }
    }
  }
  else if (section === 'fields') extraFields.value.open(origin)
  else if (section === 'appearance') appearance.value.open(origin)
  else settings.value.open(section, origin)
}

const swipeOrder = ['home', 'transactions', 'categories', 'accounts', 'intentions']
const pageRef = ref(null)
let pageSwipe = null
function onTouchStartPage(event) {
  if (event.touches.length !== 1 || document.querySelector('dialog[open], :popover-open')) return
  const t = event.touches[0]
  if (t.target?.closest?.('input, textarea, select, .finance-home__accounts')) return
  pageSwipe = { id: t.identifier, x: t.clientX, y: t.clientY, dx: 0, dy: 0, locked: null }
}
function onTouchMovePage(event) {
  if (!pageSwipe) return
  const t = [...event.touches].find(item => item.identifier === pageSwipe.id)
  if (!t) return
  const dx = t.clientX - pageSwipe.x
  const dy = t.clientY - pageSwipe.y
  if (pageSwipe.locked === null && Math.hypot(dx, dy) > 10) {
    pageSwipe.locked = Math.abs(dx) > Math.abs(dy) * 1.25 ? 'x' : 'y'
  }
  if (pageSwipe.locked !== 'x') return
  pageSwipe.dx = dx
  pageSwipe.dy = dy
  if (pageRef.value) {
    gsap.set(pageRef.value, { x: dx * 0.38, opacity: Math.max(0.72, 1 - Math.abs(dx) / 500) })
  }
}
function onTouchEndPage() {
  if (!pageSwipe) return
  const { dx, locked } = pageSwipe
  pageSwipe = null
  if (locked !== 'x') return
  const current = swipeOrder.indexOf(section.value)
  const next = current >= 0 && Math.abs(dx) > 52 ? swipeOrder[current + (dx < 0 ? 1 : -1)] : null
  if (next) {
    if (pageRef.value) gsap.set(pageRef.value, { clearProps: 'x,opacity' })
    section.value = next
  } else if (pageRef.value) {
    gsap.to(pageRef.value, { x: 0, opacity: 1, duration: 0.28, ease: 'power2.out', clearProps: 'x,opacity' })
  }
}
</script>

<template>
  <MainPanel>
    <DashboardSidebar :active="section" @navigate="section = $event" @settings="openSettings" />
    <main id="dashboard-content" class="dashboard-content" @touchstart.passive="onTouchStartPage" @touchmove.passive="onTouchMovePage" @touchend.passive="onTouchEndPage" @touchcancel.passive="onTouchEndPage">
      <div :key="section" ref="pageRef" class="dashboard-page" :class="{ 'dashboard-page--home': section === 'home' }">
      <p v-if="error" class="finance-storage-error" role="alert">{{ error }}</p>
      <template v-if="section === 'home'">
        <div v-if="accounts.length > 1" class="finance-home__accounts" aria-label="Saldos por cuenta"><button v-for="account in accounts" :key="account.id" type="button" @click="section = 'accounts'"><span>{{ account.name }}</span><strong>{{ money(account.balance, account.currency) }} {{ account.currency }}</strong></button></div>
        <BalanceSummary />
        <div class="finance-home__actions">
          <button class="finance-home__quick" type="button" aria-label="Chatea conmigo" aria-haspopup="dialog" @click="assistant.open($event.currentTarget)">
            <span>Chatea conmigo</span>
          </button>
          <MovementPanel ref="movement" />
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
  <AssistantChat ref="assistant" />
</template>
