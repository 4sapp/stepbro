<script setup>
import { useSettingsDialog } from '../../composables/useSettingsDialog'
import './AppearancePanel.css'
import { useAppearanceTheme } from '../../composables/useAppearanceTheme'
import { useNavigationLayout } from '../../composables/useNavigationLayout'
const { desktop, desktopChoices } = useNavigationLayout()

const { dialog, open, close, backdrop, drag } = useSettingsDialog({ anchored: true })
const { selected, colors, select } = useAppearanceTheme()

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
      <div class="appearance-panel__palette" data-no-drag role="group" aria-label="Color de acento">
        <button v-for="color in colors" :key="color.id" class="appearance-panel__swatch" :class="{ 'appearance-panel__swatch--black': color.id === 'black' }" type="button" :style="{ '--swatch': color.value }" :aria-label="color.label" :aria-pressed="selected === color.id" @click="select(color)" />
      </div>
      <fieldset class="appearance-panel__navigation appearance-panel__navigation--desktop" data-no-drag>
        <legend>Navegación en PC</legend>
        <label v-for="layout in desktopChoices" :key="layout.id" class="navigation-choice" :title="layout.detail">
          <input v-model="desktop" type="radio" name="desktop-navigation" :value="layout.id" />
          <span class="navigation-choice__preview" :class="`navigation-choice__preview--${layout.id}`" aria-hidden="true"><i /><i /><i /></span>
          <span>{{ layout.label }}</span>
        </label>
      </fieldset>

      </div>
    </dialog>
  </Teleport>
</template>
