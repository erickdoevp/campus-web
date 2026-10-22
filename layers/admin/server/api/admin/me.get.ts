/** The staff user, with the JWT checked by the LMS, so the admin pages don't trust forged cookies. */
export default defineEventHandler(async (event): Promise<AdminUser> => {
  const { claims } = requireStaff(event)
  const me = await edxFetch<{ username: string }>(event, lmsApiUrl('/api/user/v1/me'))
  if (me.username !== claims.preferred_username) {
    throw createError({ statusCode: 401, statusMessage: 'Tu sesión expiró. Vuelve a iniciar sesión.' })
  }
  return { username: claims.preferred_username, email: claims.email, name: claims.name ?? '' }
})
