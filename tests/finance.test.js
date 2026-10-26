import test from 'node:test'
import assert from 'node:assert/strict'
import { toCents, accountBalance } from '../src/composables/financeMath.js'

async function freshStore(saved) {
  const values = new Map(saved ? [['stepbro.finance.v1', JSON.stringify(saved)]] : [])
  globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }
  const module = await import(`../src/composables/useFinanceStore.js?test=${crypto.randomUUID()}`)
  return { store: module.useFinanceStore(), values }
}
const movement = (overrides = {}) => ({ type: 'expense', amount: '10.10', accountId: 'cash', description: 'Compra', date: '2026-10-25', category: '', ...overrides })

test('centavos exactos y rechazo de importes inválidos', () => {
  assert.equal(toCents('0.10') + toCents('0.20'), 30)
  assert.equal(toCents('12,45'), 1245)
  for (const value of ['-1', '1.001', 'Infinity', 'abc', '10000000000']) assert.throws(() => toCents(value))
})
test('ingresar, editar y eliminar actualiza las cuentas sin alterar el saldo inicial', async () => {
  const { store: s } = await freshStore()
  s.saveMovement(movement({ type: 'income', amount: '100' }))
  s.saveMovement(movement())
  assert.equal(s.balance.value, 8990)
  const expense = s.transactions.value.find(t => t.type === 'expense')
  s.saveMovement(movement({ amount: '20' }), expense.id)
  assert.equal(s.balance.value, 8000)
  s.deleteMovement(expense.id)
  assert.equal(s.balance.value, 10000)
  assert.equal(s.accounts.value[0].opening, 0)
})
test('una transferencia conserva el total y mueve el dinero entre cuentas', async () => {
  const { store: s } = await freshStore()
  s.saveAccount({ name: 'Banco', opening: '100', currency: 'USD', type: 'bank' })
  const bank = s.accounts.value.find(a => a.name === 'Banco')
  s.saveMovement(movement({ type: 'transfer', accountId: bank.id, destinationId: 'cash', amount: '25' }))
  assert.equal(s.balance.value, 10000)
  assert.equal(s.accounts.value.find(a => a.id === bank.id).balance, 7500)
  assert.equal(s.accounts.value.find(a => a.id === 'cash').balance, 2500)
})
test('las monedas se calculan por separado y el cambio se indica explícitamente', async () => {
  const { store: s } = await freshStore()
  s.saveAccount({ name: 'Euros', opening: '0', currency: 'EUR', type: 'bank' })
  const euros = s.accounts.value.find(a => a.name === 'Euros')
  s.saveMovement(movement({ type: 'income', amount: '100' }))
  s.saveMovement(movement({ type: 'transfer', amount: '50', destinationId: euros.id, destinationAmount: '45' }))
  assert.equal(s.balance.value, 5000)
  s.activeCurrency.value = 'EUR'
  assert.equal(s.balance.value, 4500)
  assert.throws(() => s.saveMovement(movement({ type: 'transfer', destinationId: 'cash' })))
  assert.throws(() => s.saveAccount({ ...euros, currency: 'USD', opening: '0' }, euros.id))
})
test('borrar una categoría conserva el movimiento y su saldo', async () => {
  const { store: s } = await freshStore()
  s.saveCategory({ name: 'Viajes', symbol: '✈', description: 'Salidas' })
  const category = s.categories.value.find(c => c.name === 'Viajes')
  s.saveMovement(movement({ category: category.id }))
  s.deleteCategory(category.id)
  assert.equal(s.transactions.value.length, 1)
  assert.equal(s.transactions.value[0].category, '')
  assert.equal(s.balance.value, -1010)
})
test('una intención se guarda y pausa sin ejecutar cargos', async () => {
  const { store: s } = await freshStore()
  s.saveIntention({ name: 'Alquiler', amount: '400', frequency: 'monthly', date: '2026-11-01', accountId: 'cash' })
  const intention = s.intentions.value[0]
  assert.equal(intention.amount, 40000)
  assert.equal(s.balance.value, 0)
  assert.equal(s.transactions.value.length, 0)
  s.toggleIntention(intention.id)
  assert.equal(s.intentions.value[0].paused, true)
  s.deleteIntention(intention.id)
  assert.equal(s.intentions.value.length, 0)
})
test('rechaza fechas, cuentas y transferencias inválidas sin guardar registros', async () => {
  const { store: s } = await freshStore()
  for (const overrides of [{ date: '2026-02-30' }, { accountId: 'missing' }, { amount: '0' }, { type: 'transfer', destinationId: 'cash' }]) assert.throws(() => s.saveMovement(movement(overrides)))
  assert.equal(s.transactions.value.length, 0)
})
test('migra los datos iniciales conservando el historial y la moneda', async () => {
  const { store: s } = await freshStore({ accounts: [{ id: 'cash', name: 'Efectivo', opening: 10000 }], transactions: [{ ...movement(), id: 'old', amount: 1010, createdAt: 1 }] })
  assert.equal(s.balance.value, 8990)
  assert.equal(s.accounts.value[0].currency, 'USD')
  assert.equal(s.transactions.value[0].currency, 'USD')
  assert.ok(s.categories.value.length)
})
test('un fallo de almacenamiento no modifica el saldo en memoria', async () => {
  const { store: s } = await freshStore()
  globalThis.localStorage.setItem = () => { throw new Error('Sin espacio') }
  assert.throws(() => s.saveMovement(movement()))
  assert.equal(s.balance.value, 0)
  assert.equal(s.transactions.value.length, 0)
})
test('la fórmula pura aplica importes recibidos de transferencias', () => {
  assert.equal(accountBalance({ id: 'eur', opening: 0 }, [{ type: 'transfer', accountId: 'usd', destinationId: 'eur', amount: 5000, destinationAmount: 4500 }]), 4500)
})
