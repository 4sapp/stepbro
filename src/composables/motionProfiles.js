import gsap from 'gsap'
import { CustomEase } from 'gsap/CustomEase'

gsap.registerPlugin(CustomEase)

// Curvas medidas en sb Tasks. Cambiar aquí evita desincronizar las capas.
export const popoverEase = CustomEase.create('sb-popover',
  'M0,0 C0.308,0.19 0.107,0.633 0.288,0.866 0.382,0.987 0.656,1 1,1')
export const fadeEase = CustomEase.create('sb-fade', '.56,.27,0,1')
export const blurEase = CustomEase.create('sb-blur', '.37,.35,0,1')
export const liquidSizeEase = CustomEase.create('sb-liquid-size', '.8,.3,.5,.8')

// Posición física independiente del tamaño y la opacidad. Conserva velocidad
// al interrumpir la apertura para que el cierre no arranque desde cero.
export function createPositionSpring(element) {
  let state
  let frame
  let previous
  function stop() { cancelAnimationFrame(frame); frame = undefined }
  function move(to, { stiffness, damping, velocity = 0 }) {
    stop()
    const rect = element.getBoundingClientRect()
    state = { x: rect.left, y: rect.top, vx: state?.vx ?? velocity * Math.sign(to.x - rect.left), vy: state?.vy ?? velocity * Math.sign(to.y - rect.top) }
    previous = performance.now()
    function tick(now) {
      let dt = Math.min((now - previous) / 1000, 0.064)
      previous = now
      while (dt > 0) {
        const step = Math.min(dt, 1 / 120)
        for (const axis of ['x', 'y']) {
          const v = `v${axis}`
          state[v] += ((to[axis] - state[axis]) * stiffness - state[v] * damping) * step
          state[axis] += state[v] * step
        }
        dt -= step
      }
      gsap.set(element, { left: state.x, top: state.y })
      if (Math.abs(to.x - state.x) + Math.abs(to.y - state.y) + Math.abs(state.vx) + Math.abs(state.vy) > 0.01) frame = requestAnimationFrame(tick)
      else { gsap.set(element, { left: to.x, top: to.y }); state = undefined }
    }
    frame = requestAnimationFrame(tick)
  }
  return { move, stop }
}
