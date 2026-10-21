/** The CMS view of the logged-in user, shared by the admin middleware and layout. */
export function useCmsMe() {
  return useState<CmsMe | null>('cms-me', () => null)
}

/** Loads it once per visit; null when not logged in. Not cached while null, so a login is seen. */
export async function fetchCmsMe() {
  const me = useCmsMe()
  if (me.value) return me.value
  try {
    me.value = await useRequestFetch()<CmsMe>('/api/admin/me')
  }
  catch {
    me.value = null
  }
  return me.value
}
