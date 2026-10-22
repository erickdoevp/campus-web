/**
 * Keeps the LMS JWT fresh for the admin area.
 *
 * The JWT cookies expire after an hour while the LMS session lives on. When
 * they're gone but the session isn't, ask the LMS for new ones
 * (POST /login_refresh, authenticated by the session cookie), send them to the
 * browser and use them for the rest of this request, including the API calls
 * the page makes while rendering on the server.
 */
export default defineEventHandler(async (event) => {
  const path = event.path
  if (!path.startsWith('/admin') && !path.startsWith('/api/admin')) return
  if (getCookie(event, 'edxloggedin') !== 'true') return
  const jwt = edxJwt(event)
  const claims = jwt ? decodeJwtClaims(jwt) : null
  // Refresh early: a video upload must outlive the token it started with.
  if (claims && claims.exp * 1000 > Date.now() + 15 * 60_000) return

  const cookie = getRequestHeader(event, 'cookie') ?? ''
  let response: Response
  try {
    response = await fetch(lmsApiUrl('/login_refresh'), { method: 'POST', headers: { cookie } })
  }
  catch {
    return // the API call answers 401 and the page sends the user to log in
  }
  if (!response.ok) return

  const refreshed = new Map<string, string>()
  for (const setCookie of response.headers.getSetCookie()) {
    const [pair] = setCookie.split(';')
    const name = pair!.slice(0, pair!.indexOf('='))
    if (name === JWT_HEADER_PAYLOAD_COOKIE || name === JWT_SIGNATURE_COOKIE) {
      appendResponseHeader(event, 'set-cookie', setCookie)
      refreshed.set(name, pair!)
    }
  }
  if (refreshed.size) {
    // Visible to getCookie() and to requests forwarded from this one.
    const kept = cookie.split(/;\s*/).filter(c => c && !refreshed.has(c.slice(0, c.indexOf('='))))
    event.node.req.headers.cookie = [...kept, ...refreshed.values()].join('; ')
  }
})
