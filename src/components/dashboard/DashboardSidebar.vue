<script setup>
import AppIcon from './AppIcon.vue'
import AppLogo from '../AppLogo.vue'
import OptionsMenu from '../settings/OptionsMenu.vue'
import './DashboardSidebar.css'

defineProps({ active: String })
defineEmits(['navigate', 'settings'])

function reload() {
  window.location.reload()
}

const items = [
  { id: 'home', label: 'Inicio' },
  { id: 'transactions', label: 'Movimientos' },
  { id: 'categories', label: 'Categorías' },
  { id: 'accounts', label: 'Cuentas' },
  { id: 'intentions', label: 'Intenciones' },
]
</script>

<template>
  <aside id="dashboard-sidebar" class="dashboard-sidebar">
    <div class="dashboard-sidebar__brand"><AppLogo class="dashboard-sidebar__logo" /> sb Money</div>
    <nav class="dashboard-sidebar__nav" aria-label="Secciones">
      <button v-for="item in items" :key="item.id" :class="['sidebar-item', { 'sidebar-item--intentions': item.id === 'intentions' }]" type="button" :aria-label="item.label" :aria-current="active === item.id ? 'page' : undefined" @click="$emit('navigate', item.id)">
        <AppIcon :name="item.id" />
        <span>{{ item.label }}</span>
      </button>
    </nav>

    <OptionsMenu :active="active" @navigate="$emit('navigate', $event)" @settings="$emit('settings', $event)" @reload="reload" />
  </aside>
</template>
