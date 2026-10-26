import { ref } from 'vue'
import { createLogoSvg } from '../assets/appLogo'

export const themeColors = [
  { id: 'neutral', label: 'Neutro', value: '#bcbcbc', secondary: '#d3dce8' },
  { id: 'black', label: 'Negro', value: '#151515', secondary: '#a7a6b3' },
  { id: 'red', label: 'Rojo', value: '#ef4545', secondary: '#ffae78' },
  { id: 'orange', label: 'Naranja', value: '#ff982f', secondary: '#f5d95d' },
  { id: 'green', label: 'Verde', value: '#0bec7b', secondary: '#55e6fa' },
  { id: 'blue', label: 'Azul', value: '#0d74fa', secondary: '#72d9f6' },
  { id: 'indigo', label: 'Índigo', value: '#4e57f4', secondary: '#bd9bff' },
  { id: 'purple', label: 'Violeta', value: '#8b16f0', secondary: '#ed99d8' },
  { id: 'magenta', label: 'Magenta', value: '#d211e5', secondary: '#fc9fad' },
  { id: 'pink', label: 'Rosa', value: '#d785ba', secondary: '#ffcaac' },
]
const selected = ref('neutral')
const storageKey = 'stepbro.appearance.color'
let iconVersion = 0
function blend(first, second, weight) {
  const a = first.slice(1).match(/../g).map(v => parseInt(v, 16))
  const b = second.slice(1).match(/../g).map(v => parseInt(v, 16))
  return '#' + a.map((value, i) => Math.round(value * weight + b[i] * (1 - weight)).toString(16).padStart(2, '0')).join('')
}
function apply(id) {
  const color = themeColors.find(c => c.id === id) || themeColors[0]
  selected.value = color.id
  const seed = color.value
  const logoSeed = color.id === 'neutral' ? '#528bb2' : seed
  const logo = {
    accent: logoSeed,
    highlight: blend(logoSeed, '#ffffff', 0.12),
    secondary: blend(color.secondary, '#ffffff', 0.65),
    edge: blend(logoSeed, '#19384d', 0.7),
  }
  const tokens = {
    '--theme-accent': seed,
    '--theme-logo-accent': logo.accent,
    '--theme-logo-highlight': logo.highlight,
    '--theme-logo-secondary': logo.secondary,
    '--theme-logo-edge': logo.edge,
    '--theme-page': blend(seed, '#ffffff', 0.025),
    '--theme-surface': blend(seed, '#ffffff', 0.07),
    '--theme-surface-raised': blend(seed, '#ffffff', 0.035),
    '--theme-hover': blend(seed, '#ffffff', 0.13),
    '--theme-container': blend(seed, '#ffffff', 0.24),
    '--theme-strong': blend(seed, '#151019', 0.32),
    '--theme-ink': blend(seed, '#211b27', 0.1),
    '--theme-accent-ink': color.id === 'black' ? '#ffffff' : blend(seed, '#211b27', 0.1),
    '--theme-on-container': blend(seed, '#24132e', 0.22),
    '--theme-muted': blend(seed, '#736b7c', 0.18),
    '--theme-outline': blend(seed, '#ffffff', 0.18),
    '--theme-divider': blend(blend(seed, '#7b7480', 0.08), '#ffffff', 0.2),
    '--theme-ring': blend(seed, '#51425d', 0.42),
    '--theme-glass': blend(seed, '#ffffff', 0.08) + 'f0',
    '--theme-gradient-one': blend(seed, '#ffffff', 0.72),
    '--theme-gradient-two': blend(color.secondary, '#ffffff', 0.75),
    '--theme-gradient-base': blend(seed, '#ffffff', 0.12),
    '--sidebar-active': blend(seed, '#ffffff', 0.24),
  }
  for (const [name, value] of Object.entries(tokens)) document.documentElement.style.setProperty(name, value)
  const svg = createLogoSvg(logo)
  const icon = document.querySelector('link[rel="icon"]')
  const source = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  if (icon) { icon.type = 'image/svg+xml'; icon.href = source }
  // iOS necesita PNG para el icono que se añade a la pantalla de inicio.
  const version = ++iconVersion
  const image = new Image()
  image.onload = () => {
    if (version !== iconVersion) return
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 180
    const context = canvas.getContext('2d')
    if (!context) return
    context.fillStyle = tokens['--theme-page']
    context.fillRect(0, 0, 180, 180)
    context.drawImage(image, 12, 12, 156, 156)
    const touchIcon = document.querySelector('link[rel="apple-touch-icon"]')
    if (touchIcon) touchIcon.href = canvas.toDataURL('image/png')
  }
  image.src = source
}
export function selectTheme(color) {
  apply(typeof color === 'string' ? color : color.id)
  try { localStorage.setItem(storageKey, selected.value) } catch { /* El tema sigue activo sin almacenamiento. */ }
}
export function initializeTheme() {
  let id = 'neutral'
  try { id = localStorage.getItem(storageKey) || id } catch { /* Usa la paleta inicial. */ }
  apply(id)
}
export function useAppearanceTheme() { return { selected, colors: themeColors, select: selectTheme } }
