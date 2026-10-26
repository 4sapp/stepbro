<script setup>
import FinanceSelect from './FinanceSelect.vue'
import { computed, nextTick, reactive, ref, useId, watch } from 'vue'
import { useFinanceStore, localDate, currencies } from '../composables/useFinanceStore'
import TouchButton from './TouchButton.vue'
import { useMorphPanel } from '../composables/useMorphPanel'
import { useDragDismiss } from '../composables/useDragDismiss'
import { useMovementFieldsMotion } from '../composables/useMovementFieldsMotion'
import { currentLocation, useLocationPreference } from '../composables/useLocationPreference'
import './MovementPanel.css'

const titleId = useId()
const props = defineProps({ description: { type: String, default: '' }, hiddenTrigger: Boolean })
const { dialog, phase, open: openPanel, close } = useMorphPanel()
const drag = useDragDismiss({
  target: dialog,
  canDrag: () => phase.value === 'open',
  dismiss: close,
})

const { accounts, categories, activeCurrency, saveMovement, deleteMovement } = useFinanceStore()
const action = ref(null)
const editing = ref(null)
const showNote = ref(false)
const types = ref(null)
const typeIndicator = ref(null)
const emptyForm = () => ({ type: 'expense', amount: '', currency: activeCurrency.value, description: '', accountId: '', category: '', date: localDate(), time: new Date().toTimeString().slice(0, 5), note: '', destinationId: '', destinationAmount: '', location: null })
const form = reactive(emptyForm())
const accountCurrency = computed(() => accounts.value.find(a => a.id === form.accountId)?.currency || form.currency || activeCurrency.value)
const destinationCurrency = computed(() => accounts.value.find(a => a.id === form.destinationId)?.currency || accountCurrency.value)
const shortMonths = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const formattedDate = computed(() => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date || '')) return 'Fecha'
  const [y, m, d] = form.date.split('-').map(Number)
  return `${d} ${shortMonths[m - 1]} ${String(y).slice(-2)}`
})
const formattedTime = computed(() => {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(form.time || '')) return 'Hora'
  const [h, m] = form.time.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
})
watch(() => form.accountId, id => {
  const account = accounts.value.find(a => a.id === id)
  if (account) form.currency = account.currency
})
watch(() => form.currency, currency => {
  const account = accounts.value.find(a => a.id === form.accountId)
  if (account && account.currency !== currency) form.accountId = ''
})
const formError = ref('')
const saving = ref(false)
const { locationEnabled } = useLocationPreference()
let saveRevision = 0
watch(phase, value => { if (value === 'closing' || value === 'closed') { saveRevision++; saving.value = false } })
useMovementFieldsMotion({
  dialog, phase, types, indicator: typeIndicator, selectedType: () => form.type,
  sources: () => [form.type, form.accountId, form.currency, form.destinationId, showNote.value, formError.value],
})
async function open(event) {
  const origin = event.currentTarget
  editing.value = null
  showNote.value = false
  Object.assign(form, emptyForm(), { description: props.description.trim() })
  formError.value = ''
  await nextTick()
  openPanel({ currentTarget: origin })
}
async function edit(item, event) {
  const origin = event.currentTarget
  editing.value = item.id
  showNote.value = !!item.note
  Object.assign(form, emptyForm(), item, { amount: String(item.amount / 100), destinationAmount: item.destinationAmount ? String(item.destinationAmount / 100) : '' })
  formError.value = ''
  await nextTick()
  openPanel({ currentTarget: origin })
}
async function save() {
  if (saving.value) return
  const revision = ++saveRevision
  saving.value = true
  try {
    const input = { ...form }
    if (locationEnabled.value && !editing.value) input.location = await currentLocation()
    if (revision !== saveRevision) return
    saveMovement(input, editing.value)
    formError.value = ''
    close()
  } catch (cause) {
    if (revision === saveRevision) formError.value = cause.message
  } finally {
    if (revision === saveRevision) saving.value = false
  }
}
function remove() {
  if (!confirm('¿Eliminar este movimiento? Se actualizará el saldo de la cuenta.')) return
  close(); deleteMovement(editing.value)
}
function openFromQuickEntry() { action.value?.querySelector('button')?.click() }
async function createTransfer(event) {
  const origin = event.currentTarget
  editing.value = null
  showNote.value = false
  Object.assign(form, emptyForm(), { type: 'transfer', accountId: accounts.value.find(a => a.currency === activeCurrency.value)?.id || accounts.value[0]?.id || '' })
  formError.value = ''
  await nextTick()
  openPanel({ currentTarget: origin })
}
defineExpose({ openFromQuickEntry, edit, createTransfer })

function disableLeavingFields(element) {
  element.setAttribute('inert', '')
  element.querySelectorAll('input, select, textarea').forEach(control => {
    control.dataset.wasDisabled = control.disabled ? '1' : '0'
    control.disabled = true
  })
}
function restoreLeavingFields(element) {
  element.removeAttribute('inert')
  element.querySelectorAll('[data-was-disabled]').forEach(control => {
    control.disabled = control.dataset.wasDisabled === '1'
    delete control.dataset.wasDisabled
  })
}
function closeFromBackdrop(event) {
  if (event.target !== dialog.value) return
  const bounds = dialog.value.getBoundingClientRect()
  const outside = event.clientX < bounds.left || event.clientX > bounds.right
    || event.clientY < bounds.top || event.clientY > bounds.bottom
  if (outside) close()
}
</script>

<template>
  <div v-if="!hiddenTrigger" ref="action" class="movement-action">
    <TouchButton icon-only label="Movimiento" aria-haspopup="dialog" @click="open" />
  </div>

  <Teleport to="body">
    <dialog
      ref="dialog"
      class="movement-panel"
      :aria-labelledby="titleId"
      @cancel.prevent="close"
      @click="closeFromBackdrop"
    >
      <div class="movement-panel__surface" data-panel-surface aria-hidden="true" />
      <div
        class="movement-panel__layout"
        data-panel-layout
        @pointerdown="drag.start"
        @pointermove="drag.move"
        @pointerup="drag.end"
        @pointercancel="drag.cancel"
        @lostpointercapture="drag.cancel"
        @wheel="drag.wheel"
      >
        <header class="movement-panel__header">
          <button class="movement-panel__close" type="button" aria-label="Cerrar" data-panel-content @click="close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
          <h2 :id="titleId" data-shared-item="title">{{ editing ? 'Editar' : 'Crear' }}<br />movimiento</h2>
        </header>
        <TransitionGroup name="movement-fields" tag="form" @before-leave="disableLeavingFields" @leave-cancelled="restoreLeavingFields" @after-enter="restoreLeavingFields" class="movement-panel__body movement-form" data-panel-content data-no-drag @submit.prevent="save">
          <fieldset key="types" ref="types" class="movement-form__types">
            <span ref="typeIndicator" class="movement-form__type-indicator" aria-hidden="true" />
            <legend class="visually-hidden">Tipo de movimiento</legend>
            <label :class="{ 'is-selected': form.type === 'expense' }"><input v-model="form.type" type="radio" value="expense" />Gasto</label>
            <label :class="{ 'is-selected': form.type === 'income' }"><input v-model="form.type" type="radio" value="income" />Ingreso</label>
            <label :class="{ 'is-selected': form.type === 'transfer' }"><input v-model="form.type" type="radio" value="transfer" />Transferencia</label>
          </fieldset>
          <label key="description" class="movement-field">
            <span class="movement-field__label">Descripción</span>
            <input v-model="form.description" maxlength="120" required />
          </label>
          <div key="amount" class="movement-form__row movement-form__row--amount">
            <label class="movement-field">
              <span class="movement-field__label">Monto</span>
              <input v-model="form.amount" type="number" min="0.01" step="0.01" max="9999999999.99" placeholder="0.00" inputmode="decimal" required />
            </label>
            <label class="movement-field movement-field--select">
              <span class="movement-field__label">Divisa</span>
              <FinanceSelect v-model="form.currency" aria-label="Divisa">
                <option v-for="currency in currencies" :key="currency" :value="currency">{{ currency }}</option>
              </FinanceSelect>
            </label>
          </div>
          <label key="category" class="movement-field movement-field--select">
            <span class="movement-field__label">Categoría</span>
            <FinanceSelect v-model="form.category" aria-label="Categoría">
              <option value="">Sin categoría</option>
              <option v-for="category in categories" :key="category.id" :value="category.id">{{ category.name }}</option>
            </FinanceSelect>
          </label>
          <label key="account" class="movement-field movement-field--select">
            <span class="movement-field__label">Cuenta</span>
            <FinanceSelect v-model="form.accountId" aria-label="Cuenta" :required="form.type === 'transfer'">
              <option value="">Sin cuenta</option>
              <option v-for="account in accounts" :key="account.id" :value="account.id">{{ account.name }} · {{ account.currency }}</option>
            </FinanceSelect>
          </label>
          <label v-if="form.type === 'transfer'" key="destination" class="movement-field movement-field--select">
            <span class="movement-field__label">Cuenta de destino</span>
            <FinanceSelect v-model="form.destinationId" aria-label="Cuenta de destino" required>
              <option value="" disabled>Selecciona una cuenta</option>
              <option v-for="account in accounts.filter(a => a.id !== form.accountId)" :key="account.id" :value="account.id">{{ account.name }} · {{ account.currency }}</option>
            </FinanceSelect>
          </label>
          <label v-if="form.type === 'transfer' && form.destinationId && destinationCurrency !== accountCurrency" key="received" class="movement-field">
            <span class="movement-field__label">Importe recibido · {{ destinationCurrency }}</span>
            <input v-model="form.destinationAmount" type="number" step="0.01" min="0.01" placeholder="0.00" required inputmode="decimal" />
          </label>
          <div key="date" class="movement-form__row">
            <label class="movement-field movement-field--picker">
              <span class="visually-hidden">Fecha</span>
              <span class="movement-field__picker-value">{{ formattedDate }}</span>
              <svg class="movement-field__picker-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="3" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
              <input v-model="form.date" type="date" required @click="$event.target.showPicker?.()" />
            </label>
            <label class="movement-field movement-field--picker">
              <span class="visually-hidden">Hora</span>
              <span class="movement-field__picker-value">{{ formattedTime }}</span>
              <svg class="movement-field__picker-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
              <input v-model="form.time" type="time" @click="$event.target.showPicker?.()" />
            </label>
          </div>
          <button v-if="!showNote" key="note-toggle" class="movement-form__add-note" type="button" @click="showNote = true">
            <span aria-hidden="true">+</span>
            <span>Agregar campo</span>
          </button>
          <label v-else key="note" class="movement-field">
            <span class="movement-field__label">Nota</span>
            <textarea v-model="form.note" maxlength="1000" placeholder="Algo que quieras recordar" rows="2" />
          </label>
          <p v-if="formError" key="error" class="movement-form__error" role="alert">{{ formError }}</p>
          <footer key="actions" class="finance-fields__footer movement-form__footer">
            <button v-if="editing" class="finance-delete" type="button" @click="remove">Eliminar</button>
            <button class="movement-form__cancel" type="button" aria-label="Cancelar" @click="close">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
            <button class="movement-form__save" type="submit" :disabled="saving">{{ editing ? 'Guardar' : 'Crear' }}</button>
          </footer>
        </TransitionGroup>
      </div>
    </dialog>
  </Teleport>
</template>
