<script setup>
import TouchButton from './TouchButton.vue'
import { useMorphPanel } from '../composables/useMorphPanel'
import './MovementPanel.css'

const { dialog, open, close } = useMorphPanel()

function closeFromBackdrop(event) {
  if (event.target !== dialog.value) return
  const bounds = dialog.value.getBoundingClientRect()
  const outside = event.clientX < bounds.left || event.clientX > bounds.right
    || event.clientY < bounds.top || event.clientY > bounds.bottom
  if (outside) close()
}
</script>

<template>
  <div class="movement-action">
    <TouchButton label="Movimiento" aria-haspopup="dialog" @click="open" />
  </div>

  <Teleport to="body">
    <dialog
      ref="dialog"
      class="movement-panel"
      aria-labelledby="movement-title"
      @cancel.prevent="close"
      @click="closeFromBackdrop"
    >
      <div class="movement-panel__surface" data-panel-surface aria-hidden="true" />
      <div class="movement-panel__layout" data-panel-layout>
        <header class="movement-panel__header">
          <span class="movement-panel__icon" data-shared-item="icon" aria-hidden="true">+</span>
          <h2 id="movement-title" data-shared-item="title">Movimiento</h2>
          <button class="movement-panel__close" type="button" aria-label="Cerrar" data-panel-content @click="close">×</button>
        </header>
        <div class="movement-panel__body" data-panel-content>
          <p>Un nuevo movimiento empieza aquí.</p>
          <!-- Siguiente paso: construir los campos, uno a uno. -->
        </div>
      </div>
    </dialog>
  </Teleport>
</template>
