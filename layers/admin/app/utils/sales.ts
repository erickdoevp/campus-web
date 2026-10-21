export const ORDER_STATUS: Record<OrderStatus, string> = {
  pending: 'Pendiente',
  paid: 'Pagada',
  failed: 'Fallida',
  refunded: 'Reembolsada',
}

export const ORDER_ACCESS: Record<OrderAccess, string> = {
  none: 'Sin acceso',
  granted: 'Con acceso',
  revoked: 'Acceso retirado',
  error: 'Error en Open edX',
}

/** "1234.50" → "$1,234.50" (centavos only when there are some). */
export function money(amount: string | number | null) {
  return amount == null ? '—' : formatPrice(Number(amount), 'mxn')
}

/** Axis ticks: $0, $500, $1.5K, $12K. */
export function compactMoney(amount: number) {
  const abs = Math.abs(amount)
  const sign = amount < 0 ? '-' : ''
  if (abs < 1000) return `${sign}$${abs}`
  return `${sign}$${Number((abs / 1000).toFixed(abs < 10_000 ? 1 : 0))}K`
}

/** Change vs the previous period, in %; null when there's nothing to compare with. */
export function percentChange(current: string | number, previous: string | number) {
  const now = Number(current)
  const before = Number(previous)
  if (!before) return null
  return ((now - before) / Math.abs(before)) * 100
}

const ZONE = 'America/Mexico_City'

/** Today in Mexico City as YYYY-MM-DD, like the CMS counts days. */
export function todayInMexico() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONE }).format(new Date())
}

export function addDays(day: string, days: number) {
  const date = new Date(`${day}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/** "2026-10-05" → "5 oct", or "5 oct 2026" with the year. */
export function shortDay(day: string, withYear = false) {
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: 'UTC', day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}),
  }).format(new Date(`${day}T12:00:00Z`)).replace('.', '')
}
