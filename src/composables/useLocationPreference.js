import { ref, watch } from 'vue'

const key = 'stepbro.location.enabled'
let stored = false
try {
  stored = localStorage.getItem(key) === 'true'
} catch {
  // La preferencia seguirá disponible durante esta sesión.
}
const locationEnabled = ref(stored)
watch(locationEnabled, value => {
  try {
    localStorage.setItem(key, String(value))
  } catch {
    // La preferencia seguirá disponible durante esta sesión.
  }
}, { flush: 'sync' })

export function useLocationPreference() {
  return { locationEnabled }
}

export function currentLocation() {
  if (!navigator.geolocation) return Promise.reject(new Error('La ubicación no está disponible en este navegador.'))
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy }),
      () => reject(new Error('No se pudo obtener la ubicación. Revisa los permisos del navegador.')),
      { timeout: 10000, maximumAge: 60000 },
    )
  })
}
