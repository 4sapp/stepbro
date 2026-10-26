import { computed, ref, watch } from 'vue'

const desktopChoices = [
  { id: 'classic', label: 'Clásica', detail: 'Barra lateral con iconos y nombres' },
  { id: 'floating', label: 'Flotante', detail: 'Botones suaves al lado del contenido' },
  { id: 'dock', label: 'Dock', detail: 'Navegación centrada en la parte inferior' },
]
function preference(device, choices, fallback) {
  const key = `stepbro.navigation.${device}`
  let initial = fallback
  try { const value = localStorage.getItem(key); if (choices.some(c => c.id === value)) initial = value } catch { /* Funciona sin almacenamiento. */ }
  const selected = ref(initial)
  watch(selected, value => { try { localStorage.setItem(key, value) } catch { /* Mantiene la selección en esta sesión. */ } })
  return selected
}
const desktop = preference('desktop', desktopChoices, 'floating')
const mobile = computed(() => 'floating')
export function useNavigationLayout() { return { desktop, mobile, desktopChoices } }
