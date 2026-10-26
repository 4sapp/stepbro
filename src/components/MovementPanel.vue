<script setup>
import FinanceSelect from './FinanceSelect.vue'
import { computed, nextTick, reactive, ref, useId } from 'vue'
import { useFinanceStore, localDate } from '../composables/useFinanceStore'
import TouchButton from './TouchButton.vue'
import { useMorphPanel } from '../composables/useMorphPanel'
import { useDragDismiss } from '../composables/useDragDismiss'
import { useMovementFieldsMotion } from '../composables/useMovementFieldsMotion'
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
const accountCurrency = computed(() => accounts.value.find(a => a.id === form.accountId)?.currency || activeCurrency.value)
const destinationCurrency = computed(() => accounts.value.find(a => a.id === form.destinationId)?.currency || accountCurrency.value)
const emptyForm = () => ({ type: 'expense', amount: '', description: '', accountId: accounts.value.find(a => a.currency === activeCurrency.value)?.id || accounts.value[0]?.id || '', category: '', date: localDate(), time: new Date().toTimeString().slice(0, 5), note: '', destinationId: '', destinationAmount: '' })
const form = reactive(emptyForm())
const formError = ref('')
useMovementFieldsMotion({
  dialog, phase, types, indicator: typeIndicator, selectedType: () => form.type,
  sources: () => [form.type, form.accountId, form.destinationId, showNote.value, formError.value],
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
function save() {
  try { saveMovement({ ...form }, editing.value); formError.value = ''; close() }
  catch (cause) { formError.value = cause.message }
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
  Object.assign(form, emptyForm(), { type: 'transfer' })
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
          <h2 :id="titleId" data-shared-item="title">{{ editing ? 'Editar movimiento' : 'Crear movimiento' }}</h2>
          <button class="movement-panel__close" type="button" aria-label="Cerrar" data-panel-content @click="close">×</button>
        </header>
        <TransitionGroup name="movement-fields" tag="form" @before-leave="disableLeavingFields" @leave-cancelled="restoreLeavingFields" @after-enter="restoreLeavingFields" class="movement-panel__body movement-form" data-panel-content data-no-drag @submit.prevent="save">
          <fieldset key="types" ref="types" class="movement-form__types">
            <span ref="typeIndicator" class="movement-form__type-indicator" aria-hidden="true" />
            <legend class="visually-hidden">Tipo de movimiento</legend>
            <label :class="{ 'is-selected': form.type === 'expense' }"><input v-model="form.type" type="radio" value="expense" />Gasto</label>
            <label :class="{ 'is-selected': form.type === 'income' }"><input v-model="form.type" type="radio" value="income" />Ingreso</label>
            <label :class="{ 'is-selected': form.type === 'transfer' }"><input v-model="form.type" type="radio" value="transfer" />Transferencia</label>
          </fieldset>
          <label key="description">Descripción<input v-model="form.description" maxlength="120" placeholder="¿De qué es este movimiento?" required /></label>
          <label key="amount" class="movement-form__amount">Monto<span class="movement-form__money"><input v-model="form.amount" type="number" min="0.01" step="0.01" max="9999999999.99" placeholder="0.00" inputmode="decimal" required /><span>{{ accountCurrency }}</span></span></label>
          <div key="accounts" class="movement-form__row">
            <label>Cuenta<FinanceSelect aria-label="Cuenta" v-model="form.accountId" required><option v-for="account in accounts" :key="account.id" :value="account.id">{{ account.name }} · {{ account.currency }}</option></FinanceSelect></label>
            <label>Categoría<FinanceSelect aria-label="Categoría" v-model="form.category"><option value="">Sin categoría</option><option v-for="category in categories" :key="category.id" :value="category.id">{{ category.name }}</option></FinanceSelect></label>
          </div>
          <label v-if="form.type === 'transfer'" key="destination">Cuenta de destino<FinanceSelect aria-label="Cuenta de destino" v-model="form.destinationId" required><option value="" disabled>Selecciona una cuenta</option><option v-for="account in accounts.filter(a => a.id !== form.accountId)" :key="account.id" :value="account.id">{{ account.name }} · {{ account.currency }}</option></FinanceSelect></label>
          <label v-if="form.type === 'transfer' && form.destinationId && destinationCurrency !== accountCurrency" key="received">Importe recibido · {{ destinationCurrency }}<input v-model="form.destinationAmount" type="number" step="0.01" min="0.01" required inputmode="decimal" /></label>
          <div key="date" class="movement-form__row"><label>Fecha<input v-model="form.date" type="date" required /></label><label>Hora<input v-model="form.time" type="time" /></label></div>
          <button v-if="!showNote" key="note-toggle" class="movement-form__add-note" type="button" @click="showNote = true">+ Agregar nota</button>
          <label v-else key="note">Nota<textarea v-model="form.note" maxlength="1000" placeholder="Algo que quieras recordar" rows="2" /></label>
          <p v-if="formError" key="error" class="movement-form__error" role="alert">{{ formError }}</p>
          <footer key="actions" class="finance-fields__footer"><button v-if="editing" class="finance-delete" type="button" @click="remove">Eliminar</button><button class="movement-form__cancel" type="button" @click="close">Cancelar</button><button class="movement-form__save" type="submit">{{ editing ? 'Guardar cambios' : 'Crear movimiento' }}</button></footer>
        </TransitionGroup>
      </div>
    </dialog>
  </Teleport>
</template>
