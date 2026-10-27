<script setup>
import { nextTick, reactive, ref } from 'vue'
import { useFinanceStore } from '../../composables/useFinanceStore'
import FinanceDialog from './FinanceDialog.vue'
import FinanceHeader from './FinanceHeader.vue'
const { categories, saveCategory, deleteCategory } = useFinanceStore()
const editor = ref(null)
const editing = ref(null)
const error = ref('')
const draft = reactive({ name: '', description: '', symbol: '✳' })
async function edit(category, event) {
  editing.value = category?.id || null
  Object.assign(draft, { name: '', description: '', symbol: '✳', ...category })
  error.value = ''; await nextTick(); editor.value.open(event.currentTarget)
}
async function save() {
  try { await saveCategory(draft, editing.value); editor.value.close() }
  catch (cause) { error.value = cause.message }
}
async function remove() {
  if (!confirm('¿Eliminar esta categoría? Los movimientos se conservarán sin categoría.')) return
  try { await deleteCategory(editing.value); editor.value.close() }
  catch (cause) { error.value = cause.message }
}
</script>
<template>
  <section>
    <FinanceHeader title="Categorías"><button class="finance-add-button" type="button" aria-label="Crear categoría" @click="edit(null, $event)">+</button></FinanceHeader>
    <div class="finance-collection">
      <button v-for="category in categories" :key="category.id" class="finance-tile" type="button" @click="edit(category, $event)"><span class="finance-tile__symbol" aria-hidden="true">{{ category.symbol }}</span><span>{{ category.name }}</span></button>
      <button class="finance-tile finance-tile--add" type="button" aria-label="Añadir categoría" @click="edit(null, $event)">+</button>
    </div>
    <FinanceDialog ref="editor" :title="editing ? 'Editar categoría' : 'Crear categoría'">
      <form class="finance-fields" data-no-drag @submit.prevent="save">
        <label>Nombre<input v-model="draft.name" required maxlength="40" /></label>
        <label>Descripción<textarea v-model="draft.description" maxlength="400" /></label>
        <label>Icono<input v-model="draft.symbol" maxlength="12" /></label>
        <p v-if="error" class="finance-form-error" role="alert">{{ error }}</p>
        <footer class="finance-fields__footer"><button v-if="editing" class="finance-delete" type="button" @click="remove">Eliminar</button><button type="button" @click="editor.close()">Cancelar</button><button type="submit">{{ editing ? 'Guardar' : 'Crear' }}</button></footer>
      </form>
    </FinanceDialog>
  </section>
</template>
