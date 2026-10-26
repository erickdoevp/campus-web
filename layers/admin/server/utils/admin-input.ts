/** Validation for admin request bodies; each helper answers 400 on bad input. */

export function readTitle(value: unknown, fallback?: string) {
  const title = typeof value === 'string' ? value.trim() : ''
  if (!title && fallback) return fallback
  if (!title || title.length > 255) {
    throw createError({ statusCode: 400, statusMessage: 'Escribe un nombre de hasta 255 caracteres.' })
  }
  return title
}

/** ISO date-time, or null when empty. */
export function readDate(value: unknown): string | null {
  if (value == null || value === '') return null
  const date = typeof value === 'string' ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) {
    throw createError({ statusCode: 400, statusMessage: 'Fecha inválida' })
  }
  return date.toISOString()
}
