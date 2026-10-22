/**
 * Admin pages are for Open edX staff. Anonymous users go to the LMS login and
 * come back here; logged-in users without staff get a 403 page. The admin API
 * and Open edX check again on every call.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const user = useAdminUser()
  if (user.value) return
  try {
    user.value = await useRequestFetch()<AdminUser>('/api/admin/me')
  }
  catch (error) {
    if ((error as { statusCode?: number }).statusCode === 403) {
      return abortNavigation(createError({ statusCode: 403, statusMessage: 'Esta sección es solo para administradores.', fatal: true }))
    }
    const back = new URL(to.fullPath, useRequestURL().origin).href
    return navigateTo(`${useRuntimeConfig().public.lmsUrl}/login?next=${encodeURIComponent(back)}`, { external: true })
  }
})
