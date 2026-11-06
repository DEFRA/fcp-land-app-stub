import Yar from '@hapi/yar'
import { config } from '../config/config.js'

// Yar is a session management plugin for hapi.js
// maxCookieSize: 0 keeps the data in Redis, so the cookie only holds an identifier
// Yar is used to store temporary session data not dependent on the user's authentication status
// such as state values used to prevent CSRF attacks and redirect URLs
// Cookie set to Lax so it is sent on the top-level redirects back from Defra Identity
export const session = {
  plugin: Yar,
  options: {
    storeBlank: false,
    maxCookieSize: 0,
    cache: {
      cache: config.get('cache.name'),
      segment: `${config.get('cache.segment')}-temp`
    },
    cookieOptions: {
      password: config.get('cookie.password'),
      isSecure: config.get('isProduction'),
      isSameSite: 'Lax'
    }
  }
}
