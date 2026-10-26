// Importes en centavos: las sumas no acumulan errores de coma flotante.
export function toCents(value) {
  const normalized = String(value).trim().replace(',', '.')
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) throw new Error('Escribe un importe con hasta dos decimales.')
  const cents = Math.round(Number(normalized) * 100)
  if (!Number.isSafeInteger(cents) || cents > 999999999999) throw new Error('El importe es demasiado grande.')
  return cents
}

export function accountBalance(account, transactions) {
  return transactions.reduce((total, item) => {
    if (item.type === 'transfer') {
      if (item.accountId === account.id) return total - item.amount
      if (item.destinationId === account.id) return total + (item.destinationAmount ?? item.amount)
      return total
    }
    return item.accountId === account.id ? total + (item.type === 'income' ? item.amount : -item.amount) : total
  }, account.opening)
}
