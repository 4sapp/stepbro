import { onBeforeUnmount, watch } from 'vue'
import gsap from 'gsap'

const gesture = {
  resistance: 0.62,
  upwardResistance: 0.28,
  horizontalResistance: 0.48,
  distance: 55,
  anyDirectionDistance: 95,
  flickVelocity: 0.35,
  intent: 6,
  minScale: 0.86,
  scaleDistance: 460,
  returnDuration: 0.38,
}

export function useDragDismiss({ target, canDrag, dismiss }) {
  let pointer
  let touch
  let frame
  let settle
  let wheelState
  let wheelTimer
  let cooldown = 0
  let boundElement = null

  function restore() {
    if (!target.value) return
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    settle = gsap.to(target.value, {
      x: 0,
      y: 0,
      scale: 1,
      duration: reduced ? 0 : gesture.returnDuration,
      ease: 'back.out(1.4)',
      overwrite: 'auto',
    })
  }

  function scrollableAncestor(source, root, dy) {
    let node = source instanceof Element ? source : source?.parentElement
    while (node && node !== root && node !== document.body) {
      const style = getComputedStyle(node)
      if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 2) {
        // Si empuja el contenido hacia arriba (dy < 0) y aún hay scroll hacia abajo,
        // o si tira hacia abajo (dy > 0) pero la lista no está en el tope (scrollTop > 0),
        // permite el scroll nativo de la lista.
        if ((dy < 0 && node.scrollTop + node.clientHeight < node.scrollHeight - 2) || (dy > 0 && node.scrollTop > 1)) {
          return node
        }
      }
      node = node.parentElement
    }
    if (root instanceof Element) {
      const style = getComputedStyle(root)
      if (/(auto|scroll)/.test(style.overflowY) && root.scrollHeight > root.clientHeight + 2) {
        if ((dy < 0 && root.scrollTop + root.clientHeight < root.scrollHeight - 2) || (dy > 0 && root.scrollTop > 1)) {
          return root
        }
      }
    }
    return null
  }

  function applyTransform(dx, dy, baseX, baseY, baseScale) {
    if (!target.value) return
    const dampedY = dy >= 0 ? dy * gesture.resistance : dy * gesture.upwardResistance
    const dampedX = dx * gesture.horizontalResistance
    const pull = Math.hypot(dampedX, Math.max(0, dampedY))
    const scale = Math.max(gesture.minScale, baseScale * (1 - pull / gesture.scaleDistance))
    gsap.set(target.value, {
      x: baseX + dampedX,
      y: baseY + dampedY,
      scaleX: scale,
      scaleY: scale,
      transformOrigin: '50% 50%',
    })
  }

  function suppressNextClick(root) {
    const suppress = event => {
      event.preventDefault()
      event.stopImmediatePropagation()
    }
    root.addEventListener('click', suppress, true)
    setTimeout(() => root.removeEventListener('click', suppress, true), 120)
  }

  function shouldDismiss(dx, dy, vx, vy) {
    const draggedDown = dy > gesture.distance
    const draggedAny = Math.hypot(dx, dy) > gesture.anyDirectionDistance && dy > -25
    const flickedDown = dy > 14 && vy > gesture.flickVelocity
    const flickedAny = Math.hypot(dx, dy) > 24 && Math.hypot(vx, vy) > gesture.flickVelocity * 1.4 && dy > -15
    return draggedDown || draggedAny || flickedDown || flickedAny
  }

  // --- Eventos Touch nativos con { passive: false } para iOS Safari ---
  function onTouchStart(event) {
    if (!canDrag() || event.touches.length !== 1 || !target.value) return
    const t = event.touches[0]
    if (t.target?.closest?.('[role="slider"], input[type="range"], .movement-form__types')) return
    settle?.kill()
    const now = performance.now()
    touch = {
      id: t.identifier,
      startX: t.clientX,
      startY: t.clientY,
      lastX: t.clientX,
      lastY: t.clientY,
      lastTime: now,
      vx: 0,
      vy: 0,
      dx: 0,
      dy: 0,
      baseX: Number(gsap.getProperty(target.value, 'x')) || 0,
      baseY: Number(gsap.getProperty(target.value, 'y')) || 0,
      baseScale: Number(gsap.getProperty(target.value, 'scaleX')) || 1,
      active: false,
      lockedOut: false,
      source: t.target,
    }
  }

  function onTouchMove(event) {
    if (!touch || touch.lockedOut || !canDrag()) return
    const t = [...event.touches].find(item => item.identifier === touch.id)
    if (!t) return
    const dx = t.clientX - touch.startX
    const dy = t.clientY - touch.startY
    const distance = Math.hypot(dx, dy)

    if (!touch.active) {
      if (distance < gesture.intent) return
      // Si el usuario desliza horizontalmente dentro de un input de texto con contenido, no arrastrar.
      if (Math.abs(dx) > Math.abs(dy) * 1.3 && touch.source?.closest?.('input, textarea')) {
        touch.lockedOut = true
        return
      }
      // Si hay un contenedor con scroll que debe desplazarse primero:
      if (Math.abs(dy) >= Math.abs(dx) * 0.7 && scrollableAncestor(touch.source, target.value, dy)) {
        // Actualiza el origen para que en cuanto llegue al tope superior (scrollTop === 0)
        // enganche el arrastre del modal en el mismo movimiento del dedo.
        touch.startX = t.clientX
        touch.startY = t.clientY
        touch.lastX = t.clientX
        touch.lastY = t.clientY
        touch.lastTime = performance.now()
        return
      }
      touch.active = true
      target.value.setAttribute('data-dragging', '')
      if (document.activeElement && target.value.contains(document.activeElement)) {
        document.activeElement.blur?.()
      }
    }

    // Imprescindible en iOS Safari: detiene el scroll/bounce nativo y evita pointercancel.
    if (event.cancelable) event.preventDefault()

    const now = performance.now()
    const dt = Math.max(1, now - touch.lastTime)
    touch.vx = touch.vx * 0.3 + ((t.clientX - touch.lastX) / dt) * 0.7
    touch.vy = touch.vy * 0.3 + ((t.clientY - touch.lastY) / dt) * 0.7
    touch.lastX = t.clientX
    touch.lastY = t.clientY
    touch.lastTime = now
    touch.dx = dx
    touch.dy = dy

    applyTransform(dx, dy, touch.baseX, touch.baseY, touch.baseScale)
  }

  function onTouchEnd() {
    if (!touch) return
    const { dx, dy, vx, vy, active } = touch
    touch = null
    target.value?.removeAttribute('data-dragging')
    if (!active || !canDrag()) return
    if (target.value) suppressNextClick(target.value)
    if (shouldDismiss(dx, dy, vx, vy)) dismiss()
    else restore()
  }

  function onTouchCancel() {
    if (!touch) return
    const wasActive = touch.active
    touch = null
    target.value?.removeAttribute('data-dragging')
    if (wasActive && canDrag()) restore()
  }

  function bindTouchListeners(el) {
    if (boundElement === el) return
    if (boundElement) {
      boundElement.removeEventListener('touchstart', onTouchStart)
      boundElement.removeEventListener('touchmove', onTouchMove)
      boundElement.removeEventListener('touchend', onTouchEnd)
      boundElement.removeEventListener('touchcancel', onTouchCancel)
    }
    boundElement = el
    if (el) {
      el.addEventListener('touchstart', onTouchStart, { passive: true })
      el.addEventListener('touchmove', onTouchMove, { passive: false })
      el.addEventListener('touchend', onTouchEnd, { passive: true })
      el.addEventListener('touchcancel', onTouchCancel, { passive: true })
    }
  }

  watch(target, el => bindTouchListeners(el), { immediate: true })

  // --- Eventos Pointer para ratón en escritorio ---
  function releasePointer() {
    if (!pointer) return
    const { handle, id } = pointer
    pointer = null
    if (handle.hasPointerCapture?.(id)) handle.releasePointerCapture(id)
    handle.removeAttribute('data-dragging')
    cancelAnimationFrame(frame)
  }

  function start(event) {
    if (event.pointerType === 'touch') return
    if (!canDrag() || pointer || !event.isPrimary || event.button !== 0 || !target.value) return
    if (event.target.closest('button, input, textarea, select, label, summary, a, [role="button"], [role="tab"], [role="slider"], [data-no-drag], .movement-form__types')) return
    settle?.kill()
    const handle = event.currentTarget
    const now = performance.now()
    pointer = {
      id: event.pointerId,
      handle,
      x: event.clientX,
      y: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      lastTime: now,
      vx: 0,
      vy: 0,
      baseX: Number(gsap.getProperty(target.value, 'x')) || 0,
      baseY: Number(gsap.getProperty(target.value, 'y')) || 0,
      baseScale: Number(gsap.getProperty(target.value, 'scaleX')) || 1,
      active: false,
      source: event.target,
      dx: 0,
      dy: 0,
    }
  }

  function move(event) {
    if (event.pointerType === 'touch' || !pointer || event.pointerId !== pointer.id) return
    if (!canDrag()) { releasePointer(); return }
    const dx = event.clientX - pointer.x
    const dy = event.clientY - pointer.y
    const distance = Math.hypot(dx, dy)
    if (!pointer.active) {
      if (distance < gesture.intent) return
      if (Math.abs(dy) >= Math.abs(dx) && scrollableAncestor(pointer.source, pointer.handle, dy)) {
        releasePointer()
        return
      }
      pointer.active = true
      pointer.handle.setAttribute('data-dragging', '')
      pointer.handle.setPointerCapture?.(event.pointerId)
    }
    const now = performance.now()
    const dt = Math.max(1, now - pointer.lastTime)
    pointer.vx = pointer.vx * 0.35 + ((event.clientX - pointer.lastX) / dt) * 0.65
    pointer.vy = pointer.vy * 0.35 + ((event.clientY - pointer.lastY) / dt) * 0.65
    pointer.lastX = event.clientX
    pointer.lastY = event.clientY
    pointer.lastTime = now
    pointer.dx = dx
    pointer.dy = dy

    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(() => {
      if (pointer) applyTransform(pointer.dx, pointer.dy, pointer.baseX, pointer.baseY, pointer.baseScale)
    })
  }

  function end(event) {
    if (event.pointerType === 'touch' || !pointer || event.pointerId !== pointer.id) return
    const { dx, dy, vx, vy, active, handle } = pointer
    if (active) applyTransform(dx, dy, pointer.baseX, pointer.baseY, pointer.baseScale)
    releasePointer()
    if (!canDrag() || !active) return
    suppressNextClick(handle)
    if (shouldDismiss(dx, dy, vx, vy)) dismiss()
    else restore()
  }

  function cancel(event) {
    if (event.pointerType === 'touch' || !pointer || event.pointerId !== pointer.id) return
    const wasActive = pointer.active
    releasePointer()
    if (wasActive && canDrag()) restore()
  }

  function wheel(event) {
    if (!canDrag() || pointer || touch || performance.now() < cooldown) return
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1
    const dy = event.deltaY * unit
    const dx = event.deltaX * unit
    if (!wheelState && (dy >= 0 || Math.abs(dx) > Math.abs(dy))) return
    if (scrollableAncestor(event.target, event.currentTarget, -dy)) return
    event.preventDefault()
    settle?.kill()
    const now = performance.now()
    wheelState ??= { travel: 0, speed: 0, time: now - 16 }
    wheelState.speed = wheelState.speed * 0.4 + (-dy / Math.max(1, now - wheelState.time)) * 0.6
    wheelState.travel = Math.max(0, wheelState.travel - dy * gesture.resistance)
    wheelState.time = now
    gsap.set(target.value, { y: wheelState.travel, scale: Math.max(gesture.minScale, 1 - wheelState.travel / gesture.scaleDistance) })
    clearTimeout(wheelTimer)
    const shouldClose = wheelState.travel > 70 || (wheelState.travel > 16 && wheelState.speed > 1.1)
    if (shouldClose) {
      wheelState = undefined
      cooldown = now + 250
      dismiss()
    } else {
      wheelTimer = setTimeout(() => { wheelState = undefined; if (canDrag()) restore() }, 90)
    }
  }

  onBeforeUnmount(() => {
    bindTouchListeners(null)
    releasePointer()
    settle?.kill()
    clearTimeout(wheelTimer)
  })

  return { start, move, end, cancel, wheel }
}
