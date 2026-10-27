import test from 'node:test'
import assert from 'node:assert/strict'
import { createCloudSession } from '../src/composables/useCloudSession.js'

const response = (body, status = 200) => ({
  status,
  ok: status >= 200 && status < 300,
  json: async () => body,
})
const deferred = () => {
  let resolve
  const promise = new Promise(done => { resolve = done })
  return { promise, resolve }
}

test('usa cookies credentials include y traduce el XSRF-TOKEN antes de enviar credenciales', async () => {
  const calls = []
  const session = createCloudSession({
    getCookie: () => 'token%2Fvalue',
    fetchImpl: async (url, options) => {
      calls.push({ url, options })
      if (url === '/sanctum/csrf-cookie') return response(null, 204)
      if (url === '/api/login') return response(null, 204)
      return response({ id: 7, email: 'ana@example.com' })
    },
  })

  await session.login({ email: 'ana@example.com', password: 'secret' })

  assert.deepEqual(calls.map(call => call.url), ['/sanctum/csrf-cookie', '/api/login', '/api/user'])
  assert.equal(calls[0].options.credentials, 'include')
  assert.equal(calls[1].options.credentials, 'include')
  assert.equal(calls[1].options.headers.get('X-XSRF-TOKEN'), 'token/value')
  assert.equal(calls[1].options.headers.get('Accept'), 'application/json')
  assert.deepEqual(JSON.parse(calls[1].options.body), { email: 'ana@example.com', password: 'secret' })
  assert.equal(session.user.value.id, 7)
})

test('muestra un error útil para validaciones 422 de Laravel', async () => {
  const session = createCloudSession({
    fetchImpl: async url => url === '/sanctum/csrf-cookie'
      ? response(null, 204)
      : response({ message: 'The given data was invalid.', errors: { email: ['El correo ya está registrado.'] } }, 422),
  })

  await assert.rejects(session.register({}), /El correo ya está registrado/)
  assert.match(session.error.value, /El correo ya está registrado/)
})

test('rechaza un fallo de csrf-cookie antes de enviar login', async () => {
  const calls = []
  const session = createCloudSession({
    fetchImpl: async url => {
      calls.push(url)
      return response({ message: 'CSRF no disponible' }, 503)
    },
  })

  await assert.rejects(session.login({}), /CSRF no disponible/)
  assert.deepEqual(calls, ['/sanctum/csrf-cookie'])
  assert.equal(session.user.value, null)
})

test('una respuesta previa de /api/user no restaura el usuario después del logout', async () => {
  const pendingUser = deferred()
  const session = createCloudSession({
    fetchImpl: async (url, options) => {
      if (url === '/api/user') return pendingUser.promise
      if (url === '/api/logout') return response(null, 204)
      throw new Error(`Unexpected request: ${url} ${options?.method}`)
    },
  })

  const initialization = session.initializeSession()
  await session.logout()
  pendingUser.resolve(response({ id: 12, email: 'old@example.com' }))
  await initialization

  assert.equal(session.user.value, null)
})
