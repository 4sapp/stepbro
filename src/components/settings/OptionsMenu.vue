<script setup>
import { useOriginPopover } from '../../composables/useOriginPopover'
import './OptionsMenu.css'

const emit = defineEmits(['settings', 'reload'])
const { trigger, panel, expanded, toggle, drag } = useOriginPopover()

function choose(section, event) {
  emit('settings', { section, origin: event.currentTarget })
}
</script>

<template>
  <button ref="trigger" class="sidebar-item dashboard-sidebar__options" type="button" :aria-expanded="expanded" aria-controls="options-menu" aria-label="Opciones" @click="toggle">
    <!-- Los iconos son provisionales: se reemplazan por tus archivos. -->
    <span class="options-trigger__icon" aria-hidden="true">⠿</span>
    <span data-origin-title>Opciones</span>
  </button>

  <Teleport to="body">
    <div id="options-menu" ref="panel" class="options-menu" popover="manual" aria-labelledby="options-menu-title" @pointerdown="drag.start" @pointermove="drag.move" @pointerup="drag.end" @pointercancel="drag.cancel" @lostpointercapture="drag.cancel" @wheel="drag.wheel">
      <div class="options-menu__surface" data-origin-surface />
      <div class="options-menu__layout">
        <h2 id="options-menu-title" data-origin-title>Opciones</h2>
        <div class="options-menu__items" data-origin-content>
          <button type="button" @click="choose('account', $event)"><span aria-hidden="true">⚙</span>Configuración</button>
          <button type="button" @click="emit('reload')"><span aria-hidden="true">↻</span>Recargar App</button>
          <button type="button" @click="choose('appearance', $event)"><span aria-hidden="true">◉</span>Apariencia</button>
          <!-- Sin enlaces ni acciones ficticias mientras no conectemos estos servicios. -->
          <button type="button" disabled><span aria-hidden="true">▣</span>Dar Feedback</button>
          <button type="button" disabled><span aria-hidden="true">♡</span>Buy me a coffee</button>
          <button type="button" disabled><span aria-hidden="true">↪</span>Cerrar Sesión</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
