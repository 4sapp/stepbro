<script setup>
import EmptyStateDots from '../EmptyStateDots.vue'
import FinanceSelect from '../FinanceSelect.vue'
import { computed, nextTick, onBeforeUnmount, reactive, ref } from 'vue'
import { useFinanceStore, money, categoryFor, localDate } from '../../composables/useFinanceStore'
import FinanceDialog from './FinanceDialog.vue'
import FinanceHeader from './FinanceHeader.vue'
import MovementPanel from '../MovementPanel.vue'
import './FinanceLedger.css'
const props = defineProps({ compact: Boolean })
const emit = defineEmits(['view-all', 'edit'])
const { transactions, accounts, categories, activeCurrency } = useFinanceStore()
const filters = ref(null)
const movement = ref(null)
const searching = ref(false)
const searchInput = ref(null)
const mobileTools = ref(null)
const mobileQuery = matchMedia('(max-width: 40rem)')
const isMobile = ref(mobileQuery.matches)
const updateMobile = event => { isMobile.value = event.matches }
mobileQuery.addEventListener('change', updateMobile)
onBeforeUnmount(() => mobileQuery.removeEventListener('change', updateMobile))
async function toggleSearch() {
  searching.value = !searching.value
  if (isMobile.value) mobileTools.value?.removeAttribute('open')
  if (searching.value) { await nextTick(); searchInput.value?.focus() }
  else query.value = ''
}
function openFilters(event) { if (isMobile.value) mobileTools.value?.removeAttribute('open'); filters.value.open(event.currentTarget) }
const query = ref('')
const currentYear = new Date().getFullYear()
const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const filter = reactive({ type: '', account: '', category: '', month: '', year: String(currentYear) })
const years = computed(() => [...new Set([currentYear, ...transactions.value.map(t => Number(t.date.slice(0, 4))), ...Array.from({ length: 11 }, (_, i) => currentYear - i)])].sort((a, b) => b - a))
const periodStart = computed(() => filter.year ? `${filter.year}-${filter.month || '01'}-01` : '')
const periodEnd = computed(() => filter.year ? filter.month ? `${filter.year}-${filter.month}-${new Date(Number(filter.year), Number(filter.month), 0).getDate()}` : `${filter.year}-12-31` : '')
const availableCurrencies = computed(() => [...new Set([...accounts.value.map(a => a.currency), ...transactions.value.flatMap(t => [t.currency, t.destinationCurrency]).filter(Boolean)])])
const movementType = item => item.type === 'expense' ? 'Gasto' : item.type === 'income' ? 'Ingreso' : 'Transferencia'
const displayedAmount = item => item.type === 'transfer' && item.destinationCurrency === activeCurrency.value ? item.destinationAmount : item.amount
const accountName = id => accounts.value.find(a => a.id === id)?.name || 'Sin cuenta'
const dateLabel = value => new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: '2-digit' }).format(new Date(`${value}T12:00:00`))
const filtered = computed(() => transactions.value.filter(t => ((t.currency || 'USD') === activeCurrency.value || (t.type === 'transfer' && t.destinationCurrency === activeCurrency.value))
  && (!filter.type || t.type === filter.type) && (!filter.account || t.accountId === filter.account || t.destinationId === filter.account)
  && (!filter.category || t.category === filter.category) && (!filter.year || t.date.slice(0, 4) === filter.year) && (!filter.month || t.date.slice(5, 7) === filter.month)
  && (t.description || movementType(t)).toLocaleLowerCase().includes(query.value.trim().toLocaleLowerCase())))
const visible = computed(() => filtered.value.slice(0, props.compact ? 5 : undefined))
const income = computed(() => filtered.value.filter(t => t.type === 'income').reduce((n, t) => n + t.amount, 0))
const expense = computed(() => filtered.value.filter(t => t.type === 'expense').reduce((n, t) => n + t.amount, 0))
const daily = computed(() => {
  if (!filtered.value.length) return 0
  const dates = filtered.value.map(t => t.date).sort()
  const start = new Date(`${periodStart.value || dates[0]}T12:00:00`)
  const end = new Date(`${periodEnd.value || dates.at(-1)}T12:00:00`)
  const days = Math.max(1, Math.round((end - start) / 86400000) + 1)
  return Math.round(expense.value / days)
})
const hasFilters = computed(() => !!(filter.type || filter.account || filter.category || filter.month || filter.year !== String(currentYear)) || !!query.value)
function resetFilters() { Object.assign(filter, { type: '', account: '', category: '', month: '', year: String(currentYear) }); query.value = '' }
function edit(item, event) { if (props.compact) emit('edit', item, event); else movement.value.edit(item, event) }
function exportCsv() {
  const cell = value => {
    let text = String(value ?? '')
    if (typeof value !== 'number' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`
    return `"${text.replaceAll('"', '""')}"`
  }
  const rows = [['Fecha', 'Hora', 'Descripción', 'Tipo', 'Monto', 'Moneda', 'Cuenta', 'Destino', 'Categoría', 'Nota'], ...filtered.value.map(t => [t.date, t.time, t.description || movementType(t), t.type, (t.type === 'expense' ? -t.amount : t.amount) / 100, t.currency, accountName(t.accountId), t.destinationId ? accountName(t.destinationId) : '', categoryFor(t.category).name, t.note])]
  const url = URL.createObjectURL(new Blob(['\uFEFF', rows.map(row => row.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a'); link.href = url; link.download = `movimientos-${localDate()}.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}
</script>
<template>
  <section class="finance-ledger" :class="{ 'finance-ledger--page': !compact }" aria-label="Movimientos">
    <FinanceHeader v-if="!compact" title="Movimientos" class="finance-ledger__page-header" :class="{ 'is-searching': searching }">
      <FinanceSelect v-if="availableCurrencies.length > 1" v-model="activeCurrency" class="finance-currency" aria-label="Moneda de movimientos"><option v-for="currency in availableCurrencies" :key="currency">{{ currency }}</option></FinanceSelect>
      <details ref="mobileTools" :open="!isMobile" class="finance-ledger__tools-menu">
        <summary class="finance-icon-button" aria-label="Herramientas de movimientos"><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg></summary>
        <div class="finance-ledger__tools">
          <button class="finance-icon-button" type="button" aria-label="Buscar movimientos" :aria-expanded="searching" aria-controls="movement-search" @click="toggleSearch"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg></button>
          <button class="finance-icon-button" type="button" aria-label="Exportar movimientos CSV" @click="exportCsv"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M5 16v5h14v-5"/></svg></button>
          <button class="finance-icon-button" type="button" aria-label="Filtros de movimientos" @click="openFilters"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M10 6h10M4 18h10"/><circle cx="6" cy="6" r="2"/><circle cx="18" cy="18" r="2"/></svg></button>
          <MovementPanel ref="movement" />
        </div>
      </details>
      <Transition name="ledger-search">
        <form v-if="searching" id="movement-search" class="finance-ledger__search-box" role="search" @submit.prevent @keydown.esc.prevent.stop="toggleSearch">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>
          <input ref="searchInput" v-model="query" type="search" placeholder="Busca un movimiento" aria-label="Buscar por descripción" />
          <button type="button" aria-label="Cerrar búsqueda" @click="toggleSearch">×</button>
        </form>
      </Transition>
    </FinanceHeader>
    <header v-else class="finance-ledger__header"><h2>Movimientos</h2><button class="finance-ledger__filters" type="button" @click="filters.open($event.currentTarget)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M10 6h10M4 18h10"/><circle cx="6" cy="6" r="2.2"/><circle cx="18" cy="18" r="2.2"/></svg> Filtros<span v-if="hasFilters" class="finance-ledger__filter-dot" /></button></header>
    <div v-if="!compact" class="finance-ledger__stats"><div><span>Ingresos</span><strong>{{ money(income, activeCurrency) }}</strong></div><div><span>Gastos</span><strong>{{ money(expense, activeCurrency) }}</strong></div><div><span>Prom diario</span><strong>{{ money(daily, activeCurrency) }}</strong></div><div><span>Total</span><strong>{{ money(income - expense, activeCurrency) }}</strong></div></div>
    <div v-if="hasFilters" class="finance-ledger__active"><span>Vista filtrada</span><button type="button" @click="resetFilters">Quitar filtros</button></div>
    <div class="finance-ledger__surface">
      <div v-if="!visible.length" class="finance-empty"><EmptyStateDots /><p>{{ transactions.length ? 'No hay movimientos con ese filtro' : 'No se encontraron movimientos' }}</p></div>
      <ol v-else class="finance-ledger__list">
        <li v-for="(item, index) in visible" :key="item.id">
          <time v-if="!index || visible[index - 1].date !== item.date" class="finance-ledger__date" :datetime="item.date">{{ dateLabel(item.date) }}</time>
          <button class="finance-ledger__row" type="button" @click="edit(item, $event)"><span class="finance-ledger__symbol" aria-hidden="true">{{ item.type === 'transfer' ? '↔' : categoryFor(item.category).symbol }}</span><span class="finance-ledger__detail"><span>{{ item.description || movementType(item) }}</span><small>{{ accountName(item.accountId) }}{{ item.type === 'transfer' ? ` → ${accountName(item.destinationId)}` : ` · ${categoryFor(item.category).name}` }}</small></span><span class="finance-ledger__value"><span :class="{ 'finance-ledger__expense': item.type === 'expense' }">{{ item.type === 'expense' ? '−' : item.type === 'income' ? '+' : '' }}{{ money(displayedAmount(item), activeCurrency) }}</span><small>{{ item.time }}</small></span></button>
        </li>
      </ol>
    </div>
    <button v-if="compact && filtered.length > 5" class="finance-ledger__more" type="button" @click="$emit('view-all')">Ver todos los movimientos ↗</button>
    <FinanceDialog ref="filters" title="Filtros" variant="filters">
      <form class="finance-fields finance-filter-fields" data-no-drag @submit.prevent="filters.close()">
        <label>Fecha<span class="finance-filter-fields__date">
          <FinanceSelect aria-label="Mes" v-model="filter.month"><option value="">Todos</option><option v-for="(month, i) in months" :key="month" :value="String(i + 1).padStart(2, '0')">{{ month }}</option></FinanceSelect>
          <FinanceSelect aria-label="Año" v-model="filter.year"><option v-for="year in years" :key="year" :value="String(year)">{{ year }}</option><option value="">Todos</option></FinanceSelect>
        </span></label>
        <label>Categoría<FinanceSelect aria-label="Categoría" v-model="filter.category"><option value="">Todas</option><option v-for="c in categories" :key="c.id" :value="c.id">{{ c.symbol }} {{ c.name }}</option></FinanceSelect></label>
        <label>Cuenta<FinanceSelect aria-label="Cuenta" v-model="filter.account"><option value="">Todas</option><option v-for="a in accounts" :key="a.id" :value="a.id">{{ a.symbol }} {{ a.name }}</option></FinanceSelect></label>
        <label>Tipo<FinanceSelect aria-label="Tipo" v-model="filter.type"><option value="">Todos</option><option value="income">Ingresos</option><option value="expense">Gastos</option></FinanceSelect></label>
      </form>
    </FinanceDialog>
  </section>
</template>
