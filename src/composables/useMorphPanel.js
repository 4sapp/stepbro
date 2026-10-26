import { onBeforeUnmount, ref } from 'vue'
import gsap from 'gsap'
import { Flip } from 'gsap/Flip'

gsap.registerPlugin(Flip)
import { popoverEase, fadeEase, blurEase } from './motionProfiles'

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
    panel.style.inset = 'auto'
    panel.style.margin = '0'
    gsap.set(panel, {
      left: Math.round(Math.max(innerWidth < 680 ? 0 : 8, Math.min(origin.left + origin.width / 2 - width / 2, innerWidth - width - (innerWidth < 680 ? 0 : 8)))),
      top: Math.round(Math.max(innerWidth < 680 ? 0 : 8, Math.min(origin.top + origin.height / 2 - height / 2, innerHeight - height - (innerWidth < 680 ? 0 : 8)))),
    })
  }
  function resize() {
    if (phase.value === 'open') placePanel()
  }
  window.addEventListener('resize', resize)

  function finishClose() {
    timeline?.kill()
    gsap.killTweensOf(dialog.value)
    dialog.value.close()
    dialog.value.removeAttribute('data-backdrop-closing')
    gsap.set([dialog.value, surface, layout], { clearProps: 'all' })
    document.body.style.overflow = previousOverflow
    trigger.style.opacity = triggerOpacity
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
    const state = originState()
    panel.style.overflow = 'hidden'
    layout.style.overflow = 'hidden'
    panel.style.pointerEvents = 'none'
    timeline = gsap.timeline()
    timeline.add(Flip.to(state, { targets: panel, duration: 0.5, scale: false, absolute: false, ease: popoverEase }), 0)
    timeline.to(panel, { borderRadius: radius(trigger), duration: 0.5, ease: popoverEase }, 0)
    timeline.to(surface, { backgroundColor: getComputedStyle(trigger).backgroundColor, duration: 0.5, ease: popoverEase }, 0)
    // La trayectoria del contenido dura 2 s en el original; se desvanece
    // durante los primeros 0.5 s mientras la superficie llega antes al botón.
    timeline.to(layout, {
      x: 0, y: 0, scaleX: lastOrigin.width / layout.offsetWidth,
      scaleY: lastOrigin.height / layout.offsetHeight,
      duration: 2, ease: popoverEase,
    }, 0)
    timeline.to(layout, { borderRadius: '400px', duration: 0.5, ease: fadeEase }, 0)
    timeline.to(layout, { filter: 'blur(32px)', duration: 0.5, ease: blurEase }, 0)
    timeline.to(layout, { opacity: 0, duration: 0.5, ease: fadeEase }, 0)
    timeline.to(trigger, { opacity: triggerOpacity || 1, duration: 0.3, ease: 'power2.out' }, 0.2)
    timeline.call(finishClose, [], 0.5)
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
    panel.showModal()
    document.body.style.overflow = 'hidden'
    surface = panel.querySelector('[data-panel-surface]')
    layout = panel.querySelector('[data-panel-layout]')
    panel.setAttribute('data-flip-id', flipId)
    placePanel()
    const state = originState()
    const mobile = innerWidth < 680
    const targetRadius = getComputedStyle(panel).borderTopLeftRadius
    const targetColor = getComputedStyle(surface).backgroundColor
    const height = panel.offsetHeight
    const width = panel.offsetWidth
    // El contenido mantiene sus medidas finales dentro de la superficie
    // que cambia de tamaño; así el recorte sigue el morph en cada fotograma.
    gsap.set(layout, { width, height, minWidth: width, minHeight: height, overflow: 'hidden' })
    panel.style.overflow = 'hidden'
    phase.value = 'opening'
    const duration = reduced ? 0 : 0.7
    timeline = gsap.timeline({ onComplete() {
      phase.value = 'open'
      gsap.set(panel, { clearProps: 'width,height,minWidth,maxWidth,minHeight,maxHeight,transform,overflow,borderRadius' })
      gsap.set(surface, { clearProps: 'all' })
      gsap.set(layout, { clearProps: 'all' })
      placePanel()
    } })
    timeline.to(trigger, { opacity: 0, duration: reduced ? 0 : 0.08 }, 0)
    timeline.add(Flip.from(state, { targets: panel, duration, scale: false, absolute: false, ease: popoverEase }), 0)
    timeline.fromTo(panel, { borderRadius: radius(trigger) }, {
      borderRadius: targetRadius, duration: reduced ? 0 : mobile ? 1.2 : 0.3,
      ease: mobile ? 'power2.inOut' : popoverEase,
    }, 0)
    timeline.fromTo(surface, { backgroundColor: getComputedStyle(trigger).backgroundColor }, {
      backgroundColor: targetColor, duration: reduced ? 0 : 0.3, ease: popoverEase,
    }, 0)
    // La superficie ya se desplaza desde el botón. El contenido solo escala
    // en sus coordenadas locales: otro Flip aquí aplica dos veces el origen.
    timeline.fromTo(layout, {
      x: 0, y: 0, scaleX: start.width / width, scaleY: start.height / height,
    }, { x: 0, y: 0, scaleX: 1, scaleY: 1, duration, ease: popoverEase }, 0)
    timeline.fromTo(layout, { opacity: 0, filter: reduced ? 'none' : 'blur(8px)' }, {
      opacity: 1, filter: 'blur(0px)', duration, ease: popoverEase,
    }, 0)
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
