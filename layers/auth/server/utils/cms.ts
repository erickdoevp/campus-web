/**
 * Server-side access to the Campus CMS, as the logged-in user.
 *
 * The CMS trusts the JWT the LMS issues at login, which the LMS splits into
 * two cookies on the shared domain. We join them into the Authorization
 * header, so the browser never talks to the CMS API directly.
 */
import type { H3Event } from 'h3'

export const JWT_HEADER_PAYLOAD_COOKIE = 'edx-jwt-cookie-header-payload'
export const JWT_SIGNATURE_COOKIE = 'edx-jwt-cookie-signature'

export function edxJwt(event: H3Event): string | null {
  const headerPayload = getCookie(event, JWT_HEADER_PAYLOAD_COOKIE)
  const signature = getCookie(event, JWT_SIGNATURE_COOKIE)
  return headerPayload && signature ? `${headerPayload}.${signature}` : null
}

export function cmsUrl(path: string) {
  return `${useRuntimeConfig().campusCmsUrl.replace(/\/$/, '')}${path}`
}

const TIMEOUT_MS = 15_000

/**
 * Calls the CMS with the user's JWT and returns the raw response, so callers
 * can pass status and body through. Without a JWT it answers 401 itself; if
 * the CMS is down or doesn't answer in time, 503 (never a hang or a throw).
 */
export async function cmsRequest(event: H3Event, path: string, init: RequestInit = {}): Promise<Response> {
  const jwt = edxJwt(event)
  if (!jwt) {
    return Response.json({ detail: 'No has iniciado sesión.' }, { status: 401 })
  }
  const headers = new Headers(init.headers)
  headers.set('authorization', `JWT ${jwt}`)
  headers.set('accept', 'application/json')
  try {
    return await fetch(cmsUrl(path), { ...init, headers, signal: AbortSignal.timeout(TIMEOUT_MS) })
  }
  catch (error) {
    console.error(`[cms] ${init.method ?? 'GET'} ${path} failed:`, error)
    return Response.json({ detail: 'El CMS no responde. Intenta de nuevo en unos minutos.' }, { status: 503 })
  }
}
