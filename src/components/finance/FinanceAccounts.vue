<script setup>
import FinanceSelect from '../FinanceSelect.vue'
import { nextTick, reactive, ref } from 'vue'
import { useFinanceStore, money, currencies, accountTypes } from '../../composables/useFinanceStore'
import FinanceDialog from './FinanceDialog.vue'
import FinanceHeader from './FinanceHeader.vue'
const { accounts, activeCurrency, saveAccount, deleteAccount } = useFinanceStore()
const editor = ref(null)
const editing = ref(null)
const error = ref('')
const draft = reactive({ name: '', type: 'cash', currency: 'USD', opening: '0' })
async function edit(account, event) {
  editing.value = account?.id || null
  Object.assign(draft, { name: account?.name || '', type: account?.type || 'cash', currency: account?.currency || activeCurrency.value, opening: String((account?.opening || 0) / 100) })
  error.value = ''; await nextTick(); editor.value.open(event.currentTarget)
}
function save() {
  try { saveAccount(draft, editing.value); editor.value.close() }
  catch (cause) { error.value = cause.message }
}
function remove() {
  if (!confirm('¿Eliminar esta cuenta?')) return
  try { deleteAccount(editing.value); editor.value.close() }
  catch (cause) { error.value = cause.message }
}
</script>
<template>
  <section>
    <FinanceHeader title="Cuentas"><button class="finance-add-button" type="button" aria-label="Crear cuenta" @click="edit(null, $event)">+</button></FinanceHeader>
    <div class="finance-collection">
      <button v-for="account in accounts" :key="account.id" class="finance-tile" type="button" @click="edit(account, $event)"><span class="finance-tile__symbol" aria-hidden="true">{{ account.symbol }}</span><span>{{ account.name }}</span><small>{{ money(account.balance, account.currency) }} {{ account.currency }}</small></button>
      <button class="finance-tile finance-tile--add" type="button" aria-label="Añadir cuenta" @click="edit(null, $event)">+</button>
    </div>
    <FinanceDialog ref="editor" :title="editing ? 'Editar cuenta' : 'Crear cuenta'">
      <form class="finance-fields" data-no-drag @submit.prevent="save">
        <label>Nombre<input v-model="draft.name" required maxlength="40" /></label>
        <label>Tipo<FinanceSelect aria-label="Tipo" v-model="draft.type"><option v-for="type in accountTypes" :key="type.id" :value="type.id">{{ type.label }}</option></FinanceSelect></label>
        <label>Moneda<FinanceSelect aria-label="Moneda" v-model="draft.currency"><option v-for="currency in currencies" :key="currency">{{ currency }}</option></FinanceSelect></label>
        <label>Saldo inicial<input v-model="draft.opening" type="number" min="0" step="0.01" required inputmode="decimal" /></label>
        <p v-if="error" class="finance-form-error" role="alert">{{ error }}</p>
        <footer class="finance-fields__footer"><button v-if="editing" class="finance-delete" type="button" @click="remove">Eliminar</button><button type="button" @click="editor.close()">Cancelar</button><button type="submit">{{ editing ? 'Guardar' : 'Crear' }}</button></footer>
      </form>
    </FinanceDialog>
  </section>
</template>
