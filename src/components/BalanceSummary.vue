<script setup>
import PrettyBackground from './PrettyBackground.vue'
import FinanceSelect from './FinanceSelect.vue'
import { computed } from 'vue'
import { useFinanceStore, money } from '../composables/useFinanceStore'
import './BalanceSummary.css'
const { balance, accounts, activeCurrency } = useFinanceStore()
const availableCurrencies = computed(() => [...new Set(accounts.value.map(a => a.currency))])
</script>

<template>
  <div class="balance-summary-wrap">
    <div class="balance-summary__trial" aria-label="7 días de prueba">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
      <span>7 días de prueba</span>
    </div>
    <dl class="balance-summary">
      <PrettyBackground />
      <div class="balance-summary__top"><dt class="balance-summary__label">total</dt><dd><FinanceSelect v-if="availableCurrencies.length > 1" v-model="activeCurrency" class="finance-currency" aria-label="Moneda del resumen"><option v-for="currency in availableCurrencies" :key="currency">{{ currency }}</option></FinanceSelect><span v-else class="balance-summary__code">{{ activeCurrency }}</span></dd></div>
      <dd class="balance-summary__amount">{{ money(balance, activeCurrency) }}</dd>
    </dl>
  </div>
</template>
