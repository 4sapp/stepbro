<script setup>
import { ref } from 'vue'
import MainPanel from '../MainPanel.vue'
import BalanceSummary from '../BalanceSummary.vue'
import MovementPanel from '../MovementPanel.vue'
import DashboardSidebar from './DashboardSidebar.vue'
import SettingsPanel from '../settings/SettingsPanel.vue'
import AppearancePanel from '../settings/AppearancePanel.vue'
import './DashboardView.css'

// Por ahora solo cambia la selección visual; las vistas se construirán después.
const section = ref('home')
const settings = ref(null)
const appearance = ref(null)

function openSettings({ section, origin }) {
  if (section === 'appearance') appearance.value.open(origin)
  else settings.value.open(section, origin)
}
</script>

<template>
  <MainPanel>
    <DashboardSidebar :active="section" @navigate="section = $event" @settings="openSettings" />
    <main id="dashboard-content" class="dashboard-content">
      <BalanceSummary />
      <MovementPanel />
    </main>
  </MainPanel>
  <SettingsPanel ref="settings" />
  <AppearancePanel ref="appearance" />
</template>
