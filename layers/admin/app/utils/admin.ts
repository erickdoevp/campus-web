export function adminCoursePath(id: string) {
  return `/admin/cursos/${encodeURIComponent(id)}`
}

/** URL of the admin API for a course, e.g. adminCourseApi(id, '/price'). */
export function adminCourseApi(id: string, path = '') {
  return `/api/admin/courses/${encodeURIComponent(id)}${path}`
}

/** Human message of an error from our API ($fetch, useFetch or uploadVideo). */
export function apiErrorMessage(error: unknown, fallback = 'Algo salió mal. Intenta de nuevo.') {
  const data = (error as { data?: { message?: string, statusMessage?: string } } | null)?.data
  return data?.message || data?.statusMessage || fallback
}

const TIME_ZONE = 'America/Mexico_City'

/** ISO date-time → "YYYY-MM-DD" in Mexico City, for <input type="date">. */
export function toDateInput(iso: string | null) {
  if (!iso) return ''
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso))
}

/** "YYYY-MM-DD" → midnight in Mexico City, which has been UTC-6 all year since 2022. */
export function fromDateInput(date: string) {
  return date ? `${date}T00:00:00-06:00` : null
}

/** Suggested course number from its name: "Excel avanzado" → "EXCEL-AVANZADO". */
export function courseNumberFrom(name: string) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24)
    .replace(/-+$/, '')
    .toUpperCase()
}

export function formatBytes(bytes: number) {
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value.toLocaleString('es-MX', { maximumFractionDigits: unit ? 1 : 0 })} ${units[unit]}`
}

/**
 * PUTs a video file to the admin API. Uses XMLHttpRequest because fetch can't
 * report upload progress. Errors look like $fetch's ({ data }), so
 * apiErrorMessage() reads both.
 */
export function uploadVideo(url: string, file: File, onProgress: (fraction: number) => void, signal: AbortSignal) {
  return new Promise<AdminVideo>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.setRequestHeader('content-type', file.type)
    xhr.responseType = 'json'
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total)
    }
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve(xhr.response) : reject({ data: xhr.response }))
    xhr.onerror = () => reject({ data: { message: 'Se perdió la conexión durante la subida.' } })
    xhr.onabort = () => reject(new DOMException('Subida cancelada', 'AbortError'))
    signal.addEventListener('abort', () => xhr.abort())
    xhr.send(file)
  })
}
