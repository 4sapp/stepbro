import { onBeforeUnmount, ref } from 'vue'
import gsap from 'gsap'
import {
  emphasizedEase,
  emphasizedDecelerate,
  standardEase,
  standardAccelerate,
  m3Duration,
  chatMorphEase,
} from './motionProfiles'
import { useDragDismiss } from './useDragDismiss'

export function useSettingsDialog({ anchored = false, placement, responsive = false, fitContent = false, motion } = {}) {
  const dialog = ref(null)
  let timeline
  let returnFocus
  let destination
  let closing = false
  let ready = false
  let content
  let originOpacity
  function restoreOrigin() {
    if (originOpacity !== undefined && returnFocus?.style) returnFocus.style.opacity = originOpacity
    originOpacity = undefined
  }
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches
  const drag = useDragDismiss({ target: dialog, canDrag: () => ready && !closing, dismiss: close })

  function finish() {
    timeline?.kill()
    ready = false
    closing = false
    dialog.value.close()
    dialog.value.removeAttribute('data-backdrop-closing')
    gsap.set(dialog.value, { clearProps: 'all' })
    gsap.set(content, { clearProps: 'all' })
    restoreOrigin()
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true })
  }

  function originRect() {
    if (returnFocus?.isConnected) return returnFocus.getBoundingClientRect()
    return { left: innerWidth / 2, top: innerHeight / 2, width: 1, height: 1 }
  }

  function originRadius() {
    if (!returnFocus?.isConnected) return '24px'
    const value = getComputedStyle(returnFocus).borderTopLeftRadius
    const box = returnFocus.getBoundingClientRect()
    return `${value.includes('%') ? parseFloat(value) * Math.min(box.width, box.height) / 100 : parseFloat(value) || 0}px`
  }

  function fitToViewport() {
    if (!fitContent) return
    const viewport = window.visualViewport
    const width = Math.min(document.documentElement.clientWidth, viewport?.width ?? innerWidth)
    const height = Math.min(document.documentElement.clientHeight, viewport?.height ?? innerHeight)
    const panelWidth = Math.min(dialog.value.offsetWidth, width - 16)
    const panelHeight = Math.min(dialog.value.offsetHeight, height - 24)
    const centered = placement === 'center-desktop' && width > 640
    gsap.set(dialog.value, {
      left: (viewport?.offsetLeft ?? 0) + (centered ? (width - panelWidth) / 2 : width - panelWidth - 8),
      top: (viewport?.offsetTop ?? 0) + (centered ? (height - panelHeight) / 2 : height - panelHeight - 8),
      right: 'auto',
      bottom: 'auto',
      width: panelWidth,
      height: panelHeight,
    })
  }

  function open(origin) {
    if (dialog.value.open) return
    returnFocus = origin || document.activeElement
    content = dialog.value.querySelector('[data-dialog-content]')
    dialog.value.removeAttribute('data-backdrop-closing')
    dialog.value.style.pointerEvents = 'none'
    dialog.value.showModal()
    if (matchMedia('(hover: none)').matches) document.activeElement?.blur?.()
    fitToViewport()
    if (anchored && placement !== 'end') {
      if (innerWidth <= 640) {
        gsap.set(dialog.value, {
          left: Math.round((innerWidth - dialog.value.offsetWidth) / 2),
          top: Math.round(Math.max(12, (innerHeight - dialog.value.offsetHeight) / 2)),
        })
      } else {
        const menu = origin?.closest('.options-menu')?.getBoundingClientRect()
        gsap.set(dialog.value, {
          left: Math.max(12, Math.min(menu?.left ?? 12, innerWidth - dialog.value.offsetWidth - 12)),
          top: Math.max(12, innerHeight - dialog.value.offsetHeight - 12),
        })
      }
    }
    const box = dialog.value.getBoundingClientRect()
    const contentWidth = fitContent ? content.offsetWidth : dialog.value.clientWidth
    const contentHeight = fitContent ? content.offsetHeight : dialog.value.clientHeight
    destination = {
      left: box.left,
      top: box.top,
      width: box.width,
      height: box.height,
      radius: getComputedStyle(dialog.value).borderTopLeftRadius,
    }
    const from = originRect()
    if (motion === 'chat' && !reduced()) {
      if (returnFocus?.style) {
        originOpacity = returnFocus.style.opacity
        returnFocus.style.opacity = '0'
      }
      // El panel conserva su layout final: el morph transforma el contenedor
      // completo desde la barra, como la apertura original de sb Money.
      gsap.set(dialog.value, {
        transformOrigin: '0 0',
        x: from.left - box.left,
        y: from.top - box.top,
        scaleX: from.width / box.width,
        scaleY: from.height / box.height,
        opacity: 0,
        filter: 'blur(8px)',
        overflow: 'hidden',
      })
      timeline = gsap.timeline({
        onComplete: () => {
          ready = true
          dialog.value.style.pointerEvents = ''
          gsap.set(dialog.value, { clearProps: 'transform,transformOrigin,filter,opacity' })
        },
      })
      timeline.to(dialog.value, {
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        filter: 'blur(0px)',
        duration: 0.7,
        ease: chatMorphEase,
      })
      return
    }
    gsap.set(dialog.value, {
      position: 'fixed',
      margin: 0,
      right: 'auto',
      bottom: 'auto',
      left: from.left,
      top: from.top,
      width: from.width,
      height: from.height,
      overflow: 'hidden',
      borderRadius: originRadius(),
    })
    // El contenido conserva sus dimensiones reales sin deformar su relación de aspecto.
    gsap.set(content, {
      width: contentWidth,
      height: contentHeight,
      minWidth: contentWidth,
      minHeight: contentHeight,
      transformOrigin: 'top center',
    })
    if (reduced()) {
      gsap.set(dialog.value, {
        left: box.left,
        top: box.top,
        width: box.width,
        height: box.height,
        borderRadius: destination.radius,
        overflow: 'auto',
        pointerEvents: '',
      })
      gsap.set(content, { clearProps: 'width,height,minWidth,minHeight,transformOrigin' })
      ready = true
      return
    }
    const duration = m3Duration.expandLarge
    timeline = gsap.timeline({
      onComplete: () => {
        ready = true
        dialog.value.style.pointerEvents = ''
        gsap.set(content, { clearProps: 'all' })
        dialog.value.style.overflow = 'auto'
      },
    })
    timeline.to(dialog.value, {
      left: box.left,
      top: box.top,
      width: box.width,
      height: box.height,
      borderRadius: destination.radius,
      duration,
      ease: emphasizedEase,
    }, 0)
    timeline.fromTo(
      content,
      { opacity: 0, scale: 0.96, filter: 'blur(6px)' },
      { opacity: 1, scale: 1, filter: 'blur(0px)', duration: duration - 0.08, ease: emphasizedDecelerate },
      0.08,
    )
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
    const contentWidth = content.offsetWidth
    const contentHeight = content.offsetHeight
    gsap.set(dialog.value, {
      x: 0,
      y: 0,
      scale: 1,
      left: box.left,
      top: box.top,
      width: box.width,
      height: box.height,
      overflow: 'hidden',
    })
    gsap.set(content, {
      width: contentWidth,
      height: contentHeight,
      minWidth: contentWidth,
      minHeight: contentHeight,
      transformOrigin: 'top center',
    })
    const duration = m3Duration.collapseLarge
    timeline = gsap.timeline({ onComplete: finish })
    timeline.to(dialog.value, {
      left: to.left,
      top: to.top,
      width: to.width,
      height: to.height,
      borderRadius: originRadius(),
      duration,
      ease: standardEase,
    }, 0)
    timeline.to(content, {
      opacity: 0,
      scale: 0.96,
      filter: 'blur(8px)',
      duration: 0.18,
      ease: standardAccelerate,
    }, 0)
    timeline.to(dialog.value, {
      opacity: 0,
      duration: 0.12,
      ease: standardAccelerate,
    }, duration - 0.12)
    if (originOpacity !== undefined && returnFocus?.isConnected) {
      timeline.to(returnFocus, { opacity: 1, duration: 0.12 }, duration - 0.12)
    }
  }

  function resize() {
    if (!responsive || !dialog.value?.open || closing) return
    timeline?.kill()
    gsap.set(dialog.value, { clearProps: 'all' })
    gsap.set(content, { clearProps: 'all' })
    fitToViewport()
    const box = dialog.value.getBoundingClientRect()
    destination = {
      left: box.left,
      top: box.top,
      width: box.width,
      height: box.height,
      radius: getComputedStyle(dialog.value).borderTopLeftRadius,
    }
    ready = true
  }
  if (responsive) window.addEventListener('resize', resize)
  if (responsive && fitContent) window.visualViewport?.addEventListener('resize', resize)

  function backdrop(event) {
    if (event.target !== dialog.value) return
    const r = dialog.value.getBoundingClientRect()
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) close()
  }
  onBeforeUnmount(() => {
    restoreOrigin()
    window.removeEventListener('resize', resize)
    window.visualViewport?.removeEventListener('resize', resize)
    timeline?.kill()
    if (dialog.value?.open) dialog.value.close()
  })
  return { dialog, open, close, backdrop, drag }
}
