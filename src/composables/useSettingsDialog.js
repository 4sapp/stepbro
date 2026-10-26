import { onBeforeUnmount, ref } from 'vue'
import gsap from 'gsap'
import { popoverEase, fadeEase, blurEase, liquidSizeEase, createPositionSpring } from './motionProfiles'
import { useDragDismiss } from './useDragDismiss'

export function useSettingsDialog({ anchored = false, placement, responsive = false } = {}) {
  const dialog = ref(null)
  let timeline
  let spring
  let returnFocus
  let destination
  let closing = false
  let ready = false
  let content
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches
  const drag = useDragDismiss({ target: dialog, canDrag: () => ready && !closing, dismiss: close })

  function finish() {
    spring?.stop()
    timeline?.kill()
    ready = false
    closing = false
    dialog.value.close()
    dialog.value.removeAttribute('data-backdrop-closing')
    gsap.set(dialog.value, { clearProps: 'all' })
    gsap.set(content, { clearProps: 'all' })
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true })
  }

  function originRect() {
    if (returnFocus?.isConnected) return returnFocus.getBoundingClientRect()
    return { left: innerWidth / 2, top: innerHeight / 2, width: 1, height: 1 }
  }

  function open(origin) {
    if (dialog.value.open) return
    returnFocus = origin || document.activeElement
    content = dialog.value.querySelector('[data-dialog-content]')
    dialog.value.removeAttribute('data-backdrop-closing')
    dialog.value.showModal()
    if (anchored && placement !== 'end') {
      const menu = origin?.closest('.options-menu')?.getBoundingClientRect()
      gsap.set(dialog.value, {
        left: Math.max(12, Math.min(menu?.left ?? 12, innerWidth - dialog.value.offsetWidth - 12)),
        top: Math.max(12, innerHeight - dialog.value.offsetHeight - 12),
      })
    }
    const box = dialog.value.getBoundingClientRect()
    const contentWidth = dialog.value.clientWidth
    const contentHeight = dialog.value.clientHeight
    destination = { left: box.left, top: box.top, width: box.width, height: box.height, radius: getComputedStyle(dialog.value).borderRadius }
    const from = originRect()
    gsap.set(dialog.value, { position: 'fixed', margin: 0, right: 'auto', bottom: 'auto', left: from.left, top: from.top, width: from.width, height: from.height, overflow: 'hidden', borderRadius: getComputedStyle(returnFocus).borderRadius, filter: reduced() ? 'none' : 'blur(8px)' })
    gsap.set(content, { width: contentWidth, height: contentHeight, transformOrigin: 'center center' })
    if (reduced()) {
      gsap.set(dialog.value, { left: box.left, top: box.top, width: box.width, height: box.height, borderRadius: destination.radius, filter: 'none', overflow: 'auto' })
      gsap.set(content, { clearProps: 'width,height' })
      ready = true
      return
    }
    timeline = gsap.timeline({ onComplete: () => { ready = true; gsap.set(content, { clearProps: 'width,height' }); dialog.value.style.overflow = 'auto' } })
    // El contorno acompaña al desenfoque del contenido durante la transición.
    timeline.to(dialog.value, { filter: 'blur(0px)', duration: anchored ? 0.7 : 0.3, ease: anchored ? popoverEase : 'power1.out' }, 0)
    if (anchored) {
      timeline.to(dialog.value, { left: box.left, top: box.top, width: box.width, height: box.height, borderRadius: destination.radius, duration: 0.7, ease: popoverEase }, 0)
      timeline.fromTo(content, { scaleX: from.width / box.width, scaleY: from.height / box.height, opacity: 0, filter: 'blur(8px)' }, { scaleX: 1, scaleY: 1, opacity: 1, filter: 'blur(0px)', duration: 0.7, ease: popoverEase }, 0)
    } else {
      spring = createPositionSpring(dialog.value)
      spring.move({ x: box.left, y: box.top }, { stiffness: 144, damping: 14, velocity: 2400 })
      timeline.to(dialog.value, { width: box.width, height: box.height, duration: 0.3, ease: liquidSizeEase }, 0)
      timeline.to(dialog.value, { borderRadius: destination.radius, duration: innerWidth < 680 ? 1.2 : 0.7, ease: innerWidth < 680 ? 'power1.inOut' : 'power1.out' }, 0)
      timeline.fromTo(content, { scale: 2, filter: 'blur(8px)', opacity: 0 }, { scale: 1, filter: 'blur(0px)', duration: 0.3, ease: 'power1.out' }, 0)
      timeline.to(content, { opacity: 1, duration: 0.4, ease: 'power2.out' }, 0.15)
    }
  }

  function close() {
    if (!dialog.value?.open || closing) return
    closing = true
    dialog.value.setAttribute('data-backdrop-closing', '')
    ready = false
    timeline?.kill()
    if (reduced()) { finish(); return }
    const to = originRect()
    // Si se cierra durante el arrastre, conserva la posición visual actual.
    const box = dialog.value.getBoundingClientRect()
    gsap.set(dialog.value, { x: 0, y: 0, scale: 1, left: box.left, top: box.top, width: box.width, height: box.height, overflow: 'hidden' })
    timeline = gsap.timeline({ onComplete: finish })
    timeline.to(dialog.value, { filter: 'blur(12px)', opacity: 0, duration: 0.5, ease: blurEase }, 0)
    if (anchored) {
      timeline.to(dialog.value, { left: to.left, top: to.top, width: to.width, height: to.height, borderRadius: getComputedStyle(returnFocus).borderRadius, duration: 0.5, ease: popoverEase }, 0)
      timeline.to(content, { scaleX: to.width / destination.width, scaleY: to.height / destination.height, duration: 2, ease: popoverEase }, 0)
      timeline.to(content, { opacity: 0, duration: 0.5, ease: fadeEase }, 0)
      timeline.to(content, { filter: 'blur(32px)', duration: 0.5, ease: blurEase }, 0)
      timeline.call(finish, [], 0.5)
    } else {
      spring.move({ x: to.left, y: to.top }, { stiffness: 130, damping: 18 })
      timeline.to(dialog.value, { width: to.width, height: to.height, borderRadius: getComputedStyle(returnFocus).borderRadius, duration: 0.25, ease: 'power1.out' }, 0)
      timeline.to(content, { scale: 2, filter: 'blur(8px)', duration: 0.3, ease: 'power1.out' }, 0)
      // Muelle amortiguado equivalente al canal de opacidad (137 / 20).
      const omega = Math.sqrt(137 - 100)
      timeline.to(content, { opacity: 0, duration: 1.1, ease: p => 1 - Math.exp(-10 * p * 1.1) * (Math.cos(omega * p * 1.1) + 10 / omega * Math.sin(omega * p * 1.1)) }, 0)
    }
  }

  function resize() {
    if (!responsive || !dialog.value?.open || closing) return
    spring?.stop()
    timeline?.kill()
    gsap.set(dialog.value, { clearProps: 'all' })
    gsap.set(content, { clearProps: 'all' })
    const box = dialog.value.getBoundingClientRect()
    destination = { left: box.left, top: box.top, width: box.width, height: box.height, radius: getComputedStyle(dialog.value).borderRadius }
    ready = true
  }
  if (responsive) window.addEventListener('resize', resize)

  function backdrop(event) {
    if (event.target !== dialog.value) return
    const r = dialog.value.getBoundingClientRect()
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) close()
  }
  onBeforeUnmount(() => { window.removeEventListener('resize', resize); timeline?.kill(); spring?.stop(); if (dialog.value?.open) dialog.value.close() })
  return { dialog, open, close, backdrop, drag }
}
