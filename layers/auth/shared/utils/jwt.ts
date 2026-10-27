export interface EdxJwtClaims {
  preferred_username: string
  email: string
  name?: string
  /** Django `is_staff`. */
  administrator?: boolean
  exp: number
}

/**
 * Reads the claims of an LMS JWT ("header.payload[.signature]") WITHOUT
 * verifying it. Only for UI decisions: Studio and the LMS verify the token on
 * every API call.
 */
export function decodeJwtClaims(token: string): EdxJwtClaims | null {
  try {
    const payload = token.split('.')[1]!.replace(/-/g, '+').replace(/_/g, '/')
    const bytes = Uint8Array.from(atob(payload), c => c.charCodeAt(0))
    return JSON.parse(new TextDecoder().decode(bytes))
  }
  catch {
    return null
  }
}
