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
  <dl class="balance-summary">
    <PrettyBackground />
<div class="balance-summary__top"><dt class="balance-summary__label">total</dt><dd><FinanceSelect v-if="availableCurrencies.length > 1" v-model="activeCurrency" class="finance-currency" aria-label="Moneda del resumen"><option v-for="currency in availableCurrencies" :key="currency">{{ currency }}</option></FinanceSelect><span v-else class="balance-summary__code">{{ activeCurrency }}</span></dd></div>
    <dd class="balance-summary__amount">{{ money(balance, activeCurrency) }}</dd>
  </dl>
</template>
