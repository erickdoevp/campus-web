export const PRODUCT_STATUS: Record<ProductStatus, { label: string, hint: string }> = {
  draft: { label: 'Borrador', hint: 'Solo existe en el CMS.' },
  created: { label: 'Creado', hint: 'Existe en Open edX; los autores ya pueden armar el contenido. No está a la venta.' },
  on_sale: { label: 'A la venta', hint: 'Se puede comprar en Campus.' },
  archived: { label: 'Archivado', hint: 'Ya no se vende. Quienes lo compraron conservan el acceso.' },
}

/** ISO date from the CMS → value for <input type="datetime-local"> (browser time zone). */
export function toLocalInput(iso: string | null) {
  if (!iso) return ''
  const date = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function fromLocalInput(value: string) {
  return value ? new Date(value).toISOString() : null
}

export function formatDate(iso: string | null) {
  if (!iso) return ''
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
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
