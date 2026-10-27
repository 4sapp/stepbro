<script setup>
import EmptyStateDots from '../EmptyStateDots.vue'
import FinanceSelect from '../FinanceSelect.vue'
import { nextTick, reactive, ref } from 'vue'
import { useFinanceStore, frequencies, localDate, money, categoryFor } from '../../composables/useFinanceStore'
import FinanceDialog from './FinanceDialog.vue'
import FinanceHeader from './FinanceHeader.vue'
import './FinanceIntentions.css'
const { intentions, accounts, categories, activeCurrency, saveIntention, deleteIntention, toggleIntention } = useFinanceStore()
const editor = ref(null)
const editing = ref(null)
const error = ref('')
const draft = reactive({})
async function edit(item, event) {
  editing.value = item?.id || null
  Object.assign(draft, { name: '', frequency: 'monthly', amount: '', note: '', category: '', accountId: '', destinationId: '', date: localDate(), paused: false, ...item })
  if (item) draft.amount = String(item.amount / 100)
  error.value = ''; await nextTick(); editor.value.open(event.currentTarget)
}
async function save() {
  try { await saveIntention(draft, editing.value); editor.value.close() }
  catch (cause) { error.value = cause.message }
}
async function remove() {
  if (confirm('¿Eliminar esta intención?')) {
    try { await deleteIntention(editing.value); editor.value.close() }
    catch (cause) { error.value = cause.message }
  }
}
async function toggle(item) {
  try { await toggleIntention(item.id) }
  catch (cause) { error.value = cause.message }
}
const frequencyName = id => frequencies.find(f => f.id === id)?.label
const dateLabel = date => new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: '2-digit' }).format(new Date(`${date}T12:00:00`))
</script>
<template>
  <section>
    <FinanceHeader title="Intenciones"><button class="finance-add-button" type="button" aria-label="Crear intención" @click="edit(null, $event)">+</button></FinanceHeader>
    <div v-if="!intentions.length" class="finance-empty finance-intentions__empty"><EmptyStateDots /><p>No tienes intenciones todavía</p></div>
    <div v-else class="finance-intentions">
      <article v-for="item in intentions" :key="item.id" class="finance-intention" :class="{ 'finance-intention--paused': item.paused }">
        <button class="finance-intention__main" type="button" @click="edit(item, $event)"><span class="finance-intention__symbol" aria-hidden="true">{{ categoryFor(item.category).symbol }}</span><span><strong>{{ item.name }}</strong><small>{{ frequencyName(item.frequency) }} · {{ dateLabel(item.date) }}</small></span><span class="finance-intention__amount">{{ money(item.amount, item.currency || activeCurrency) }}</span></button>
        <p v-if="item.note">{{ item.note }}</p><footer><span>{{ item.paused ? 'En pausa' : 'Planificado · No afecta el saldo' }}</span><button type="button" @click="toggle(item)">{{ item.paused ? 'Reanudar' : 'Pausar' }}</button></footer>
      </article>
    </div>
    <FinanceDialog ref="editor" :title="editing ? 'Editar intención' : 'Crear intención'">
      <form class="finance-fields" data-no-drag @submit.prevent="save">
        <label>Nombre<input v-model="draft.name" maxlength="120" required /></label>
        <label>Frecuencia<FinanceSelect aria-label="Frecuencia" v-model="draft.frequency"><option v-for="f in frequencies" :key="f.id" :value="f.id">{{ f.label }}</option></FinanceSelect></label>
        <label>Monto esperado<input v-model="draft.amount" type="number" min="0.01" step="0.01" required inputmode="decimal" /></label>
        <label>Nota<input v-model="draft.note" maxlength="1000" /></label>
        <label>Categoría<FinanceSelect aria-label="Categoría" v-model="draft.category"><option value="">Sin categoría</option><option v-for="c in categories" :key="c.id" :value="c.id">{{ c.symbol }} {{ c.name }}</option></FinanceSelect></label>
        <div class="finance-fields__row"><label>Cuenta<FinanceSelect aria-label="Cuenta" v-model="draft.accountId"><option value="">Sin cuenta</option><option v-for="a in accounts" :key="a.id" :value="a.id">{{ a.name }} · {{ a.currency }}</option></FinanceSelect></label><label>Cuenta de destino<FinanceSelect aria-label="Cuenta de destino" v-model="draft.destinationId"><option value="">Sin cuenta</option><option v-for="a in accounts.filter(a => a.id !== draft.accountId)" :key="a.id" :value="a.id">{{ a.name }}</option></FinanceSelect></label></div>
        <label>Fecha prevista<input v-model="draft.date" type="date" required /></label>
        <p v-if="error" class="finance-form-error" role="alert">{{ error }}</p>
        <footer class="finance-fields__footer"><button v-if="editing" class="finance-delete" type="button" @click="remove">Eliminar</button><button type="button" @click="editor.close()">Cancelar</button><button type="submit">{{ editing ? 'Guardar' : 'Crear' }}</button></footer>
      </form>
    </FinanceDialog>
  </section>
</template>
