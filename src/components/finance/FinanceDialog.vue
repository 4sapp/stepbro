<script setup>
import { useSettingsDialog } from '../../composables/useSettingsDialog'
const props = defineProps({ title: String, variant: String })
const { dialog, open, close, backdrop, drag } = useSettingsDialog({ anchored: props.variant === 'filters', placement: props.variant === 'filters' ? 'end' : undefined })
defineExpose({ open, close })
</script>
<template>
  <Teleport to="body"><dialog ref="dialog" class="finance-dialog" :class="variant && `finance-dialog--${variant}`" :aria-label="props.title" @cancel.prevent="close" @click="backdrop" @pointerdown="drag.start" @pointermove="drag.move" @pointerup="drag.end" @pointercancel="drag.cancel" @lostpointercapture="drag.cancel" @wheel="drag.wheel">
    <div data-dialog-content class="finance-dialog__body"><header><h2><svg v-if="variant === 'filters'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M10 6h10M4 12h16M4 18h10"/><circle cx="6" cy="6" r="2"/><circle cx="18" cy="18" r="2"/></svg>{{ title }}</h2><button type="button" aria-label="Cerrar ventana" @click="close">×</button></header><slot /></div>
  </dialog></Teleport>
</template>
