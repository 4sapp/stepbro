<script setup>
import './BalanceSummary.css'

// Cambia aquí el importe. Más adelante puede venir de los movimientos.
const balance = 3200

const formattedBalance = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
}).format(balance)
</script>

<template>
  <dl class="balance-summary">
    <dt class="balance-summary__label">Total</dt>
    <dd class="balance-summary__amount">{{ formattedBalance }}</dd>
  </dl>
</template>
