/** Validation for admin request bodies; each helper answers 400 on bad input. */

export function readTitle(value: unknown, fallback?: string) {
  const title = typeof value === 'string' ? value.trim() : ''
  if (!title && fallback) return fallback
  if (!title || title.length > 255) {
    throw createError({ statusCode: 400, statusMessage: 'Escribe un nombre de hasta 255 caracteres.' })
  }
  return title
}

export function readText(value: unknown, maxLength: number) {
  if (typeof value !== 'string' || value.length > maxLength) {
    throw createError({ statusCode: 400, statusMessage: `El texto debe tener hasta ${maxLength} caracteres.` })
  }
  return value.trim()
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

/** Whole currency units; null or 0 means not for sale. */
export function readPrice(value: unknown): number | null {
  if (value == null || value === '' || value === 0) return null
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 1_000_000) {
    throw createError({ statusCode: 400, statusMessage: 'El precio debe ser un número entero de pesos.' })
  }
  return value
}
