/** The staff user in the admin area; loaded by the `admin` route middleware. */
export function useAdminUser() {
  return useState<AdminUser | null>('admin-user', () => null)
}

/**
 * Whether the logged-in user is Open edX staff, read from the JWT cookie the
 * LMS sets. Only decides whether to show the admin link: the admin API
 * checks for real.
 */
export function useEdxStaff() {
  const user = useEdxUser()
  const token = useCookie('edx-jwt-cookie-header-payload', { decode: v => v, readonly: true })
  return computed(() => !!user.value && !!token.value && !!decodeJwtClaims(token.value)?.administrator)
}
