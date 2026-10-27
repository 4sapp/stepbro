import { onBeforeUnmount, ref } from 'vue'
import gsap from 'gsap'
import { Flip } from 'gsap/Flip'
import {
  emphasizedEase,
  emphasizedDecelerate,
  standardEase,
  standardAccelerate,
  standardDecelerate,
  m3Duration,
} from './motionProfiles'

gsap.registerPlugin(Flip)

export function useMorphPanel() {
  const dialog = ref(null)
  const phase = ref('closed')
  let timeline, trigger, lastOrigin, previousOverflow, surface, layout
  let reduced = false
  const flipId = `movement-${Math.random().toString(36).slice(2)}`
  let triggerOpacity = ''

  function originState() {
    const previous = trigger.getAttribute('data-flip-id')
    trigger.setAttribute('data-flip-id', flipId)
    const state = Flip.getState(trigger)
    if (previous === null) trigger.removeAttribute('data-flip-id')
    else trigger.setAttribute('data-flip-id', previous)
    return state
  }

  function radius(node) {
    const value = getComputedStyle(node).borderTopLeftRadius
    const box = node.getBoundingClientRect()
    return `${value.includes('%') ? parseFloat(value) * Math.min(box.width, box.height) / 100 : parseFloat(value) || 0}px`
  }

  function placePanel() {
    const panel = dialog.value
    const origin = trigger.isConnected ? trigger.getBoundingClientRect() : lastOrigin
    const width = panel.offsetWidth
    const height = panel.offsetHeight
    const mobile = innerWidth < 680
    panel.style.inset = 'auto'
    panel.style.margin = '0'
    gsap.set(panel, {
      left: Math.round(mobile ? (innerWidth - width) / 2 : Math.max(8, Math.min(origin.left + origin.width / 2 - width / 2, innerWidth - width - 8))),
      top: Math.round(mobile ? Math.max(10, (innerHeight - height) / 2) : Math.max(8, Math.min(origin.top + origin.height / 2 - height / 2, innerHeight - height - 8))),
    })
  }
  function resize() {
    if (phase.value === 'open') placePanel()
  }
  window.addEventListener('resize', resize)

  function finishClose() {
    timeline?.kill()
    gsap.killTweensOf(dialog.value)
    // El botón reaparece en el mismo fotograma en que se retira el panel.
    trigger.style.opacity = triggerOpacity
    dialog.value.close()
    dialog.value.removeAttribute('data-backdrop-closing')
    gsap.set([dialog.value, surface, layout], { clearProps: 'all' })
    document.body.style.overflow = previousOverflow
    if (trigger.isConnected) trigger.focus({ preventScroll: true })
    phase.value = 'closed'
    timeline = null
  }

  function close() {
    if (!dialog.value?.open || phase.value === 'closing') return
    phase.value = 'closing'
    dialog.value.setAttribute('data-backdrop-closing', '')
    timeline?.kill()
    if (reduced) { finishClose(); return }
    const panel = dialog.value
    const box = panel.getBoundingClientRect()
    const to = trigger.isConnected ? trigger.getBoundingClientRect() : lastOrigin
    const duration = m3Duration.collapseLarge
    // Conserva el ancho y alto del formulario mientras se encoge la ventana.
    const contentWidth = layout.offsetWidth
    const contentHeight = layout.offsetHeight
    gsap.set(panel, {
      x: 0,
      y: 0,
      scale: 1,
      left: box.left,
      top: box.top,
      width: box.width,
      height: box.height,
      overflow: 'hidden',
      pointerEvents: 'none',
    })
    gsap.set(layout, {
      width: contentWidth,
      height: contentHeight,
      minWidth: contentWidth,
      minHeight: contentHeight,
      overflow: 'hidden',
    })
    timeline = gsap.timeline()
    timeline.to(panel, {
      left: to.left,
      top: to.top,
      width: to.width,
      height: to.height,
      borderRadius: radius(trigger),
      duration,
      ease: standardEase,
    }, 0)
    timeline.to(surface, {
      backgroundColor: getComputedStyle(trigger).backgroundColor,
      boxShadow: '0 0 0 0 rgba(0, 0, 0, 0)',
      duration,
      ease: standardEase,
    }, 0)
    // El contenido saliente se desvanece en el primer tramo sin deformar su escala.
    timeline.to(layout, { opacity: 0, filter: 'blur(8px)', duration: 0.18, ease: standardAccelerate }, 0)
    // Relevo limpio con el botón de origen en el último tramo del colapso.
    timeline.to(panel, { opacity: 0, duration: 0.12, ease: standardAccelerate }, duration - 0.12)
    timeline.to(trigger, { opacity: triggerOpacity || 1, duration: 0.15, ease: standardDecelerate }, duration - 0.15)
    timeline.call(finishClose, [], duration)
  }

  function open(event) {
    const panel = dialog.value
    if (panel.open) return
    trigger = event.currentTarget
    triggerOpacity = trigger.style.opacity
    const start = trigger.getBoundingClientRect()
    lastOrigin = start
    reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    previousOverflow = document.body.style.overflow
    panel.removeAttribute('data-backdrop-closing')
    panel.style.pointerEvents = 'none'
    panel.showModal()
    if (matchMedia('(hover: none)').matches) document.activeElement?.blur?.()
    document.body.style.overflow = 'hidden'
    surface = panel.querySelector('[data-panel-surface]')
    layout = panel.querySelector('[data-panel-layout]')
    panel.setAttribute('data-flip-id', flipId)
    placePanel()
    const state = originState()
    const targetRadius = getComputedStyle(panel).borderTopLeftRadius
    const targetColor = getComputedStyle(surface).backgroundColor
    const height = panel.offsetHeight
    const width = panel.offsetWidth
    // El contenido mantiene sus medidas finales dentro de la superficie
    // que cambia de tamaño; así el recorte sigue el morph en cada fotograma.
    gsap.set(layout, { width, height, minWidth: width, minHeight: height, overflow: 'hidden' })
    panel.style.overflow = 'hidden'
    phase.value = 'opening'
    const duration = reduced ? 0 : m3Duration.expandLarge
    timeline = gsap.timeline({ onComplete() {
      phase.value = 'open'
      panel.style.pointerEvents = ''
      gsap.set(panel, { clearProps: 'width,height,minWidth,maxWidth,minHeight,maxHeight,transform,overflow,borderRadius' })
      gsap.set(surface, { clearProps: 'all' })
      gsap.set(layout, { clearProps: 'all' })
      placePanel()
    } })
    timeline.to(trigger, { opacity: 0, duration: reduced ? 0 : 0.08, ease: standardAccelerate }, 0)
    timeline.add(Flip.from(state, { targets: panel, duration, scale: false, absolute: false, ease: emphasizedEase }), 0)
    timeline.fromTo(panel, { borderRadius: radius(trigger) }, {
      borderRadius: targetRadius, duration, ease: emphasizedEase,
    }, 0)
    timeline.fromTo(surface, { backgroundColor: getComputedStyle(trigger).backgroundColor }, {
      backgroundColor: targetColor, duration, ease: emphasizedEase,
    }, 0)
    timeline.fromTo(layout, { opacity: 0, filter: reduced ? 'none' : 'blur(6px)' }, {
      opacity: 1, filter: 'blur(0px)',
      duration: reduced ? 0 : duration - 0.08,
      ease: emphasizedDecelerate,
    }, reduced ? 0 : 0.08)
  }

  onBeforeUnmount(() => {
    window.removeEventListener('resize', resize)
    timeline?.kill()
    if (trigger) trigger.style.opacity = triggerOpacity
    if (dialog.value?.open) {
      dialog.value.close()
      document.body.style.overflow = previousOverflow
    }
  })
  return { dialog, phase, open, close }
}
