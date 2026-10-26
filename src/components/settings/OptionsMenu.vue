<script setup>
import MaterialIcon from '../MaterialIcon.vue'
import { useOriginPopover } from '../../composables/useOriginPopover'
import './OptionsMenu.css'

defineProps({ active: String })
const emit = defineEmits(['settings', 'reload', 'navigate'])
const { trigger, panel, expanded, toggle, close, drag } = useOriginPopover()
defineExpose({ expanded, openFrom: origin => toggle({ currentTarget: origin }) })

function choose(section, event) {
  if (section === 'feedback') { close(); location.hash = '/community/feedback'; return }
  emit('settings', { section, origin: event.currentTarget })
}
</script>

<template>
  <button ref="trigger" class="sidebar-item dashboard-sidebar__options" type="button" :data-active-section="active === 'intentions' || active === 'feedback' ? 'true' : undefined" :aria-expanded="expanded" aria-controls="options-menu" aria-label="Opciones" @click="toggle">
    <MaterialIcon class="options-trigger__icon" name="apps" />
    <span data-origin-title>Opciones</span>
  </button>

  <Teleport to="body">
    <div id="options-menu" ref="panel" class="options-menu" popover="manual" aria-labelledby="options-menu-title" @pointerdown="drag.start" @pointermove="drag.move" @pointerup="drag.end" @pointercancel="drag.cancel" @lostpointercapture="drag.cancel" @wheel="drag.wheel">
      <div class="options-menu__surface" data-origin-surface />
      <div class="options-menu__layout">
        <div class="options-menu__heading"><h2 id="options-menu-title" data-origin-title>Opciones</h2></div>
        <div class="options-menu__items" data-origin-content>
          <button class="options-menu__intentions" type="button" :aria-current="active === 'intentions' ? 'page' : undefined" @click="close(); emit('navigate', 'intentions')"><MaterialIcon name="next_plan" />Intenciones</button>
          <button type="button" @click="choose('transfer', $event)"><MaterialIcon name="swap_horiz" />Crear transferencia</button>
          <button type="button" @click="choose('fields', $event)"><MaterialIcon name="view_column" />Campos adicionales</button>
          <button type="button" @click="choose('account', $event)"><MaterialIcon name="settings" />Configuración</button>
          <button type="button" @click="emit('reload')"><MaterialIcon name="refresh" />Recargar App</button>
          <button type="button" @click="choose('appearance', $event)"><MaterialIcon name="palette" />Apariencia</button>
          <!-- Sin enlaces ni acciones ficticias mientras no conectemos estos servicios. -->
          <button type="button" @click="choose('feedback', $event)"><MaterialIcon name="feedback" />Dar Feedback</button>
          <button type="button" @click="choose('session', $event)"><MaterialIcon name="logout" />Cerrar Sesión</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
