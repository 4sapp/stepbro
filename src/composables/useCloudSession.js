import { ref } from 'vue'

export const cloudEnabled = import.meta.env?.VITE_FINANCE_API === 'true'
const csrfCookie = 'XSRF-TOKEN'

function responseMessage(payload, fallback) {
  if (payload?.errors && typeof payload.errors === 'object') {
    const first = Object.values(payload.errors).flat().find(Boolean)
    if (first) return first
  }
  return payload?.message || fallback
}

export function createCloudSession({ fetchImpl = (...args) => fetch(...args), getCookie = name => {
  if (typeof document === 'undefined') return ''
  const prefix = `${name}=`
  const value = document.cookie.split('; ').find(cookie => cookie.startsWith(prefix))
  return value ? value.slice(prefix.length) : ''
} } = {}) {
  const user = ref(null)
  const loading = ref(false)
  const error = ref('')
  const sessionRevision = ref(0)

  async function request(path, options = {}) {
    const method = options.method || 'GET'
    const headers = new Headers({ Accept: 'application/json', ...(options.headers || {}) })
    if (options.body !== undefined) headers.set('Content-Type', 'application/json')
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) {
      const token = getCookie(csrfCookie)
      if (token) {
        let decoded = token
        try { decoded = decodeURIComponent(token) } catch { /* Envía el valor sin cambios si la cookie está mal codificada. */ }
        headers.set('X-XSRF-TOKEN', decoded)
      }
    }
    const response = await fetchImpl(path, {
      ...options,
      method,
      headers,
      credentials: 'include',
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
    const payload = response.status === 204 ? null : await response.json().catch(() => null)
    if (!response.ok) {
      const fallback = response.status === 422 ? 'Revisa los datos ingresados.' : 'No se pudo completar la solicitud.'
      const failure = new Error(responseMessage(payload, fallback))
      failure.status = response.status
      failure.payload = payload
      throw failure
    }
    return payload
  }

  async function csrf() {
    const response = await fetchImpl('/sanctum/csrf-cookie', { credentials: 'include', headers: { Accept: 'application/json' } })
    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      const failure = new Error(responseMessage(payload, 'No se pudo iniciar la sesión segura.'))
      failure.status = response.status
      failure.payload = payload
      throw failure
    }
  }

  async function authenticate(path, credentials) {
    const revision = ++sessionRevision.value
    user.value = null
    loading.value = true
    error.value = ''
    try {
      await csrf()
      await request(path, { method: 'POST', body: credentials })
      const authenticatedUser = await request('/api/user')
      if (revision === sessionRevision.value) user.value = authenticatedUser
      return revision === sessionRevision.value ? user.value : null
    } catch (cause) {
      if (revision === sessionRevision.value) error.value = cause.message
      throw cause
    } finally {
      if (revision === sessionRevision.value) loading.value = false
    }
  }

  async function initializeSession() {
    const revision = ++sessionRevision.value
    loading.value = true
    error.value = ''
    try {
      const currentUser = await request('/api/user')
      if (revision === sessionRevision.value) user.value = currentUser
      return revision === sessionRevision.value ? user.value : null
    } catch (cause) {
      if (revision === sessionRevision.value) {
        if (cause.status === 401) user.value = null
        else error.value = cause.message
      }
      if (cause.status === 401) return null
      throw cause
    } finally {
      if (revision === sessionRevision.value) loading.value = false
    }
  }

  async function logout() {
    const revision = ++sessionRevision.value
    user.value = null
    loading.value = true
    error.value = ''
    try {
      await request('/api/logout', { method: 'POST' })
    } catch (cause) {
      if (revision === sessionRevision.value) error.value = cause.message
      throw cause
    } finally {
      if (revision === sessionRevision.value) loading.value = false
    }
  }

  return { user, loading, error, sessionRevision, login: credentials => authenticate('/api/login', credentials), register: credentials => authenticate('/api/register', credentials), logout, initializeSession, request }
}

const defaultSession = createCloudSession()
export const initializeSession = defaultSession.initializeSession
export function useCloudSession() {
  return { enabled: cloudEnabled, ...defaultSession }
}
