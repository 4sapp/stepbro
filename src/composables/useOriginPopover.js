import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import gsap from 'gsap'
import { Flip } from 'gsap/Flip'
import { useDragDismiss } from './useDragDismiss'
import { useNavigationLayout } from './useNavigationLayout'
import {
  emphasizedEase,
  emphasizedDecelerate,
  standardEase,
  standardAccelerate,
  standardDecelerate,
  m3Duration,
} from './motionProfiles'

gsap.registerPlugin(Flip)

export function useOriginPopover() {
  const trigger = ref(null)
  const activeTrigger = ref(null)
  const source = () => activeTrigger.value || trigger.value
  const panel = ref(null)
  const expanded = ref(false)
  const { desktop, mobile: mobileLayout } = useNavigationLayout()
  watch([desktop, mobileLayout], async () => {
    await nextTick()
    if (expanded.value && !closing) placePanel()
  })
  let timeline
  let wordGhost
  let closing = false
  let ready = false
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches
  const label = () => source().querySelector('[data-origin-title]')
  const title = () => panel.value.querySelector('[data-origin-title]')
  const layout = () => panel.value.querySelector('.options-menu__layout')
  const surface = () => panel.value.querySelector('[data-origin-surface]')
  // GSAP conserva la unidad inicial: un botón al 50% debe convertirse a px
  // antes de animarse hacia las esquinas del panel.
  function triggerRadius() {
    const value = getComputedStyle(source()).borderTopLeftRadius
    const box = source().getBoundingClientRect()
    return `${value.includes('%') ? parseFloat(value) * Math.min(box.width, box.height) / 100 : parseFloat(value) || 0}px`
  }
  const drag = useDragDismiss({ target: panel, canDrag: () => ready && !closing && !document.querySelector('dialog[open]'), dismiss: close })

  function placePanel() {
    const origin = source().getBoundingClientRect()
    const mobile = innerWidth <= 640
    const docked = desktop.value === 'dock'
    const sidebar = source().closest('.dashboard-sidebar').getBoundingClientRect()
    // En la clásica el menú se mantiene dentro de su barra lateral.
    const width = !mobile && desktop.value === 'classic'
      ? Math.min(240, sidebar.width - 24) : Math.min(240, innerWidth - 24)
    const upward = origin.top + origin.height / 2 > innerHeight / 2
    const bottom = Math.min(innerHeight - 12, origin.bottom + 8)
    const start = Math.max(12, origin.top - 8)
    const maxHeight = Math.max(48, upward ? bottom - 12 : innerHeight - start - 12)
    panel.value.style.setProperty('--options-max-height', `${maxHeight}px`)
    panel.value.style.width = `${width}px`
    const height = panel.value.offsetHeight
    const left = Math.max(12, Math.min(
      mobile || docked ? origin.right + 8 - width : origin.left - 8,
      innerWidth - width - 12,
    ))
    const top = upward ? Math.max(12, bottom - height) : start
    gsap.set(panel.value, { left, top })
    return { origin, width, height, left, top }
  }

  function restoreWord() {
    wordGhost?.remove()
    wordGhost = null
    label().style.visibility = ''
    title().style.visibility = ''
  }

  function visibleTriggerLabel() {
    // Solo «Opciones» comparte texto con el panel. La marca se desvanece entera.
    if (source() !== trigger.value) return false
    const node = label()
    const box = node.getBoundingClientRect()
    const style = getComputedStyle(node)
    return style.display !== 'none' && style.clipPath === 'none' && box.width > 1 && box.height > 1
  }

  // Cada dirección utiliza el estilo de su DESTINO: encabezado al abrir y
  // etiqueta del botón al cerrar. Flip empareja la copia con la geometría previa.
  function prepareWord(from, destination) {
    const id = 'options-shared-word'
    const previousId = from.getAttribute('data-flip-id')
    from.setAttribute('data-flip-id', id)
    const state = Flip.getState(from)
    if (previousId === null) from.removeAttribute('data-flip-id')
    else from.setAttribute('data-flip-id', previousId)
    const box = destination.getBoundingClientRect()
    const parent = panel.value.getBoundingClientRect()
    const style = getComputedStyle(destination)
    const ghost = document.createElement('span')
    ghost.textContent = destination.textContent
    ghost.setAttribute('aria-hidden', 'true')
    ghost.setAttribute('data-flip-id', id)
    ghost.setAttribute('data-word-ghost', '')
    for (const property of ['font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'color', 'text-transform', 'text-decoration', 'font-kerning', 'font-feature-settings', 'font-variation-settings']) {
      ghost.style.setProperty(property, style.getPropertyValue(property))
    }
    Object.assign(ghost.style, {
      position: 'absolute', left: `${box.left - parent.left}px`, top: `${box.top - parent.top}px`,
      width: `${box.width}px`, height: `${box.height}px`, margin: '0', padding: '0',
      display: 'block', whiteSpace: 'nowrap', pointerEvents: 'none', transformOrigin: '0 0', zIndex: '2',
    })
    wordGhost?.remove()
    wordGhost = ghost
    panel.value.append(ghost)
    label().style.visibility = 'hidden'
    title().style.visibility = 'hidden'
    return { state, ghost }
  }

  function finishClose() {
    timeline?.kill()
    restoreWord()
    panel.value.hidePopover()
    gsap.set([panel.value, surface(), layout()], { clearProps: 'all' })
    gsap.set(source(), { clearProps: 'opacity' })
    expanded.value = false
    closing = false
    ready = false
    source().focus({ preventScroll: true })
    activeTrigger.value = null
  }

  function close() {
    if (!expanded.value || closing) return
    closing = true
    ready = false
    timeline?.kill()
    if (reduced()) { finishClose(); return }
    const word = visibleTriggerLabel() ? prepareWord(wordGhost || title(), label()) : null
    if (!word) restoreWord()
    const bounds = panel.value.getBoundingClientRect()
    const origin = source().getBoundingClientRect()
    const contentWidth = layout().offsetWidth
    const contentHeight = layout().offsetHeight
    gsap.set(panel.value, {
      x: 0,
      y: 0,
      scale: 1,
      left: bounds.left,
      top: bounds.top,
      width: bounds.width,
      height: bounds.height,
      overflow: 'hidden',
    })
    const surfaceState = Flip.getState(surface())
    gsap.set(layout(), {
      width: contentWidth,
      height: contentHeight,
      minWidth: contentWidth,
      minHeight: contentHeight,
      overflow: 'hidden',
    })
    gsap.set(surface(), {
      x: origin.left - bounds.left, y: origin.top - bounds.top,
      width: origin.width, height: origin.height,
    })
    const duration = m3Duration.collapseMedium
    timeline = gsap.timeline()
    timeline.add(Flip.from(surfaceState, { targets: surface(), duration, scale: false, absolute: false, ease: standardEase }), 0)
    timeline.to(surface(), {
      borderRadius: triggerRadius(),
      backgroundColor: getComputedStyle(source()).backgroundColor,
      duration,
      ease: standardEase,
    }, 0)
    timeline.to(layout(), {
      opacity: 0,
      filter: 'blur(6px)',
      duration: 0.15,
      ease: standardAccelerate,
    }, 0)
    if (word) timeline.add(Flip.from(word.state, {
      targets: word.ghost,
      duration,
      scale: true,
      absolute: true,
      ease: standardEase,
    }), 0)
    timeline.to(surface(), { opacity: 0, duration: 0.1, ease: standardAccelerate }, duration - 0.1)
    timeline.to(source(), { opacity: 1, duration: 0.12, ease: standardDecelerate }, duration - 0.12)
    timeline.call(finishClose, [], duration)
  }

  function toggle(event) {
    if (expanded.value) { close(); return }
    activeTrigger.value = event?.currentTarget || trigger.value
    panel.value.style.pointerEvents = 'none'
    panel.value.showPopover()
    expanded.value = true
    const { origin, width, height, left, top } = placePanel()
    gsap.set(title(), { width: 'max-content' })
    const word = visibleTriggerLabel() ? prepareWord(label(), title()) : null
    gsap.set(surface(), { x: origin.left - left, y: origin.top - top, width: origin.width, height: origin.height, borderRadius: triggerRadius() })
    const surfaceState = Flip.getState(surface())
    gsap.set(surface(), { x: 0, y: 0, width, height })
    const duration = reduced() ? 0 : m3Duration.expandMedium
    timeline = gsap.timeline({
      onComplete: () => {
        restoreWord()
        gsap.set(surface(), { clearProps: 'borderRadius' })
        panel.value.style.pointerEvents = ''
        ready = true
      },
    })
    timeline.to(source(), { opacity: 0, duration: reduced() ? 0 : 0.08, ease: standardAccelerate }, 0)
    timeline.add(Flip.from(surfaceState, { targets: surface(), duration, scale: false, absolute: false, ease: emphasizedEase }), 0)
    timeline.to(surface(), { borderRadius: '32px', duration, ease: emphasizedEase }, 0)
    timeline.fromTo(
      layout(),
      { opacity: 0, y: (origin.top - top) * 0.15, filter: reduced() ? 'none' : 'blur(6px)' },
      { opacity: 1, y: 0, filter: 'blur(0px)', duration: reduced() ? 0 : duration - 0.06, ease: emphasizedDecelerate },
      reduced() ? 0 : 0.06,
    )
    if (word) timeline.add(Flip.from(word.state, { targets: word.ghost, duration, scale: true, absolute: true, ease: emphasizedEase }), 0)
  }

  function outside(event) {
    if (document.querySelector('dialog[open]')) return
    if (expanded.value && !panel.value.contains(event.target) && !source().contains(event.target)) close()
  }
  function escape(event) {
    if (event.key !== 'Escape' || document.querySelector('dialog[open]')) return
    if (expanded.value) { event.preventDefault(); close() }
  }
  document.addEventListener('pointerdown', outside)
  document.addEventListener('keydown', escape)
  onBeforeUnmount(() => {
    timeline?.kill()
    wordGhost?.remove()
    if (source()) { label().style.visibility = ''; gsap.set(source(), { clearProps: 'opacity' }) }
    document.removeEventListener('pointerdown', outside)
    document.removeEventListener('keydown', escape)
    if (panel.value?.matches(':popover-open')) panel.value.hidePopover()
  })
  return { trigger, panel, expanded, toggle, close, drag }
}
