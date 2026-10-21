/**
 * /api/admin/* → CMS /api/v1/*, as the logged-in user. Only the CMS routes the
 * admin uses are forwarded; status codes and error bodies pass through as-is.
 */
const ALLOWED = /^(me|products(\/\d+(\/(image|create-course|put-on-sale|withdraw|archive))?)?)$/

export default defineEventHandler(async (event) => {
  const path = getRouterParam(event, 'path') ?? ''
  if (!ALLOWED.test(path)) {
    throw createError({ statusCode: 404, statusMessage: 'No encontrado' })
  }

  const method = event.method
  if (method !== 'GET' && method !== 'HEAD') {
    // The LMS cookies are SameSite=Lax already; this also refuses forms
    // posted from other sites on the shared domain.
    const origin = getRequestHeader(event, 'origin')
    if (origin !== getRequestURL(event).origin) {
      throw createError({ statusCode: 403, statusMessage: 'Origen no permitido' })
    }
  }

  const query = getRequestURL(event).search
  const contentType = getRequestHeader(event, 'content-type')
  const response = await cmsRequest(event, `/api/v1/${path}/${query}`, {
    method,
    headers: contentType ? { 'content-type': contentType } : undefined,
    // Raw bytes, so multipart image uploads keep their boundary.
    body: method === 'GET' || method === 'HEAD' ? undefined : await readRawBody(event, false),
  })

  setResponseStatus(event, response.status)
  if (response.status === 204) return null
  const text = await response.text()
  try {
    return JSON.parse(text)
  }
  catch {
    // Not JSON (e.g. the CMS is down and a proxy answered): don't leak HTML.
    return { detail: response.ok ? text : 'El CMS no respondió correctamente. Intenta de nuevo.' }
  }
})
