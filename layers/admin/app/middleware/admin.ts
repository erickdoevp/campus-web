/**
 * Admin pages are for contadores only. Anonymous users go to the LMS login and
 * come back here; logged-in users without the role get a 403 page.
 * The CMS checks the role again on every API call.
 */
const BACK_FROM_LOGIN = 'desde_login'

export default defineNuxtRouteMiddleware(async (to) => {
  let me: CmsMe | null
  try {
    me = await fetchCmsMe()
  }
  catch {
    return abortNavigation(createError({
      statusCode: 503,
      statusMessage: 'La administración no está disponible en este momento. Intenta de nuevo en unos minutos.',
      fatal: true,
    }))
  }
  if (!me) {
    // Back from the LMS login and still no session (e.g. the LMS can't renew
    // its JWT): explain instead of sending the user to log in again forever.
    if (to.query[BACK_FROM_LOGIN]) {
      return abortNavigation(createError({
        statusCode: 401,
        statusMessage: 'No pudimos confirmar tu sesión. Cierra sesión en Campus y vuelve a entrar.',
        fatal: true,
      }))
    }
    const back = new URL(to.fullPath, useRequestURL().origin)
    back.searchParams.set(BACK_FROM_LOGIN, '1')
    return navigateTo(`${useRuntimeConfig().public.lmsUrl}/login?next=${encodeURIComponent(back.href)}`, { external: true })
  }
  if (!me.is_contador) {
    return abortNavigation(createError({ statusCode: 403, statusMessage: 'Esta sección es solo para contadores.', fatal: true }))
  }
  if (to.query[BACK_FROM_LOGIN]) {
    const { [BACK_FROM_LOGIN]: _, ...query } = to.query
    return navigateTo({ path: to.path, query, hash: to.hash }, { replace: true })
  }
})
