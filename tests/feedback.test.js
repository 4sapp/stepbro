import test from 'node:test'
import assert from 'node:assert/strict'
import { createFeedbackStore } from '../src/composables/useFeedbackStore.js'
function memory() {
  const values = new Map()
  return { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value) }
}
test('perfil, publicaciones, votos y comentarios sobreviven a una recarga', () => {
  const storage = memory()
  const store = createFeedbackStore(storage)
  assert.throws(() => store.post('Idea'), /perfil/)
  store.createProfile('  Ana  ', 'Diseño')
  const id = store.post('Una sugerencia', 'suggestion')
  store.vote(id)
  assert.equal(store.posts.value[0].likes.length, 1)
  store.vote(id)
  assert.equal(store.posts.value[0].likes.length, 0)
  store.comment(id, 'Me gusta')
  store.resolve(id)
  const reloaded = createFeedbackStore(storage)
  assert.equal(reloaded.profile.value.name, 'Ana')
  assert.equal(reloaded.posts.value[0].type, 'suggestion')
  assert.equal(reloaded.posts.value[0].comments[0].body, 'Me gusta')
  assert.equal(reloaded.posts.value[0].resolved, true)
})
test('rechaza entradas vacías, tipos inválidos y comentarios huérfanos', () => {
  const store = createFeedbackStore(memory())
  assert.throws(() => store.createProfile('   ', ''))
  store.createProfile('Ana', '')
  assert.throws(() => store.post('   '))
  assert.throws(() => store.post('Texto', 'inventado'))
  assert.throws(() => store.comment('inexistente', 'Mensaje'))
  assert.throws(() => store.post('a'.repeat(1001)))
  assert.equal(store.posts.value.length, 0)
})
test('un fallo de almacenamiento no crea un voto ni un comentario en memoria', () => {
  const storage = memory()
  const store = createFeedbackStore(storage)
  store.createProfile('Ana', '')
  const id = store.post('Idea')
  storage.setItem = () => { throw new Error('Quota') }
  assert.throws(() => store.vote(id), /guardar/)
  assert.throws(() => store.comment(id, 'Mensaje'), /guardar/)
  assert.equal(store.posts.value[0].likes.length, 0)
  assert.equal(store.posts.value[0].comments.length, 0)
})
