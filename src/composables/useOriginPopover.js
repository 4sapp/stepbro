import { onBeforeUnmount, ref } from 'vue'
import gsap from 'gsap'
import { Flip } from 'gsap/Flip'
import { useDragDismiss } from './useDragDismiss'
import { popoverEase, fadeEase, blurEase } from './motionProfiles'

gsap.registerPlugin(Flip)

export function useOriginPopover() {
  const trigger = ref(null)
  const panel = ref(null)
  const expanded = ref(false)
  let timeline
  let wordGhost
  let closing = false
  let ready = false
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches
  const label = () => trigger.value.querySelector('[data-origin-title]')
  const title = () => panel.value.querySelector('[data-origin-title]')
  const layout = () => panel.value.querySelector('.options-menu__layout')
  const surface = () => panel.value.querySelector('[data-origin-surface]')
  const drag = useDragDismiss({ target: panel, canDrag: () => ready && !closing && !document.querySelector('dialog[open]'), dismiss: close })

  function restoreWord() {
    wordGhost?.remove()
    wordGhost = null
    label().style.visibility = ''
    title().style.visibility = ''
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
    expanded.value = false
    closing = false
    ready = false
    trigger.value.focus({ preventScroll: true })
  }

  function close() {
    if (!expanded.value || closing) return
    closing = true
    ready = false
    timeline?.kill()
    if (reduced()) { finishClose(); return }
    // Captura primero, incluso si la apertura o el gesto están a medio camino.
    const word = prepareWord(wordGhost || title(), label())
    const surfaceState = Flip.getState(surface())
    const contentState = Flip.getState(layout())
    gsap.set(panel.value, { x: 0, y: 0, scale: 1 })
    const bounds = panel.value.getBoundingClientRect()
    const origin = trigger.value.getBoundingClientRect()
    gsap.set(surface(), {
      x: origin.left - bounds.left, y: origin.top - bounds.top,
      width: origin.width, height: origin.height,
    })
    gsap.set(layout(), {
      x: origin.left - bounds.left, y: origin.top - bounds.top,
      scaleX: origin.width / bounds.width, scaleY: origin.height / bounds.height,
    })
    timeline = gsap.timeline()
    timeline.add(Flip.from(surfaceState, { targets: surface(), duration: 0.5, scale: false, absolute: false, ease: popoverEase }), 0)
    timeline.to(surface(), { borderRadius: getComputedStyle(trigger.value).borderRadius, duration: 0.5, ease: popoverEase }, 0)
    timeline.add(Flip.from(contentState, { targets: layout(), duration: 2, scale: true, absolute: true, ease: popoverEase }), 0)
    timeline.to(layout(), { borderRadius: 400, opacity: 0, duration: 0.5, ease: fadeEase }, 0)
    timeline.to(layout(), { filter: 'blur(32px)', duration: 0.5, ease: blurEase }, 0)
    // Igual que ModalHost de sb Tasks: el clon del DESTINO vuelve desde
    // el estado del encabezado en una sola transición, sin offsets añadidos.
    timeline.add(Flip.from(word.state, {
      targets: word.ghost, duration: 0.5,
      scale: true, absolute: true, ease: popoverEase,
    }), 0)
    timeline.to(surface(), {
      backgroundColor: getComputedStyle(trigger.value).backgroundColor,
      duration: 0.5, ease: popoverEase,
    }, 0)
    timeline.to(surface(), { opacity: 0, duration: 0.5, ease: 'power3.in' }, 0)
    timeline.call(finishClose, [], 0.5)
  }

  function toggle() {
    if (expanded.value) { close(); return }
    panel.value.showPopover()
    expanded.value = true
    const origin = trigger.value.getBoundingClientRect()
    const width = panel.value.offsetWidth
    const height = panel.value.offsetHeight
    const left = Math.max(12, Math.min(origin.left - 8, innerWidth - width - 12))
    const top = Math.max(12, innerHeight - height - 16)
    gsap.set(panel.value, { left, top })
    gsap.set(title(), { width: 'max-content' })
    const word = prepareWord(label(), title())
    gsap.set(surface(), { x: origin.left - left, y: origin.top - top, width: origin.width, height: origin.height, borderRadius: getComputedStyle(trigger.value).borderRadius })
    gsap.set(layout(), { x: origin.left - left, y: origin.top - top, scaleX: origin.width / width, scaleY: origin.height / height })
    const surfaceState = Flip.getState(surface())
    const contentState = Flip.getState(layout())
    gsap.set(surface(), { x: 0, y: 0, width, height })
    gsap.set(layout(), { x: 0, y: 0, scaleX: 1, scaleY: 1 })
    const duration = reduced() ? 0 : 0.7
    timeline = gsap.timeline({ onComplete: () => { restoreWord(); ready = true } })
    timeline.add(Flip.from(surfaceState, { targets: surface(), duration, scale: false, absolute: false, ease: popoverEase }), 0)
    timeline.to(surface(), { borderRadius: 32, duration: reduced() ? 0 : 0.3, ease: popoverEase }, 0)
    timeline.add(Flip.from(contentState, { targets: layout(), duration, scale: true, absolute: false, ease: popoverEase }), 0)
    timeline.fromTo(layout(), { opacity: 0, filter: reduced() ? 'none' : 'blur(8px)' }, { opacity: 1, filter: 'blur(0px)', duration, ease: popoverEase }, 0)
    timeline.add(Flip.from(word.state, { targets: word.ghost, duration, scale: true, absolute: true, ease: popoverEase }), 0)
  }

  function outside(event) {
    if (document.querySelector('dialog[open]')) return
    if (expanded.value && !panel.value.contains(event.target) && !trigger.value.contains(event.target)) close()
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
    if (trigger.value) label().style.visibility = ''
    document.removeEventListener('pointerdown', outside)
    document.removeEventListener('keydown', escape)
    if (panel.value?.matches(':popover-open')) panel.value.hidePopover()
  })
  return { trigger, panel, expanded, toggle, close, drag }
}
