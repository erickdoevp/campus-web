/**
 * GET /comprar/{course_id} — target of the "Comprar" button. A plain link, so
 * the page never deals with tokens or CSRF: anonymous visitors go through the
 * LMS login and come back here; then the CMS starts the Stripe checkout and we
 * redirect to it, or straight into the course if it's already theirs.
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id', { decode: true })!
  const config = useRuntimeConfig()
  const loginUrl = `${config.public.lmsUrl}/login?next=${encodeURIComponent(getRequestURL(event).href)}`

  // Without the LMS JWT cmsRequest answers 401 itself.
  const response = await cmsRequest(event, '/api/v1/checkout/', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ course_id: id }),
  }).catch(() => null)
  const data = await response?.json().catch(() => ({})) ?? {}

  if (response?.ok && data.checkout_url) {
    return sendRedirect(event, data.checkout_url)
  }
  if (response?.status === 401) {
    return sendRedirect(event, loginUrl)
  }
  if (data.code === 'already_owned') {
    return sendRedirect(event, `${config.public.learningMfeUrl}/course/${encodeURIComponent(id)}/home`)
  }
  // Not for sale anymore, or Stripe/CMS down: back to the course page, which explains it.
  return sendRedirect(event, `/cursos/${encodeURIComponent(id)}?payment=unavailable`)
})
