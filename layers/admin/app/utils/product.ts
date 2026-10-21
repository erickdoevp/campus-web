export const PRODUCT_STATUS: Record<ProductStatus, { label: string, hint: string }> = {
  draft: { label: 'Borrador', hint: 'Solo existe en el CMS.' },
  created: { label: 'Creado', hint: 'Existe en Open edX; los autores ya pueden armar el contenido. No está a la venta.' },
  on_sale: { label: 'A la venta', hint: 'Se puede comprar en Campus.' },
  archived: { label: 'Archivado', hint: 'Ya no se vende. Quienes lo compraron conservan el acceso.' },
}

// Course dates are entered and shown in Mexico City time, wherever the page
// renders (server or browser), like the rest of the site (see events' formatDate).
const TIME_ZONE = 'America/Mexico_City'

/** Offset of TIME_ZONE at that instant, in minutes (e.g. -360). */
function zoneOffset(date: Date) {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, timeZoneName: 'longOffset' })
    .formatToParts(date).find(part => part.type === 'timeZoneName')!.value // "GMT-06:00", or "GMT"
  const match = name.match(/([+-])(\d{2}):(\d{2})/)
  return match ? (match[1] === '-' ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3])) : 0
}

/** ISO date from the CMS → value for <input type="datetime-local">. */
export function toLocalInput(iso: string | null) {
  if (!iso) return ''
  const date = new Date(iso)
  return new Date(date.getTime() + zoneOffset(date) * 60_000).toISOString().slice(0, 16)
}

/** Value of <input type="datetime-local"> → ISO date for the CMS. */
export function fromLocalInput(value: string) {
  if (!value) return null
  const asUtc = new Date(`${value}:00Z`)
  return new Date(asUtc.getTime() - zoneOffset(asUtc) * 60_000).toISOString()
}

/** Same as formatDate() (events layer), with the time. */
export function formatDateTime(iso: string) {
  return formatDate(iso, { dateStyle: 'medium', timeStyle: 'short' })
}

export interface CmsErrors {
  /** Message per form field. */
  fields: Record<string, string>
  /** Message not tied to a field. */
  general: string
}

/**
 * Turns an error from /api/admin into messages. The CMS answers DRF errors:
 * {field: [msg]}, {detail: msg} or [msg].
 */
export function cmsErrors(error: unknown): CmsErrors {
  const data = (error as { data?: unknown })?.data
  const first = (value: unknown) => (Array.isArray(value) ? String(value[0]) : String(value))
  if (Array.isArray(data)) return { fields: {}, general: first(data) }
  if (data && typeof data === 'object') {
    const { detail, non_field_errors: nonField, ...fields } = data as Record<string, unknown>
    return {
      fields: Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, first(value)])),
      general: detail ? String(detail) : nonField ? first(nonField) : '',
    }
  }
  return { fields: {}, general: 'No se pudo completar. Revisa tu conexión e intenta de nuevo.' }
}

export function uploadProductImage(id: number, file: File) {
  const body = new FormData()
  body.append('image', file)
  return $fetch<Product>(`/api/admin/products/${id}/image`, { method: 'POST', body })
}
