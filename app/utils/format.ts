export function formatPrice(price: number | null, currency: string | null) {
  if (price == null || !currency) return ''
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(price)
}

// Nuxt Content stores datetimes in UTC without a zone ("2026-11-13 00:00:00").
const CONTENT_DATETIME = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/

export function parseDate(value: string) {
  return new Date(CONTENT_DATETIME.test(value) ? `${value.replace(' ', 'T')}Z` : value)
}

/** "Now" in the same format Nuxt Content stores dates, for where() filters. */
export function contentNow() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ')
}

export function formatDate(value: string, options: Intl.DateTimeFormatOptions = { dateStyle: 'long' }) {
  return new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Mexico_City', ...options }).format(parseDate(value))
}

export function coursePath(id: string) {
  return `/cursos/${encodeURIComponent(id)}`
}
