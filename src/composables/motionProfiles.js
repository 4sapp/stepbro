import gsap from 'gsap'
import { CustomEase } from 'gsap/CustomEase'

gsap.registerPlugin(CustomEase)

// Curvas oficiales de Material Design 3 (Applying transitions / Easing & duration).
// Emphasized se usa en Container Transform que inicia y termina en pantalla.
export const emphasizedEase = CustomEase.create(
  'm3-emphasized',
  'M0,0 C0.05,0 0.133333,0.06 0.166666,0.4 0.208333,0.82 0.25,1 1,1',
)
export const emphasizedDecelerate = CustomEase.create('m3-emphasized-decelerate', '0.05,0.7,0.1,1')
export const emphasizedAccelerate = CustomEase.create('m3-emphasized-accelerate', '0.3,0,0.8,0.15')
export const standardEase = CustomEase.create('m3-standard', '0.2,0,0,1')
export const standardDecelerate = CustomEase.create('m3-standard-decelerate', '0,0,0,1')
export const standardAccelerate = CustomEase.create('m3-standard-accelerate', '0.3,0,1,1')

export const chatMorphEase = CustomEase.create(
  'chat-morph',
  'M0,0 C0.308,0.19 0.107,0.633 0.288,0.866 0.382,0.987 0.656,1 1,1',
)

// Alias semánticos para los componentes de transición.
export const popoverEase = emphasizedEase
export const fadeEase = standardAccelerate
export const blurEase = standardEase

// Duraciones estándar de M3 para Container Transform (en segundos).
export const m3Duration = {
  expandLarge: 0.5,
  expandMedium: 0.4,
  collapseLarge: 0.3,
  collapseMedium: 0.25,
}
