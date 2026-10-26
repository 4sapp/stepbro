import test from 'node:test'
import assert from 'node:assert/strict'
import { currentLocation } from '../src/composables/useLocationPreference.js'

test('obtiene coordenadas y responde si el navegador rechaza el permiso', async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
  const setNavigator = geolocation => Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { geolocation } })
  try {
    setNavigator({ getCurrentPosition: resolve => resolve({ coords: { latitude: 4.6, longitude: -74.1, accuracy: 30 } }) })
    assert.deepEqual(await currentLocation(), { latitude: 4.6, longitude: -74.1, accuracy: 30 })
    setNavigator({ getCurrentPosition: (_, reject) => reject() })
    await assert.rejects(currentLocation(), /permisos/)
  } finally {
    if (previous) Object.defineProperty(globalThis, 'navigator', previous)
    else delete globalThis.navigator
  }
})
