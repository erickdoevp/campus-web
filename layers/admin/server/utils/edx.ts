/**
 * Server-side access to Studio and the LMS as the logged-in staff user.
 *
 * The LMS issues a JWT at login and splits it into two cookies on the shared
 * domain. We join them into the Authorization header, so the browser never
 * talks to the Open edX APIs directly, and Open edX checks the signature and
 * the user's permissions on every call.
 */
import type { H3Event } from 'h3'
import { FetchError } from 'ofetch'

export const JWT_HEADER_PAYLOAD_COOKIE = 'edx-jwt-cookie-header-payload'
export const JWT_SIGNATURE_COOKIE = 'edx-jwt-cookie-signature'

export function edxJwt(event: H3Event): string | null {
  const headerPayload = getCookie(event, JWT_HEADER_PAYLOAD_COOKIE)
  const signature = getCookie(event, JWT_SIGNATURE_COOKIE)
  return headerPayload && signature ? `${headerPayload}.${signature}` : null
}

/**
 * The staff user making the request, or a 401/403. The claims are not
 * verified here: that is enough to fail early, because everything that
 * matters goes through Studio or the LMS, which do verify them.
 */
export function requireStaff(event: H3Event) {
  const jwt = edxJwt(event)
  const claims = jwt ? decodeJwtClaims(jwt) : null
  if (!jwt || !claims || claims.exp * 1000 < Date.now()) {
    throw createError({ statusCode: 401, statusMessage: 'Tu sesión expiró. Vuelve a iniciar sesión.' })
  }
  if (!claims.administrator) {
    throw createError({ statusCode: 403, statusMessage: 'Esta sección es solo para administradores.' })
  }
  // The JWT travels in cookies: refuse writes posted from other sites on the
  // shared cookie domain.
  if (event.method !== 'GET' && event.method !== 'HEAD' && getRequestHeader(event, 'origin') !== getRequestURL(event).origin) {
    throw createError({ statusCode: 403, statusMessage: 'Origen no permitido' })
  }
  return { jwt, claims }
}

export function studioUrl(path: string) {
  return `${useRuntimeConfig().openedxStudioUrl.replace(/\/$/, '')}${path}`
}

export function lmsApiUrl(path: string) {
  return `${useRuntimeConfig().openedxLmsUrl.replace(/\/$/, '')}${path}`
}

interface EdxFetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: Record<string, unknown> | FormData
  headers?: Record<string, string>
}

/** Calls Studio or the LMS as the user and turns their errors into ours. */
export async function edxFetch<T>(event: H3Event, url: string, options: EdxFetchOptions = {}): Promise<T> {
  const { jwt } = requireStaff(event)
  try {
    // External URL: Nitro's route typing doesn't apply.
    return await $fetch(url, {
      method: options.method,
      body: options.body,
      headers: { accept: 'application/json', authorization: `JWT ${jwt}`, ...options.headers },
    }) as T
  }
  catch (error) {
    throw edxError(error)
  }
}

function edxError(error: unknown) {
  if (!(error instanceof FetchError) || !error.statusCode) {
    return createError({ statusCode: 502, statusMessage: 'Open edX no respondió. Revisa que la plataforma esté encendida.' })
  }
  switch (error.statusCode) {
    case 401:
      return createError({ statusCode: 401, statusMessage: 'Tu sesión expiró. Vuelve a iniciar sesión.' })
    case 403:
      return createError({ statusCode: 403, statusMessage: 'Tu usuario no tiene permiso para esto en Open edX.' })
    case 404:
      return createError({ statusCode: 404, statusMessage: 'No se encontró en Open edX.' })
  }
  if (error.statusCode < 500) {
    const detail = errorDetail(error.data)
    return createError({
      statusCode: 400,
      statusMessage: 'Datos rechazados',
      message: detail ? `Open edX rechazó los datos: ${detail}` : 'Open edX rechazó los datos.',
    })
  }
  return createError({ statusCode: 502, statusMessage: 'Open edX tuvo un error. Intenta de nuevo.' })
}

/** DRF answers {detail}, {developer_message}, {error} or {field: [messages]}. */
function errorDetail(data: unknown): string {
  if (!data || typeof data !== 'object') return ''
  const record = data as Record<string, unknown>
  for (const key of ['developer_message', 'detail', 'error', 'message']) {
    if (typeof record[key] === 'string') return record[key]
  }
  return Object.entries(record)
    .map(([field, value]) => `${field}: ${Array.isArray(value) ? value.join(' ') : String(value)}`)
    .join('; ')
}

/** The `[id]` route param, validated as a course key. */
export function courseIdParam(event: H3Event) {
  const id = getRouterParam(event, 'id', { decode: true }) ?? ''
  if (!/^course-v1:[^/\s]+\+[^/\s]+\+[^/\s]+$/.test(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Curso inválido' })
  }
  return id
}

/** A block route param, validated as a usage key inside the course. */
export function blockIdParam(event: H3Event, courseId: string, name: string) {
  const id = getRouterParam(event, name, { decode: true }) ?? ''
  if (!isBlockOf(courseId, id)) {
    throw createError({ statusCode: 400, statusMessage: 'Elemento inválido' })
  }
  return id
}

export function isBlockOf(courseId: string, blockId: string) {
  return blockId.startsWith(`block-v1:${courseId.slice('course-v1:'.length)}+type@`) && !/[/\s]/.test(blockId)
}

export function courseRootId(courseId: string) {
  return `block-v1:${courseId.slice('course-v1:'.length)}+type@course+block@course`
}

/** Path segment for a course or usage key in a Studio URL. */
export function edxKey(id: string) {
  return encodeURIComponent(id)
}
