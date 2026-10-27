import { computed, ref, watch } from 'vue'
import { accountBalance, toCents } from './financeMath.js'
import { cloudEnabled, useCloudSession } from './useCloudSession.js'

const storageKey = 'stepbro.finance.v1'
const defaults = [
  { id: 'food', name: 'Alimentos', symbol: '🍔', description: '' },
  { id: 'home', name: 'Hogar', symbol: '🏠', description: '' },
  { id: 'transport', name: 'Transporte', symbol: '🚗', description: '' },
  { id: 'leisure', name: 'Ocio', symbol: '🎟️', description: '' },
  { id: 'health', name: 'Salud', symbol: '💊', description: '' },
  { id: 'salary', name: 'Sueldo', symbol: '💼', description: '' },
  { id: 'other', name: 'Otros', symbol: '✳', description: '' },
]
const initial = () => ({ accounts: [{ id: 'cash', name: 'Efectivo', opening: 0, type: 'cash', currency: 'USD', symbol: '💵' }], transactions: [], categories: defaults.map(c => ({ ...c })), intentions: [] })
const error = ref('')
export const currencies = ['USD', 'MXN', 'EUR', 'COP']
export const frequencies = [{ id: 'once', label: 'Una vez' }, { id: 'daily', label: 'Diaria' }, { id: 'weekly', label: 'Semanal' }, { id: 'fortnightly', label: 'Quincenal' }, { id: 'monthly', label: 'Mensual' }, { id: 'yearly', label: 'Anual' }]
export const accountTypes = [{ id: 'cash', label: 'Efectivo', symbol: '💵' }, { id: 'bank', label: 'Banco', symbol: '🏦' }, { id: 'savings', label: 'Ahorro', symbol: '🐷' }, { id: 'other', label: 'Otra', symbol: '👛' }]
export function localDate() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false
  const date = new Date(`${value}T12:00:00`)
  return !Number.isNaN(date.getTime()) && date.getDate() === Number(value.slice(-2))
}
function load() {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return initial()
    const value = JSON.parse(raw)
    if (!Array.isArray(value.accounts) || !value.accounts.length || !Array.isArray(value.transactions)
      || !value.accounts.every(a => typeof a.id === 'string' && typeof a.name === 'string' && Number.isSafeInteger(a.opening))
      || !value.transactions.every(t => ['income', 'expense', 'transfer'].includes(t.type) && Number.isSafeInteger(t.amount) && t.amount > 0 && typeof t.description === 'string' && validDate(t.date) && (!t.accountId || value.accounts.some(a => a.id === t.accountId)))) throw new Error()
    // Migra las primeras cuentas sin perder sus movimientos ni el saldo inicial.
    return { ...value, transactions: value.transactions.map(t => ({ currency: value.accounts.find(a => a.id === t.accountId)?.currency || t.currency || 'USD', ...t })), accounts: value.accounts.map(a => ({ type: 'cash', currency: 'USD', symbol: '💵', ...a })), categories: Array.isArray(value.categories) ? value.categories : defaults.map(c => ({ ...c })), intentions: Array.isArray(value.intentions) ? value.intentions : [] }
  } catch { error.value = 'No se pudieron leer los datos guardados en este navegador.'; return initial() }
}
const state = ref(cloudEnabled ? initial() : load())
let cloudVersion = 0
let cloudReady = false
let cloudEpoch = 0
let cloudWriteLock = null
const cloudSession = useCloudSession()
let savedCurrency
try { savedCurrency = cloudEnabled ? null : localStorage.getItem('stepbro.primary-currency') } catch { /* Usa la moneda inicial. */ }
const activeCurrency = ref(currencies.includes(savedCurrency) ? savedCurrency : state.value.accounts[0].currency)
watch(activeCurrency, currency => {
  if (cloudEnabled) return
  try { localStorage.setItem('stepbro.primary-currency', currency) } catch { /* Conserva la selección en esta sesión. */ }
}, { flush: 'sync' })
const accounts = computed(() => state.value.accounts.map(a => ({ ...a, balance: accountBalance(a, state.value.transactions) })))
const categories = computed(() => state.value.categories)
const intentions = computed(() => [...state.value.intentions].sort((a, b) => a.date.localeCompare(b.date)))
const transactions = computed(() => [...state.value.transactions].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt))
const unassignedBalance = computed(() => transactions.value.filter(t => !t.accountId && t.currency === activeCurrency.value).reduce((sum, t) => sum + (t.type === 'income' ? t.amount : t.type === 'expense' ? -t.amount : 0), 0))
const balance = computed(() => accounts.value.filter(a => a.currency === activeCurrency.value).reduce((sum, a) => sum + a.balance, 0) + unassignedBalance.value)
const monthIncome = computed(() => transactions.value.filter(t => t.type === 'income' && t.currency === activeCurrency.value && t.date.startsWith(localDate().slice(0, 7))).reduce((n, t) => n + t.amount, 0))
const monthExpense = computed(() => transactions.value.filter(t => t.type === 'expense' && t.currency === activeCurrency.value && t.date.startsWith(localDate().slice(0, 7))).reduce((n, t) => n + t.amount, 0))
export const money = (cents, currency = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100)
export const categoryFor = id => state.value.categories.find(c => c.id === id) || { name: 'Sin categoría', symbol: '·' }
function commit(next) {
  if (!cloudEnabled) {
    try { localStorage.setItem(storageKey, JSON.stringify(next)) }
    catch { throw new Error('No se pudo guardar. Comprueba que el navegador permita almacenamiento local.') }
    state.value = next; error.value = ''
    return undefined
  }
  if (!cloudSession.user.value) return Promise.reject(new Error('Inicia sesión en Configuración → Cuenta para guardar tus movimientos.'))
  if (!cloudReady || !Number.isInteger(cloudVersion)) return Promise.reject(new Error('Espera a que termine la carga de tus datos antes de guardar.'))
  if (cloudWriteLock) return Promise.reject(new Error('Espera a que termine el guardado actual.'))
  const requestLock = Symbol('finance-write')
  const requestEpoch = cloudEpoch
  const requestRevision = cloudSession.sessionRevision.value
  cloudWriteLock = requestLock
  const isCurrent = () => requestEpoch === cloudEpoch && requestRevision === cloudSession.sessionRevision.value
  return cloudSession.request('/api/finance', { method: 'PUT', body: { state: next, version: cloudVersion } })
    .then(payload => {
      if (!isCurrent()) throw new Error('La sesión cambió antes de completar el guardado.')
      if (!payload?.state || !Number.isInteger(payload.version)) throw new Error('La respuesta del servidor no es válida.')
      state.value = payload.state
      cloudVersion = payload.version
      error.value = ''
    })
    .catch(cause => {
      if (!isCurrent()) throw new Error('La sesión cambió antes de completar el guardado.')
      if (cause.status === 409) throw new Error('Los datos cambiaron en otra sesión. Recarga la información antes de volver a guardar.')
      throw cause
    })
    .finally(() => { if (cloudWriteLock === requestLock) cloudWriteLock = null })
}
export async function initializeFinance() {
  if (!cloudEnabled || !cloudSession.user.value) return
  const requestEpoch = ++cloudEpoch
  const requestRevision = cloudSession.sessionRevision.value
  cloudReady = false
  cloudVersion = 0
  cloudWriteLock = null
  const payload = await cloudSession.request('/api/finance')
  if (requestEpoch !== cloudEpoch || requestRevision !== cloudSession.sessionRevision.value || !cloudSession.user.value) return
  if (!payload?.state || !Number.isInteger(payload.version)) throw new Error('La respuesta financiera del servidor no es válida.')
  state.value = payload.state
  cloudVersion = payload.version
  cloudReady = true
  activeCurrency.value = state.value.accounts.find(a => a.currency === activeCurrency.value)?.currency || state.value.accounts[0]?.currency || currencies[0]
}
export function resetCloudFinance() {
  if (!cloudEnabled) return
  cloudEpoch++
  cloudReady = false
  cloudVersion = 0
  cloudWriteLock = null
  state.value = initial()
}
const requireName = (name, max = 120) => { if (!String(name || '').trim()) throw new Error('Escribe un nombre o descripción.'); return name.trim().slice(0, max) }
function movementData(input) {
  const account = input.accountId ? state.value.accounts.find(a => a.id === input.accountId) : null
  if ((input.accountId || input.type === 'transfer') && !account) throw new Error('Selecciona una cuenta.')
  const amount = toCents(input.amount)
  if (!amount) throw new Error('El importe debe ser mayor que cero.')
  if (!['income', 'expense', 'transfer'].includes(input.type)) throw new Error('Selecciona un tipo de movimiento.')
  const date = input.date || localDate()
  if (!validDate(date)) throw new Error('Selecciona una fecha válida.')
  if (input.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time)) throw new Error('La hora no es válida.')
  if (input.category && !categories.value.some(c => c.id === input.category)) throw new Error('Selecciona una categoría válida.')
  const currency = account?.currency || (currencies.includes(input.currency) ? input.currency : activeCurrency.value)
  let destinationAmount, destinationCurrency
  if (input.type === 'transfer') {
    const destination = state.value.accounts.find(a => a.id === input.destinationId)
    if (!destination || destination.id === account.id) throw new Error('Selecciona una cuenta de destino diferente.')
    destinationCurrency = destination.currency
    destinationAmount = destination.currency === currency ? amount : toCents(input.destinationAmount)
    if (!destinationAmount) throw new Error('Indica cuánto recibe la cuenta de destino.')
  }
  return { type: input.type, amount, accountId: account?.id || '', currency, description: String(input.description || '').trim().slice(0, 120), category: input.category || '', date, time: input.time || '', note: String(input.note || '').slice(0, 1000), destinationId: input.type === 'transfer' ? input.destinationId : '', destinationAmount, destinationCurrency }
}
function saveMovement(input, id) {
  const existing = id && state.value.transactions.find(t => t.id === id)
  if (id && !existing) throw new Error('Este movimiento ya no existe.')
  const location = input.location || existing?.location
  if (location && (!Number.isFinite(location.latitude) || Math.abs(location.latitude) > 90
    || !Number.isFinite(location.longitude) || Math.abs(location.longitude) > 180
    || !Number.isFinite(location.accuracy) || location.accuracy < 0)) {
    throw new Error('La ubicación no es válida.')
  }
  const item = { ...movementData(input), ...(location ? { location: { latitude: location.latitude, longitude: location.longitude, accuracy: location.accuracy } } : {}), id: existing?.id || crypto.randomUUID(), createdAt: existing?.createdAt || Date.now() }
  const result = commit({ ...state.value, transactions: existing ? state.value.transactions.map(t => t.id === id ? item : t) : [...state.value.transactions, item] })
  if (result?.then) return result.then(() => { if (activeCurrency.value !== item.currency) activeCurrency.value = item.currency })
  if (activeCurrency.value !== item.currency) activeCurrency.value = item.currency
}
function deleteMovement(id) { return commit({ ...state.value, transactions: state.value.transactions.filter(t => t.id !== id) }) }
function saveAccount(input, id) {
  const existing = state.value.accounts.find(a => a.id === id)
  const name = requireName(input.name, 40)
  if (state.value.accounts.some(a => a.id !== id && a.name.toLocaleLowerCase() === name.toLocaleLowerCase())) throw new Error('Ya existe una cuenta con ese nombre.')
  if (!currencies.includes(input.currency)) throw new Error('Selecciona una moneda válida.')
  if (existing && existing.currency !== input.currency && [...state.value.transactions, ...state.value.intentions].some(t => t.accountId === id || t.destinationId === id)) throw new Error('No se puede cambiar la moneda de una cuenta con movimientos o intenciones.')
  const type = accountTypes.find(t => t.id === input.type)
  if (!type) throw new Error('Selecciona un tipo de cuenta.')
  const item = { id: id || crypto.randomUUID(), name, opening: toCents(input.opening || '0'), currency: input.currency, type: type.id, symbol: type.symbol }
  const result = commit({ ...state.value, accounts: id ? state.value.accounts.map(a => a.id === id ? item : a) : [...state.value.accounts, item] })
  if (result?.then) return result.then(() => { if (!state.value.accounts.some(a => a.currency === activeCurrency.value)) activeCurrency.value = item.currency })
  if (!state.value.accounts.some(a => a.currency === activeCurrency.value)) activeCurrency.value = item.currency
}
function deleteAccount(id) {
  if (state.value.accounts.length === 1) throw new Error('Conserva al menos una cuenta.')
  if (state.value.transactions.some(t => t.accountId === id || t.destinationId === id) || state.value.intentions.some(t => t.accountId === id || t.destinationId === id)) throw new Error('Esta cuenta tiene movimientos o intenciones asociados.')
  const result = commit({ ...state.value, accounts: state.value.accounts.filter(a => a.id !== id) })
  if (result?.then) return result.then(() => { if (!state.value.accounts.some(a => a.currency === activeCurrency.value)) activeCurrency.value = state.value.accounts[0].currency })
  if (!result?.then && !state.value.accounts.some(a => a.currency === activeCurrency.value)) activeCurrency.value = state.value.accounts[0].currency
}
function saveCategory(input, id) {
  const name = requireName(input.name, 40)
  if (categories.value.some(c => c.id !== id && c.name.toLocaleLowerCase() === name.toLocaleLowerCase())) throw new Error('Ya existe esa categoría.')
  const item = { id: id || crypto.randomUUID(), name, description: String(input.description || '').slice(0, 400), symbol: String(input.symbol || '✳').slice(0, 12) }
  return commit({ ...state.value, categories: id ? categories.value.map(c => c.id === id ? item : c) : [...categories.value, item] })
}
function deleteCategory(id) {
  return commit({ ...state.value, categories: categories.value.filter(c => c.id !== id), transactions: state.value.transactions.map(t => t.category === id ? { ...t, category: '' } : t), intentions: state.value.intentions.map(t => t.category === id ? { ...t, category: '' } : t) })
}
function saveIntention(input, id) {
  const name = requireName(input.name)
  const amount = toCents(input.amount)
  if (!amount) throw new Error('El monto esperado debe ser mayor que cero.')
  if (!frequencies.some(f => f.id === input.frequency) || !validDate(input.date)) throw new Error('Revisa la frecuencia y la fecha.')
  if (input.accountId && !accounts.value.some(a => a.id === input.accountId)) throw new Error('Selecciona una cuenta válida.')
  if (input.category && !categories.value.some(c => c.id === input.category)) throw new Error('Selecciona una categoría válida.')
  if (input.destinationId && (!accounts.value.some(a => a.id === input.destinationId) || input.destinationId === input.accountId)) throw new Error('El destino debe ser una cuenta diferente.')
  const item = { id: id || crypto.randomUUID(), name, amount, frequency: input.frequency, date: input.date, note: String(input.note || '').slice(0, 1000), category: input.category || '', accountId: input.accountId || '', destinationId: input.destinationId || '', currency: accounts.value.find(a => a.id === input.accountId)?.currency || activeCurrency.value, paused: !!input.paused }
  return commit({ ...state.value, intentions: id ? intentions.value.map(t => t.id === id ? item : t) : [...intentions.value, item] })
}
function deleteIntention(id) { return commit({ ...state.value, intentions: intentions.value.filter(t => t.id !== id) }) }
function toggleIntention(id) { return commit({ ...state.value, intentions: intentions.value.map(t => t.id === id ? { ...t, paused: !t.paused } : t) }) }
export function useFinanceStore() {
  return { accounts, transactions, balance, categories, intentions, activeCurrency, monthIncome, monthExpense, error, cloudEnabled,
    addMovement: input => saveMovement(input), saveMovement, deleteMovement,
    addAccount: input => saveAccount({ type: 'cash', currency: activeCurrency.value, ...input }), saveAccount, deleteAccount,
    saveCategory, deleteCategory, saveIntention, deleteIntention, toggleIntention }
}
