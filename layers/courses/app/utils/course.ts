export function formatPrice(price: number | null, currency: string | null) {
  if (price == null || !currency) return ''
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(price)
}

export function coursePath(id: string) {
  return `/cursos/${encodeURIComponent(id)}`
}
