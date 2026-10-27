import { nextTick, onBeforeUnmount, onMounted, watch } from 'vue'
import gsap from 'gsap'
import { emphasizedEase, standardEase } from './motionProfiles'

export function useMovementFieldsMotion({ dialog, phase, sources, types, indicator, selectedType }) {
  let resizeTween
  let indicatorTween
  let observer
  let revision = 0
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches

  function moveIndicator(animate = true) {
    if (!dialog.value?.open || !types.value || !indicator.value) return
    const label = types.value.querySelector(`input[value="${selectedType()}"]`)?.closest('label')
    if (!label) return
    indicatorTween?.kill()
    const destination = { x: label.offsetLeft, y: label.offsetTop, width: label.offsetWidth, height: label.offsetHeight }
    if (!animate || reduced()) gsap.set(indicator.value, destination)
    else indicatorTween = gsap.to(indicator.value, { ...destination, duration: 0.3, ease: standardEase, overwrite: true })
  }

  // Mide antes del cambio de Vue y después de insertar/quitar campos. Solo
  // anima el alto de la ventana: no estira letras, inputs ni controles nativos.
  watch(sources, async () => {
    const token = ++revision
    if (phase.value !== 'open' || !dialog.value?.open) return
    const panel = dialog.value
    const previousHeight = panel.getBoundingClientRect().height
    resizeTween?.kill()
    gsap.set(panel, { height: previousHeight, overflow: 'hidden' })
    await nextTick()
    if (token !== revision || phase.value !== 'open') return
    moveIndicator()
    gsap.set(panel, { clearProps: 'height' })
    const nextHeight = panel.getBoundingClientRect().height
    if (reduced() || Math.abs(nextHeight - previousHeight) < 1) {
      gsap.set(panel, { clearProps: 'height,overflow' })
      return
    }
    gsap.set(panel, { height: previousHeight, overflow: 'hidden' })
    resizeTween = gsap.to(panel, {
      height: nextHeight, duration: 0.35, ease: emphasizedEase,
      onComplete() { gsap.set(panel, { clearProps: 'height,overflow' }) },
    })
  }, { flush: 'pre' })

  watch(phase, async value => {
    if (value !== 'open') { ++revision; resizeTween?.kill(); indicatorTween?.kill() }
    if (value === 'opening' || value === 'open') { await nextTick(); moveIndicator(false) }
  })
  onMounted(() => {
    observer = new ResizeObserver(() => { if (phase.value === 'open') moveIndicator(false) })
    if (types.value) observer.observe(types.value)
  })
  onBeforeUnmount(() => { ++revision; resizeTween?.kill(); indicatorTween?.kill(); observer?.disconnect() })
}
