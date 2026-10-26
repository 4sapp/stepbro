<script setup>
import { ref } from 'vue'
import './TouchButton.css'

defineProps({ label: { type: String, required: true }, iconOnly: Boolean })
const button = ref(null)
const ripples = ref([])
let rippleId = 0

function ripple(event) {
  const bounds = button.value.getBoundingClientRect()
  const id = ++rippleId
  ripples.value.push({
    id,
    x: event.clientX - bounds.left,
    y: event.clientY - bounds.top,
    size: Math.max(bounds.width, bounds.height) * 2,
  })
}
</script>

<template>
  <button ref="button" class="touch-button" :class="{ 'touch-button--icon-only': iconOnly }" :aria-label="iconOnly ? label : undefined" type="button" @pointerdown="ripple">
    <span class="touch-button__ripples" aria-hidden="true">
      <span
        v-for="drop in ripples"
        :key="drop.id"
        class="touch-button__ripple"
        :style="{ left: `${drop.x}px`, top: `${drop.y}px`, width: `${drop.size}px`, height: `${drop.size}px` }"
        @animationend="ripples = ripples.filter(item => item.id !== drop.id)"
      />
    </span>
    <span class="touch-button__icon" data-shared-item="icon" aria-hidden="true">+</span>
    <span :class="{ 'visually-hidden': iconOnly }" data-shared-item="title">{{ label }}</span>
  </button>
</template>
