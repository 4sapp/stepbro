// Geometría compartida por el logo inline, el favicon y el icono de inicio.
export function createLogoSvg({ id = 'money-logo', accent = '#238fcd', highlight = '#e8f8ff', secondary = '#74dced', edge = '#2085ba' } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 106 106" width="106" height="106" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id="${id}-body" x1="14" y1="8" x2="84" y2="100" gradientUnits="userSpaceOnUse"><stop stop-color="${highlight}"/><stop offset=".48" stop-color="${secondary}"/><stop offset="1" stop-color="${accent}"/></linearGradient>
      <linearGradient id="${id}-rim" x1="12" y1="6" x2="92" y2="100" gradientUnits="userSpaceOnUse"><stop stop-color="${highlight}"/><stop offset=".55" stop-color="${edge}"/><stop offset="1" stop-color="${secondary}"/></linearGradient>
      <linearGradient id="${id}-fold" x1="42" y1="9" x2="57" y2="32" gradientUnits="userSpaceOnUse"><stop stop-color="${highlight}"/><stop offset=".65" stop-color="${secondary}"/><stop offset="1" stop-color="${highlight}"/></linearGradient>
      <radialGradient id="${id}-light" cx=".25" cy=".12" r=".85"><stop stop-color="white" stop-opacity=".65"/><stop offset="1" stop-color="white" stop-opacity="0"/></radialGradient>
    </defs>
    <g fill="url(#${id}-body)" stroke="url(#${id}-rim)" stroke-width=".75" stroke-linejoin="round">
      <path d="M22 6H39Q41 6 43 8L64 29Q66 31 66 34V66H22C13 66 6 59 6 50V22C6 13 13 6 22 6Z"/>
      <path d="M70 6A30 30 0 0 1 70 66Z"/>
      <path d="M6 70H66A30 30 0 0 1 6 70Z"/>
      <path d="M70 70H100A30 30 0 0 1 70 100Z"/>
    </g>
    <path d="M40 7V20C40 28 44 32 52 32H65Z" fill="url(#${id}-fold)"/>
    <path d="M22 6H39Q41 6 43 8L64 29Q66 31 66 34V66H22C13 66 6 59 6 50V22C6 13 13 6 22 6Z" fill="url(#${id}-light)"/>
  </svg>`
}
