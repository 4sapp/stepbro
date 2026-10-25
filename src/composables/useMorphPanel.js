import { onBeforeUnmount, ref } from 'vue'
import gsap from 'gsap'

// Ritmo común para todos los paneles; tiempos expresados en segundos.
const motion = {
  duration: 0.56,
  ease: 'power3.out',
  contentAt: 0.2,
  contentDuration: 0.22,
  // Desenfoque solo del contenido que entra y sale, no del texto compartido.
  contentBlur: 5,
  // 1 conserva la duración de apertura; menos de 1 alarga el regreso.
  closeSpeed: 1,
}

export function useMorphPanel() {
  const dialog = ref(null)
  let timeline
  let trigger
  let previousOverflow
  let surface
  let reduced = false

  function close() {
    if (!dialog.value?.open || !timeline) return
    if (reduced) {
      finishClose()
      return
    }
    // Invertir conserva la continuidad si se cierra durante la apertura.
    timeline.timeScale(motion.closeSpeed).reverse()
  }

  function finishClose() {
    dialog.value.close()
    document.body.style.overflow = previousOverflow
    gsap.set(dialog.value, { clearProps: 'all' })
    gsap.set(surface, { clearProps: 'all' })
    gsap.set(dialog.value.querySelectorAll('[data-shared-item], [data-panel-content]'), { clearProps: 'all' })
    trigger.style.visibility = ''
    trigger.focus({ preventScroll: true })
    timeline?.kill()
    timeline = null
  }

  function open(event) {
    const panel = dialog.value
    if (panel.open) return
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
      defaults: { duration: reduced ? 0 : motion.duration, ease: motion.ease },
      onReverseComplete: finishClose,
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

    timeline.fromTo(panel.querySelectorAll('[data-panel-content]'), {
      opacity: 0,
      filter: reduced ? 'blur(0px)' : `blur(${motion.contentBlur}px)`,
    }, {
      opacity: 1,
      filter: 'blur(0px)',
      duration: reduced ? 0 : motion.contentDuration,
      ease: 'power1.inOut',
    }, reduced ? 0 : motion.contentAt)
  }

  onBeforeUnmount(() => {
    timeline?.kill()
    if (dialog.value?.open) {
      dialog.value.close()
      document.body.style.overflow = previousOverflow
    }
  })

  return { dialog, open, close }
}
