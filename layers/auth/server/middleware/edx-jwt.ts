/**
 * Keeps the LMS JWT fresh where the site calls the CMS as the user: the admin
 * area and the purchase route.
 *
 * The JWT cookies expire after an hour while the LMS session lives on. When
 * they're gone but the session isn't, ask the LMS for new ones
 * (POST /login_refresh, authenticated by the session cookie), send them to the
 * browser and use them for the rest of this request, including the API calls
 * the page makes while rendering on the server.
 */
import { JWT_HEADER_PAYLOAD_COOKIE, JWT_SIGNATURE_COOKIE, edxJwt } from '../utils/cms'

const JWT_PATHS = ['/admin', '/api/admin', '/comprar/']

export default defineEventHandler(async (event) => {
  const path = event.path
  if (!JWT_PATHS.some(prefix => path.startsWith(prefix))) return
  if (edxJwt(event) || getCookie(event, 'edxloggedin') !== 'true') return

  const cookie = getRequestHeader(event, 'cookie') ?? ''
  const lms = useRuntimeConfig().openedxLmsUrl.replace(/\/$/, '')
  let response: Response
  try {
    response = await fetch(`${lms}/login_refresh`, { method: 'POST', headers: { cookie } })
  }
  catch {
    return // the CMS call will answer 401 and the page sends the user to log in
  }
  if (!response.ok) return

  const refreshed: string[] = []
  for (const setCookie of response.headers.getSetCookie()) {
    const [pair] = setCookie.split(';')
    const name = pair!.slice(0, pair!.indexOf('='))
    if (name === JWT_HEADER_PAYLOAD_COOKIE || name === JWT_SIGNATURE_COOKIE) {
      appendResponseHeader(event, 'set-cookie', setCookie)
      refreshed.push(pair!)
    }
  }
  if (refreshed.length) {
    // Visible to getCookie() and to requests forwarded from this one.
    event.node.req.headers.cookie = [cookie, ...refreshed].filter(Boolean).join('; ')
  }
})
