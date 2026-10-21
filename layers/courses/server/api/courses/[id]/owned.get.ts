/**
 * Whether the logged-in user already has access to the course: an active
 * verified enrollment, which the CMS creates after a payment. Not cached: the
 * answer is per user, so we forward the browser's LMS session cookie to the
 * LMS enrollment API.
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id', { decode: true })!
  const cookie = getRequestHeader(event, 'cookie')
  if (!cookie) return { owned: false }
  const lms = useRuntimeConfig().openedxLmsUrl.replace(/\/$/, '')
  try {
    const enrollment = await $fetch<{ mode: string, is_active: boolean } | null>(
      `${lms}/api/enrollment/v1/enrollment/${encodeURIComponent(id)}`,
      { headers: { cookie } },
    )
    return { owned: !!enrollment?.is_active && enrollment.mode === 'verified' }
  }
  catch {
    return { owned: false }
  }
})
