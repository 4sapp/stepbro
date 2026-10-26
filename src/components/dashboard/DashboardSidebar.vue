<script setup>
import AppIcon from './AppIcon.vue'
import OptionsMenu from '../settings/OptionsMenu.vue'
import './DashboardSidebar.css'

defineProps({ active: String })
defineEmits(['navigate', 'settings'])

function reload() {
  window.location.reload()
}

const items = [
  { id: 'home', label: 'Inicio' },
  { id: 'tasks', label: 'Tareas' },
  { id: 'projects', label: 'Proyectos' },
  { id: 'weeks', label: 'Semanas' },
]
</script>

<template>
  <aside class="dashboard-sidebar">
    <div class="dashboard-sidebar__brand">
      <span class="dashboard-sidebar__symbol" aria-hidden="true">✣</span>
      <span>sb Tasks</span>
    </div>

    <nav class="dashboard-sidebar__nav" aria-label="Secciones">
      <button v-for="item in items" :key="item.id" class="sidebar-item" type="button" :aria-current="active === item.id ? 'page' : undefined" @click="$emit('navigate', item.id)">
        <AppIcon :name="item.id" />
        <span>{{ item.label }}</span>
      </button>
    </nav>

    <OptionsMenu @settings="$emit('settings', $event)" @reload="reload" />
  </aside>
</template>
