import { onBeforeUnmount } from 'vue'
import gsap from 'gsap'

// Recorrido del puntero en px; el panel acompaña solo la mitad del movimiento.
const gesture = {
  resistance: 0.5,
  distance: 200,
  intent: 6,
  minScale: 0.1,
  // La escala depende del desplazamiento vertical ya amortiguado.
  scaleDistance: 400,
  returnDuration: 0.5,
}

export function useDragDismiss({ target, canDrag, dismiss }) {
  let pointer
  let frame
  let settle
  let render
  let wheelState
  let wheelTimer
  let cooldown = 0

  function release() {
    if (!pointer) return
    const { handle, id } = pointer
    pointer = null
    if (handle.hasPointerCapture(id)) handle.releasePointerCapture(id)
    handle.removeAttribute('data-dragging')
    cancelAnimationFrame(frame)
  }

  function restore() {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    settle = gsap.to(target.value, {
      x: 0, y: 0, scale: 1,
      duration: reduced ? 0 : gesture.returnDuration,
      ease: 'elastic.out(0.5, 0.5)',
      overwrite: 'auto',
    })
  }

  function start(event) {
    if (!canDrag() || pointer || !event.isPrimary || event.button !== 0) return
    // No inicia un arrastre desde controles o zonas marcadas como data-no-drag.
    if (event.target.closest('button, input, textarea, select, a, [role="button"], [role="slider"], [contenteditable]:not([contenteditable="false"]), [data-no-drag]')) return
    // Evita que seleccionar el título active el arrastre nativo del navegador.
    if (event.pointerType === 'mouse') event.preventDefault()
    settle?.kill()
    const handle = event.currentTarget
    const baseX = Number(gsap.getProperty(target.value, 'x')) || 0
    const baseY = Number(gsap.getProperty(target.value, 'y')) || 0
    const baseScale = Number(gsap.getProperty(target.value, 'scaleX')) || 1
    const setX = gsap.quickSetter(target.value, 'x', 'px')
    const setY = gsap.quickSetter(target.value, 'y', 'px')
    const setScaleX = gsap.quickSetter(target.value, 'scaleX')
    const setScaleY = gsap.quickSetter(target.value, 'scaleY')
    pointer = {
      id: event.pointerId, handle,
      x: event.clientX, y: event.clientY,
      baseX, baseY, baseScale,
      active: false, source: event.target, dy: 0,
      next: { x: baseX, y: baseY, scale: baseScale },
    }
    render = () => {
      if (!pointer) return
      setX(pointer.next.x)
      setY(pointer.next.y)
      setScaleX(pointer.next.scale)
      setScaleY(pointer.next.scale)
    }
    handle.setPointerCapture(event.pointerId)
  }

  function move(event) {
    if (!pointer || event.pointerId !== pointer.id) return
    if (!canDrag()) { release(); return }
    const dx = event.clientX - pointer.x
    const dy = event.clientY - pointer.y
    const distance = Math.hypot(dx, dy)
    if (!pointer.active) {
      if (distance < gesture.intent) return
      pointer.active = true
      pointer.handle.setAttribute('data-dragging', '')
    }

    // El scroll interior conserva el gesto mientras pueda seguir desplazándose.
    if (Math.abs(dy) > Math.abs(dx)) {
      let node = pointer.source
      while (node && node !== pointer.handle) {
        const style = getComputedStyle(node)
        if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight && (dy < 0 || node.scrollTop > 0)) {
          release()
          return
        }
        node = node.parentElement
      }
    }
    pointer.dy = dy
    pointer.next = {
      x: pointer.baseX + dx * gesture.resistance,
      y: pointer.baseY + dy * gesture.resistance,
      // Hacia arriba crece; un gesto horizontal conserva la escala.
      scale: Math.max(gesture.minScale, pointer.baseScale * (1 - dy * gesture.resistance / gesture.scaleDistance)),
    }
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(render)
  }

  function end(event) {
    if (!pointer || event.pointerId !== pointer.id) return
    const { dy, active, handle } = pointer
    render()
    release()
    if (!canDrag()) return
    if (active) {
      const suppress = event => { event.preventDefault(); event.stopImmediatePropagation() }
      handle.addEventListener('click', suppress, true)
      setTimeout(() => handle.removeEventListener('click', suppress, true), 50)
    }
    if (active && dy > gesture.distance) dismiss()
    else restore()
  }

  function cancel(event) {
    if (!pointer || event.pointerId !== pointer.id) return
    release()
    if (canDrag()) restore()
  }

  function wheel(event) {
    if (!canDrag() || pointer || performance.now() < cooldown) return
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1
    const dy = event.deltaY * unit
    const dx = event.deltaX * unit
    if (!wheelState && (dy >= 0 || Math.abs(dx) > Math.abs(dy))) return
    // Una lista con scroll tiene prioridad sobre el gesto del panel.
    let node = event.target
    while (node && node !== event.currentTarget) {
      if (/(auto|scroll)/.test(getComputedStyle(node).overflowY) && node.scrollHeight > node.clientHeight && (dy > 0 || node.scrollTop > 0)) return
      node = node.parentElement
    }
    event.preventDefault()
    settle?.kill()
    const now = performance.now()
    wheelState ??= { travel: 0, speed: 0, time: now - 16 }
    wheelState.speed = wheelState.speed * 0.4 + (-dy / Math.max(1, now - wheelState.time)) * 0.6
    wheelState.travel = Math.max(0, wheelState.travel - dy * gesture.resistance)
    wheelState.time = now
    gsap.set(target.value, { y: wheelState.travel, scale: Math.max(gesture.minScale, 1 - wheelState.travel / gesture.scaleDistance) })
    clearTimeout(wheelTimer)
    const shouldClose = wheelState.travel > 100 || (wheelState.travel > 16 && wheelState.speed > 1.5)
    if (shouldClose) {
      wheelState = undefined
      cooldown = now + 250
      dismiss()
    } else {
      wheelTimer = setTimeout(() => { wheelState = undefined; if (canDrag()) restore() }, 90)
    }
  }

  onBeforeUnmount(() => { release(); settle?.kill(); clearTimeout(wheelTimer) })

  return { start, move, end, cancel, wheel }
}
