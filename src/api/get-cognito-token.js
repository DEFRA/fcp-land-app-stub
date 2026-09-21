import { createLogger } from '../common/helpers/logging/logger.js'
import { config } from '../config/config.js'

const logger = createLogger()

// Cached in memory for the lifetime of the process so calls don't hit Cognito on
// every request. Refreshed a few minutes before the token actually expires to avoid
// a request failing mid-flight because the token expired between check and use.
const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000
let cachedToken = null
let tokenExpiry = null

// If several requests arrive while there is no valid cached token, they share one
// in-flight request instead of each firing its own POST to Cognito.
let inFlightRequest = null

// Real services would call this before every request to the API gateway.
// Local development runs with COGNITO_ENABLED=false, so no machine-to-machine
// authentication happens and no Authorization header is sent to the external API.
async function getAccessToken () {
  if (!config.get('cognito.enabled')) {
    return null
  }

  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry - TOKEN_EXPIRY_BUFFER_MS) {
    return cachedToken
  }

  if (!inFlightRequest) {
    inFlightRequest = requestAccessToken().finally(() => {
      inFlightRequest = null
    })
  }

  return inFlightRequest
}

async function requestAccessToken () {
  const domain = config.get('cognito.domain')
  const clientId = config.get('cognito.clientId')
  const clientSecret = config.get('cognito.clientSecret')
  const scope = config.get('cognito.scope')

  if (!domain || !clientId || !clientSecret) {
    throw new Error('COGNITO_DOMAIN, COGNITO_CLIENT_ID and COGNITO_CLIENT_SECRET are required when COGNITO_ENABLED=true')
  }

  // CDP issues one login URL per API, in the form https://<service>-<suffix>.auth.<region>.amazoncognito.com
  const tokenUrl = `https://${domain}/oauth2/token`
  const body = scope ? `grant_type=client_credentials&scope=${scope}` : 'grant_type=client_credentials'
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  logger.info({ tokenUrl }, 'Requesting Cognito access token')

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`
    },
    body
  })

  if (!response.ok) {
    // Safe to log: this is Cognito's response, never the request we sent, so the
    // client secret is never in it
    const errorBody = await response.text()
    logger.error({ status: response.status, tokenUrl, errorBody }, 'Failed to get Cognito access token')
    throw new Error(`Cognito authentication failed: ${response.status}`)
  }

  const { access_token: accessToken, expires_in: expiresIn } = await response.json()

  cachedToken = accessToken
  tokenExpiry = Date.now() + (expiresIn * 1000)

  return cachedToken
}

// Used when a cached token is rejected by the API gateway (eg the CDP platform team
// has rotated the client secret) so the next call requests a fresh one
function clearCachedToken () {
  cachedToken = null
  tokenExpiry = null
}

export { getAccessToken, clearCachedToken }
