/**
 * Admin pages are for contadores only. Anonymous users go to the LMS login and
 * come back here; logged-in users without the role get a 403 page.
 * The CMS checks the role again on every API call.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const me = await fetchCmsMe()
  if (!me) {
    const back = new URL(to.fullPath, useRequestURL().origin).href
    return navigateTo(`${useRuntimeConfig().public.lmsUrl}/login?next=${encodeURIComponent(back)}`, { external: true })
  }
  if (!me.is_contador) {
    return abortNavigation(createError({ statusCode: 403, statusMessage: 'Esta sección es solo para contadores.', fatal: true }))
  }
})
