<script setup>
import { ref } from 'vue'
import MaterialIcon from '../MaterialIcon.vue'
import AppIcon from './AppIcon.vue'
import AppLogo from '../AppLogo.vue'
import OptionsMenu from '../settings/OptionsMenu.vue'
import './DashboardSidebar.css'

const options = ref(null)
const navRef = ref(null)

const props = defineProps({ active: String })
const emit = defineEmits(['navigate', 'settings'])

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

let navScrub = null
function pickNavAt(clientX, clientY) {
  const node = document.elementFromPoint(clientX, clientY)?.closest('[data-nav-id]')
  const id = node?.dataset.navId
  if (id && id !== props.active) emit('navigate', id)
}
function startNavScrub(event) {
  if (event.pointerType !== 'touch') return
  navScrub = { id: event.pointerId, x: event.clientX, y: event.clientY, active: false }
}
function moveNavScrub(event) {
  if (!navScrub || event.pointerId !== navScrub.id) return
  if (!navScrub.active) {
    if (Math.hypot(event.clientX - navScrub.x, event.clientY - navScrub.y) < 6) return
    navScrub.active = true
    navRef.value?.setPointerCapture?.(event.pointerId)
  }
  pickNavAt(event.clientX, event.clientY)
}
function endNavScrub(event) {
  if (!navScrub || event.pointerId !== navScrub.id) return
  navScrub = null
  if (navRef.value?.hasPointerCapture?.(event.pointerId)) navRef.value.releasePointerCapture(event.pointerId)
}
</script>

<template>
  <aside id="dashboard-sidebar" class="dashboard-sidebar">
    <div class="dashboard-sidebar__brand">
      <button class="dashboard-sidebar__brand-button" type="button" aria-label="sb Money, abrir opciones" aria-controls="options-menu" :aria-expanded="options?.expanded ?? false" @click="options.openFrom($event.currentTarget)">
        <AppLogo class="dashboard-sidebar__logo" />
        <span data-origin-title>sb Money</span>
        <MaterialIcon class="dashboard-sidebar__brand-chevron" name="expand_all" />
      </button>
    </div>
    <nav ref="navRef" class="dashboard-sidebar__nav" aria-label="Secciones" style="touch-action: none;" @pointerdown="startNavScrub" @pointermove="moveNavScrub" @pointerup="endNavScrub" @pointercancel="endNavScrub">
      <button v-for="item in items" :key="item.id" :data-nav-id="item.id" :class="['sidebar-item', { 'sidebar-item--intentions': item.id === 'intentions' }]" type="button" :aria-label="item.label" :aria-current="active === item.id ? 'page' : undefined" @click="$emit('navigate', item.id)">
        <AppIcon :name="item.id" />
        <span>{{ item.label }}</span>
      </button>
    </nav>

    <OptionsMenu ref="options" :active="active" @navigate="$emit('navigate', $event)" @settings="$emit('settings', $event)" @reload="reload" />
  </aside>
</template>
