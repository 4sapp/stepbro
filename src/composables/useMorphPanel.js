import { onBeforeUnmount, ref } from 'vue'
import gsap from 'gsap'
import { popoverEase, fadeEase, blurEase } from './motionProfiles'

// El blur vive en la capa completa para incluir título, icono y cuerpo.
const motion = {
  duration: 0.7,
  contentBlur: 8,
  closeDuration: 0.5,
  closeBlur: 32,
}

export function useMorphPanel() {
  const dialog = ref(null)
  const phase = ref('closed')
  let timeline
  let trigger
  let previousOverflow
  let surface
  let reduced = false

  function close() {
    if (!dialog.value?.open || !timeline) return
    if (phase.value === 'closing') return
    phase.value = 'closing'
    if (reduced) {
      finishClose()
      return
    }
    timeline.kill()
    const panel = dialog.value
    const origin = trigger.getBoundingClientRect()
    const box = panel.getBoundingClientRect()
    const layout = panel.querySelector('[data-panel-layout]')
    // El panel puede venir de un gesto: parte de su posición visual actual.
    gsap.to(panel, { x: 0, y: 0, scale: 1, duration: motion.closeDuration, ease: popoverEase, overwrite: 'auto' })
    const baseLeft = box.left - Number(gsap.getProperty(panel, 'x')) - (panel.offsetWidth - box.width) / 2
    const baseTop = box.top - Number(gsap.getProperty(panel, 'y')) - (panel.offsetHeight - box.height) / 2
    timeline = gsap.timeline({ onComplete: finishClose })
    timeline.to(surface, {
      x: origin.left - baseLeft,
      y: origin.top - baseTop,
      width: origin.width, height: origin.height,
      borderRadius: getComputedStyle(trigger).borderRadius,
      backgroundColor: getComputedStyle(trigger).backgroundColor,
      duration: motion.closeDuration, ease: popoverEase,
    }, 0)
    timeline.to(layout, { filter: `blur(${motion.closeBlur}px)`, duration: motion.closeDuration, ease: blurEase }, 0)
    timeline.to(layout, { opacity: 0, duration: motion.closeDuration, ease: fadeEase }, 0)
    timeline.to(panel, { '--backdrop-opacity': 0, duration: motion.closeDuration, ease: 'power3.in' }, 0)
  }

  function finishClose() {
    dialog.value.close()
    phase.value = 'closed'
    gsap.killTweensOf(dialog.value, 'x,y,scale')
    document.body.style.overflow = previousOverflow
    gsap.set(dialog.value, { clearProps: 'all' })
    gsap.set(surface, { clearProps: 'all' })
    gsap.set(dialog.value.querySelectorAll('[data-shared-item], [data-panel-content], [data-panel-layout]'), { clearProps: 'all' })
    trigger.style.visibility = ''
    trigger.focus({ preventScroll: true })
    timeline?.kill()
    timeline = null
  }

  function open(event) {
    const panel = dialog.value
    if (panel.open) return
    phase.value = 'opening'
    trigger = event.currentTarget
    const start = trigger.getBoundingClientRect()

    panel.showModal()
    previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const end = panel.getBoundingClientRect()
    surface = panel.querySelector('[data-panel-surface]')
    const shared = [...panel.querySelectorAll('[data-shared-item]')].flatMap(target => {
      const source = trigger.querySelector(`[data-shared-item="${target.dataset.sharedItem}"]`)
      if (!source) return []
      return [{ target, sourceBox: source.getBoundingClientRect(), targetBox: target.getBoundingClientRect() }]
    })
    trigger.style.visibility = 'hidden'
    reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Duración y curva compartidas: ajusta aquí el carácter del movimiento.
    timeline = gsap.timeline({
      defaults: { duration: reduced ? 0 : motion.duration, ease: popoverEase },
      onComplete: () => { phase.value = 'open' },
    })

    // El diálogo mantiene su geometría. Solo la superficie cambia de tamaño.
    // Así el navegador no recentra ni redistribuye el texto en cada fotograma.
    timeline.fromTo(surface, {
      x: start.left - end.left,
      y: start.top - end.top,
      width: start.width,
      height: start.height,
      borderRadius: getComputedStyle(trigger).borderRadius,
      backgroundColor: getComputedStyle(trigger).backgroundColor,
    }, {
      x: 0, y: 0,
      width: end.width,
      height: end.height,
      borderRadius: getComputedStyle(panel).borderRadius,
      backgroundColor: '#fff',
    }, 0)

    timeline.fromTo(panel, {
      color: getComputedStyle(trigger).color, '--backdrop-opacity': 0,
    }, {
      color: getComputedStyle(panel).color, '--backdrop-opacity': 0.16,
      duration: reduced ? 0 : 0.32,
    }, 0)

    // Empareja las piezas por nombre. El atributo es una convención propia.
    shared.forEach(({ target, sourceBox, targetBox }) => {
      timeline.fromTo(target, {
        x: sourceBox.left - targetBox.left,
        y: sourceBox.top - targetBox.top,
      }, { x: 0, y: 0 }, 0)
    })

    // El mismo desenfoque incluye las piezas compartidas; antes el título
    // permanecía nítido y ocultaba casi todo el efecto de la transición.
    timeline.fromTo(panel.querySelector('[data-panel-layout]'), {
      filter: reduced ? 'none' : `blur(${motion.contentBlur}px)`,
    }, { filter: 'blur(0px)', duration: reduced ? 0 : motion.duration, ease: popoverEase }, 0)
    timeline.fromTo(panel.querySelectorAll('[data-panel-content]'), {
      opacity: 0,
    }, { opacity: 1, duration: reduced ? 0 : motion.duration, ease: popoverEase }, 0)

  }

  onBeforeUnmount(() => {
    timeline?.kill()
    if (dialog.value) gsap.killTweensOf(dialog.value, 'x,y,scale')
    if (dialog.value?.open) {
      dialog.value.close()
      document.body.style.overflow = previousOverflow
    }
  })

  return { dialog, phase, open, close }
}
