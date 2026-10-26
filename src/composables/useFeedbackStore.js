import { computed, ref } from 'vue'

const key = 'stepbro.community.v1'
export function createFeedbackStore(storage) {
  const state = ref({ profile: null, posts: [] })
  const error = ref('')
  try {
    const saved = JSON.parse(storage.getItem(key) || 'null')
    if (saved && Array.isArray(saved.posts) && (!saved.profile || typeof saved.profile.name === 'string')) {
      state.value = { profile: saved.profile, posts: saved.posts.filter(p => typeof p.id === 'string' && typeof p.body === 'string' && Array.isArray(p.comments)) }
    }
  } catch { error.value = 'No se pudieron leer los datos de la comunidad.' }
  function commit(next) {
    try { storage.setItem(key, JSON.stringify(next)) }
    catch { throw new Error('No se pudo guardar. Revisa el almacenamiento de tu navegador.') }
    state.value = next
    error.value = ''
  }
  function text(value, max, required = true) {
    const result = String(value || '').trim()
    if (required && !result) throw new Error('Completa el campo antes de continuar.')
    if (result.length > max) throw new Error(`El máximo es de ${max} caracteres.`)
    return result
  }
  function profileRequired() { if (!state.value.profile) throw new Error('Crea tu perfil para participar.') }
  function createProfile(name, description) {
    const profile = { id: state.value.profile?.id || crypto.randomUUID(), name: text(name, 255), description: text(description, 1000, false) }
    commit({ ...state.value, profile })
  }
  function updatePost(id, change) {
    profileRequired()
    if (!state.value.posts.some(p => p.id === id)) throw new Error('La publicación ya no está disponible.')
    commit({ ...state.value, posts: state.value.posts.map(p => p.id === id ? change(p) : p) })
  }
  function post(body, type = 'other') {
    profileRequired()
    if (!['bug', 'feature', 'criticism', 'praise', 'suggestion', 'other'].includes(type)) throw new Error('Selecciona un tipo válido.')
    const item = { id: crypto.randomUUID(), author: { ...state.value.profile }, body: text(body, 1000), type, createdAt: Date.now(), resolved: false, likes: [], comments: [] }
    commit({ ...state.value, posts: [item, ...state.value.posts] })
    return item.id
  }
  function vote(id) {
    updatePost(id, p => ({ ...p, likes: p.likes.includes(state.value.profile.id) ? p.likes.filter(v => v !== state.value.profile.id) : [...p.likes, state.value.profile.id] }))
  }
  function comment(id, body) {
    const message = text(body, 1000)
    updatePost(id, p => ({ ...p, comments: [...p.comments, { id: crypto.randomUUID(), author: { ...state.value.profile }, body: message, createdAt: Date.now() }] }))
  }
  function resolve(id) {
    updatePost(id, p => {
      if (p.author.id !== state.value.profile.id) throw new Error('Solo puedes cambiar tus publicaciones.')
      return { ...p, resolved: !p.resolved }
    })
  }
  return { profile: computed(() => state.value.profile), posts: computed(() => state.value.posts), error, createProfile, post, vote, comment, resolve }
}
let store
export function useFeedbackStore() {
  store ??= createFeedbackStore({ getItem: key => localStorage.getItem(key), setItem: (key, value) => localStorage.setItem(key, value) })
  return store
}
