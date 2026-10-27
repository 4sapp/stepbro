<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, useAttrs, useId } from 'vue'
import gsap from 'gsap'
import {
  emphasizedEase,
  emphasizedDecelerate,
  standardEase,
  standardAccelerate,
  standardDecelerate,
  m3Duration,
} from '../composables/motionProfiles'
import { useDragDismiss } from '../composables/useDragDismiss'
import './FinanceSelect.css'
defineOptions({ inheritAttrs: false })
const props = defineProps({ modelValue: [String, Number], required: Boolean })
const emit = defineEmits(['update:modelValue'])
const attrs = useAttrs()
const id = useId()
const native = ref(null)
const trigger = ref(null)
const panel = ref(null)
const opened = ref(false)
const closing = ref(false)
const content = ref(null)
const drag = useDragDismiss({ target: panel, canDrag: () => opened.value && !closing.value, dismiss: () => close(true) })
let timeline
let generation = 0
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches
const options = ref([])
const cursor = ref(-1)
const text = ref('')
let observer
let dialogObserver
let search = ''
let searchTimer
function sync() {
  const next = [...native.value.options].map(o => ({ value: o.value, label: o.textContent.trim(), disabled: o.disabled }))
  if (JSON.stringify(next) !== JSON.stringify(options.value)) options.value = next
  text.value = next.find(o => o.value === String(props.modelValue ?? ''))?.label || 'Selecciona una opción'
}
function finishClose() {
  timeline?.kill()
  panel.value?.hidePopover()
  opened.value = false
  closing.value = false
  if (trigger.value) gsap.set(trigger.value, { clearProps: 'opacity' })
  if (panel.value) gsap.set(panel.value, { clearProps: 'opacity,backgroundColor,borderRadius,transform' })
  if (content.value) gsap.set(content.value, { clearProps: 'opacity,filter,transform,borderRadius,width,height,minWidth,minHeight' })
}
function close(restore = false, immediate = false) {
  if (!opened.value || closing.value) return
  generation++
  timeline?.kill()
  closing.value = true
  if (restore) trigger.value.focus({ preventScroll: true })
  if (immediate || reduced()) { finishClose(); return }
  const origin = trigger.value.getBoundingClientRect()
  const current = panel.value.getBoundingClientRect()
  const style = getComputedStyle(trigger.value)
  const bounds = content.value.getBoundingClientRect()
  const duration = m3Duration.collapseMedium
  gsap.set(panel.value, {
    x: 0,
    y: 0,
    scale: 1,
    left: current.left,
    top: current.top,
    width: current.width,
    height: current.height,
  })
  // El contenido conserva sus dimensiones reales mientras la superficie se recorta.
  gsap.set(content.value, {
    width: bounds.width,
    height: bounds.height,
    minWidth: bounds.width,
    minHeight: bounds.height,
    transformOrigin: '0 0',
  })
  timeline = gsap.timeline()
  timeline.to(panel.value, {
    left: origin.left, top: origin.top, width: origin.width, height: origin.height,
    borderRadius: style.borderRadius, backgroundColor: style.backgroundColor,
    duration, ease: standardEase,
  }, 0)
  timeline.to(content.value, { opacity: 0, filter: 'blur(6px)', duration: 0.15, ease: standardAccelerate }, 0)
  timeline.to(panel.value, { opacity: 0, duration: 0.1, ease: standardAccelerate }, duration - 0.1)
  timeline.to(trigger.value, { opacity: 1, duration: 0.12, ease: standardDecelerate }, duration - 0.12)
  timeline.call(finishClose, [], duration)
}
function position() {
  const box = trigger.value.getBoundingClientRect()
  const width = Math.min(box.width, innerWidth - 32)
  const maxHeight = Math.min(576, Math.max(48, innerHeight - 32))
  // Igual que la referencia: la lista sustituye al campo, con 8 px de margen arriba.
  Object.assign(panel.value.style, {
    width: `${width}px`, height: 'auto', maxHeight: `${maxHeight}px`,
    left: `${Math.max(16, Math.min(box.left, innerWidth - width - 16))}px`, top: '16px',
  })
  content.value.style.maxHeight = `${maxHeight - 16}px`
  const height = panel.value.offsetHeight
  const top = Math.max(16, Math.min(box.top - 8, innerHeight - height - 16))
  panel.value.style.top = `${top}px`
  panel.value.style.height = `${height}px`
  return { box, width, height, top, left: parseFloat(panel.value.style.left) }
}
async function open() {
  if (opened.value && !closing.value) return
  timeline?.kill()
  if (opened.value) finishClose()
  const token = ++generation
  sync()
  opened.value = true
  cursor.value = options.value.findIndex(o => o.value === String(props.modelValue ?? '') && !o.disabled)
  if (cursor.value < 0) cursor.value = options.value.findIndex(o => !o.disabled)
  panel.value.showPopover()
  await nextTick()
  if (token !== generation || !opened.value) return
  gsap.set(panel.value, { clearProps: 'opacity,backgroundColor,borderRadius,transform' })
  gsap.set(content.value, { clearProps: 'opacity,filter,transform,borderRadius,width,height' })
  const target = position()
  const destinationColor = getComputedStyle(panel.value).backgroundColor
  reveal()
  panel.value.focus({ preventScroll: true })
  if (reduced()) { trigger.value.style.opacity = '0'; return }
  const style = getComputedStyle(trigger.value)
  const duration = m3Duration.expandMedium
  timeline = gsap.timeline()
  timeline.fromTo(panel.value, {
    left: target.box.left, top: target.box.top, width: target.box.width, height: target.box.height,
    borderRadius: style.borderRadius, backgroundColor: style.backgroundColor,
  }, {
    left: target.left, top: target.top, width: target.width, height: target.height,
    borderRadius: '32px', backgroundColor: destinationColor, duration, ease: emphasizedEase,
  }, 0)
  timeline.fromTo(content.value, {
    y: (target.box.top - target.top) * 0.25, opacity: 0, filter: 'blur(6px)',
  }, { y: 0, opacity: 1, filter: 'blur(0px)', duration: duration - 0.06, ease: emphasizedDecelerate }, 0.06)
  timeline.to(trigger.value, { opacity: 0, duration: 0.08, ease: standardAccelerate }, 0)
}
function reveal() { panel.value?.querySelector(`[id="${id}-option-${cursor.value}"]`)?.scrollIntoView({ block: 'nearest' }) }
function choose(index) {
  if (closing.value) return
  const option = options.value[index]
  if (!option || option.disabled) return
  emit('update:modelValue', option.value)
  text.value = option.label
  close(true)
}
async function keyboard(event) {
  const keys = ['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' ', 'Escape', 'Tab']
  if (!keys.includes(event.key) && !(event.key.length === 1 && !event.ctrlKey && !event.metaKey)) return
  if (event.key === 'Tab') { close(); return }
  if (event.key === 'Escape') { if (opened.value) { event.preventDefault(); event.stopPropagation(); close(true) }; return }
  event.preventDefault()
  if (!opened.value) { await open(); if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) return }
  const enabled = options.value.map((o, i) => o.disabled ? -1 : i).filter(i => i >= 0)
  const at = enabled.indexOf(cursor.value)
  if (event.key === 'ArrowDown') cursor.value = enabled[(at + 1) % enabled.length] ?? -1
  else if (event.key === 'ArrowUp') cursor.value = enabled[(at - 1 + enabled.length) % enabled.length] ?? -1
  else if (event.key === 'Home') cursor.value = enabled[0] ?? -1
  else if (event.key === 'End') cursor.value = enabled.at(-1) ?? -1
  else if (['Enter', ' '].includes(event.key)) { choose(cursor.value); return }
  else {
    clearTimeout(searchTimer); search += event.key.toLocaleLowerCase()
    const index = enabled.find(i => options.value[i].label.toLocaleLowerCase().startsWith(search))
    if (index !== undefined) cursor.value = index
    searchTimer = setTimeout(() => { search = '' }, 600)
  }
  await nextTick(); reveal()
}
function resized() { close(false, true) }
function outside(event) { if (!panel.value.contains(event.target) && !trigger.value.contains(event.target)) close() }
function scroll(event) { if (opened.value && !panel.value.contains(event.target)) close(false, true) }
onMounted(() => {
  sync()
  observer = new MutationObserver(sync)
  observer.observe(native.value, { childList: true, subtree: true, characterData: true, attributes: true })
  const host = trigger.value.closest('dialog')
  if (host) {
    dialogObserver = new MutationObserver(() => {
      if (!host.open && opened.value) {
        generation++; timeline?.kill(); finishClose()
      }
    })
    dialogObserver.observe(host, { attributes: true, attributeFilter: ['open'] })
  }
  document.addEventListener('pointerdown', outside)
  document.addEventListener('scroll', scroll, true)
  window.addEventListener('resize', resized)
})
onBeforeUnmount(() => {
  generation++; timeline?.kill()
  if (trigger.value) { gsap.killTweensOf(trigger.value); trigger.value.style.opacity = '' }
  observer?.disconnect(); dialogObserver?.disconnect(); clearTimeout(searchTimer)
  document.removeEventListener('pointerdown', outside)
  document.removeEventListener('scroll', scroll, true)
  window.removeEventListener('resize', resized)
})
</script>

<template>
  <span class="finance-select" :class="attrs.class">
    <button :id="`${id}-trigger`" ref="trigger" class="finance-select__trigger" type="button" role="combobox" aria-haspopup="listbox" :aria-label="attrs['aria-label']" :aria-expanded="opened" :aria-required="required || undefined" :aria-controls="`${id}-list`" :aria-activedescendant="opened && cursor >= 0 ? `${id}-option-${cursor}` : undefined" @click="opened && !closing ? close() : open()" @keydown="keyboard">
      <span>{{ options.find(o => o.value === String(modelValue ?? ''))?.label || text }}</span>
      <svg width="24" height="24" viewBox="0 -960 960 960" aria-hidden="true"><path d="M459-381 314-526q-3-3-4.5-6.5T308-540q0-8 5.5-14t14.5-6h304q9 0 14.5 6t5.5 14q0 2-6 14L501-381q-5 5-10 7t-11 2q-6 0-11-2t-10-7Z" /></svg>
    </button>
    <select ref="native" class="finance-select__native" :value="modelValue" :required="required" tabindex="-1" aria-hidden="true" @vue:updated="sync" @invalid.prevent="trigger.focus(); open()"><slot /></select>
    <div :id="`${id}-list`" ref="panel" class="finance-select__list" :class="{ 'is-closing': closing }" popover="manual" tabindex="-1" role="listbox" :aria-labelledby="`${id}-trigger`" @keydown="keyboard" @click.self="close()" @pointerdown.stop="drag.start" @pointermove.stop="drag.move" @pointerup.stop="drag.end" @pointercancel.stop="drag.cancel" @lostpointercapture.stop="drag.cancel">
      <div ref="content" class="finance-select__content">
      <div v-for="(option, index) in options" :id="`${id}-option-${index}`" :key="option.value" class="finance-select__option" :class="{ 'is-pointed': cursor === index }" role="option" :aria-selected="option.value === String(modelValue ?? '')" :aria-disabled="option.disabled || undefined" @pointermove="$event.pointerType === 'mouse' && !option.disabled && (cursor = index)" @pointerdown.prevent @click.stop.prevent="choose(index)"><span class="finance-select__label">{{ option.label }}</span></div>
      <p v-if="!options.length" class="finance-select__empty">No hay opciones</p>
      </div>
    </div>
  </span>
</template>
