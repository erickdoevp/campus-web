/**
 * Whether the logged-in user already owns the course. Not cached: the answer
 * is per user, so we forward the browser's LMS session cookie to the LMS.
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id', { decode: true })!
  const cookie = getRequestHeader(event, 'cookie')
  if (!cookie) return { owned: false }
  const lms = useRuntimeConfig().openedxLmsUrl.replace(/\/$/, '')
  try {
    const data = await $fetch<{ owned: boolean | null }>(
      `${lms}/payments/api/v1/courses/${encodeURIComponent(id)}/`,
      { headers: { cookie } },
    )
    return { owned: data.owned === true }
  }
  catch {
    return { owned: false }
  }
})
