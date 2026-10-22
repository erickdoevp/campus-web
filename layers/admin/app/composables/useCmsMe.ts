/** The CMS view of the logged-in user, shared by the admin middleware and layout. */
export function useCmsMe() {
  return useState<CmsMe | null>('cms-me', () => null)
}

/**
 * Loads it once per visit; null when not logged in. Not cached while null, so
 * a login is seen. Any other failure (CMS down...) throws: it must not be
 * mistaken for "not logged in", or the login would send the user straight back
 * here and round and round.
 */
export async function fetchCmsMe() {
  const me = useCmsMe()
  if (me.value) return me.value
  try {
    me.value = await useRequestFetch()<CmsMe>('/api/admin/me')
  }
  catch (error) {
    if ((error as { statusCode?: number }).statusCode !== 401) throw error
    me.value = null
  }
  return me.value
}
