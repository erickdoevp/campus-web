export interface EdxUser {
  username: string
  email: string
  header_urls: { logout: string, account_settings: string, learner_profile: string }
  user_image_urls: { small: string, medium: string }
}

/**
 * Django writes `edx-user-info` as a quoted string with commas escaped as
 * \054 and quotes as \", e.g. "{\"version\": 1\054 \"username\": ...}".
 */
function parseEdxUserInfo(raw: string): EdxUser | null {
  try {
    let value = raw
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
    value = value.replace(/\\054/g, ',').replace(/\\"/g, '"').replace(/\\\\/g, '\\')
    return JSON.parse(value)
  }
  catch {
    return null
  }
}

/**
 * The logged-in Open edX user, read from the cookies the LMS sets on the
 * parent domain. Works during SSR too, since the browser sends them to us.
 */
export function useEdxUser() {
  const loggedIn = useCookie('edxloggedin', { decode: v => v, readonly: true })
  const info = useCookie<EdxUser | null>('edx-user-info', { decode: parseEdxUserInfo, readonly: true })
  return computed(() => (loggedIn.value === 'true' ? info.value : null))
}
