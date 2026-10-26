<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import './PanelDivider.css'

const handle = ref(null)
const width = ref(240)
const maximum = ref(340)
const minimum = 176
const preferenceKey = 'stepbro.sidebar.width'
let preferred = 240
let root
let observer
let drag
let frame
let previousSelection

function apply() {
  if (!root) return
  maximum.value = Math.max(minimum, Math.min(340, root.clientWidth - 360))
  width.value = Math.max(minimum, Math.min(maximum.value, preferred))
  root.style.setProperty('--sidebar-width', `${width.value}px`)
}
function savePreference() {
  try { localStorage.setItem(preferenceKey, String(preferred)) } catch { /* El ancho sigue funcionando sin almacenamiento. */ }
}
function setWidth(value) { preferred = Math.max(minimum, Math.min(maximum.value, value)); apply() }
function start(event) {
  if (event.button !== 0 || !event.isPrimary) return
  event.preventDefault()
  drag = { id: event.pointerId, x: event.clientX, width: width.value }
  previousSelection = document.body.style.userSelect
  document.body.style.userSelect = 'none'
  root.setAttribute('data-resizing', '')
  handle.value.setPointerCapture(event.pointerId)
}
function move(event) {
  if (!drag || drag.id !== event.pointerId) return
  const next = drag.width + event.clientX - drag.x
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(() => setWidth(next))
}
function end(event) {
  if (!drag || (event && event.pointerId !== drag.id)) return
  const id = drag.id
  if (event?.type === 'pointerup') setWidth(drag.width + event.clientX - drag.x)
  drag = null
  cancelAnimationFrame(frame)
  root?.removeAttribute('data-resizing')
  document.body.style.userSelect = previousSelection
  if (handle.value?.hasPointerCapture(id)) handle.value.releasePointerCapture(id)
  savePreference()
}
function keyboard(event) {
  const step = event.shiftKey ? 32 : 16
  const values = { ArrowLeft: width.value - step, ArrowRight: width.value + step, Home: minimum, End: maximum.value }
  if (!(event.key in values)) return
  event.preventDefault(); setWidth(values[event.key]); savePreference()
}
function reset() { setWidth(240); savePreference() }
onMounted(() => {
  root = handle.value.closest('.main-panel')
  try { const stored = Number(localStorage.getItem(preferenceKey)); if (stored >= minimum && stored <= 340) preferred = stored } catch { /* Usa el ancho inicial. */ }
  apply()
  observer = new ResizeObserver(apply)
  observer.observe(root)
})
onBeforeUnmount(() => { end(); observer?.disconnect(); cancelAnimationFrame(frame) })
</script>

<template>
  <div ref="handle" class="panel-divider" role="separator" tabindex="0" aria-label="Ancho de la barra lateral" aria-orientation="vertical" aria-controls="dashboard-sidebar dashboard-content" :aria-valuemin="minimum" :aria-valuemax="maximum" :aria-valuenow="width" @pointerdown="start" @pointermove="move" @pointerup="end" @pointercancel="end" @lostpointercapture="end" @keydown="keyboard" @dblclick="reset" />
</template>
