<script setup>
import { ref } from 'vue'
import { useSettingsDialog } from '../../composables/useSettingsDialog'
import './AppearancePanel.css'

const { dialog, open, close, backdrop, drag } = useSettingsDialog({ anchored: true })
const selected = ref('neutral')
// Paleta independiente del resto de componentes. Sustituible por tus tokens.
const colors = [
  { id: 'neutral', label: 'Neutro', value: '#bcbcbc' },
  { id: 'black', label: 'Negro', value: '#151515' },
  { id: 'red', label: 'Rojo', value: '#ef4545' },
  { id: 'orange', label: 'Naranja', value: '#ff982f' },
  { id: 'green', label: 'Verde', value: '#0bec7b' },
  { id: 'blue', label: 'Azul', value: '#0d74fa' },
  { id: 'indigo', label: 'Índigo', value: '#4e57f4' },
  { id: 'purple', label: 'Violeta', value: '#8b16f0' },
  { id: 'magenta', label: 'Magenta', value: '#d211e5' },
  { id: 'pink', label: 'Rosa', value: '#d785ba' },
]

function select(color) {
  selected.value = color.id
  document.documentElement.style.setProperty('--sidebar-active', color.id === 'neutral'
    ? '#e3e1e5' : `color-mix(in srgb, ${color.value} 22%, #f4f2f7)`)
}

defineExpose({ open })
</script>

<template>
  <Teleport to="body">
    <dialog ref="dialog" class="appearance-panel" aria-labelledby="appearance-title" @cancel.prevent="close" @click="backdrop" @pointerdown="drag.start" @pointermove="drag.move" @pointerup="drag.end" @pointercancel="drag.cancel" @lostpointercapture="drag.cancel" @wheel="drag.wheel">
      <div class="appearance-panel__body" data-dialog-content>
      <header class="appearance-panel__header">
        <h2 id="appearance-title">Apariencia</h2>
        <button class="appearance-panel__close" type="button" aria-label="Cerrar apariencia" @click="close">×</button>
      </header>
      <div class="appearance-panel__palette" role="group" aria-label="Color de acento">
        <button v-for="color in colors" :key="color.id" class="appearance-panel__swatch" :class="{ 'appearance-panel__swatch--black': color.id === 'black' }" type="button" :style="{ '--swatch': color.value }" :aria-label="color.label" :aria-pressed="selected === color.id" @click="select(color)" />
      </div>
      <fieldset class="appearance-panel__navigation">
        <legend>Navegación</legend>
        <!-- Las otras distribuciones se implementarán en sus propios pasos. -->
        <button type="button" aria-pressed="true">Clásica</button>
        <button type="button" disabled>Bonita</button>
        <button type="button" disabled>Guapa</button>
        <button type="button" disabled>Tasks</button>
        <button type="button" disabled>Melon</button>
      </fieldset>
      </div>
    </dialog>
  </Teleport>
</template>
