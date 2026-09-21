import { getAccessToken, clearCachedToken } from './get-cognito-token.js'
import { config } from '../config/config.js'

const HTTP_STATUS_UNAUTHORIZED = 401
const HTTP_STATUS_FORBIDDEN = 403

// A single reusable GraphQL client for every call this app makes to the FCP third
// party external API. Only a permissions query exists today, but read and write
// queries added in future work all go through this same function.
async function query (document, variables, { userToken } = {}) {
  return sendRequest(document, variables, userToken, true)
}

async function sendRequest (document, variables, userToken, retryOnAuthFailure) {
  const headers = {
    // Apollo's csrfPrevention rejects requests that look like a simple cross-site
    // form post; a JSON content type is enough to satisfy it
    'Content-Type': 'application/json'
  }

  if (userToken) {
    // Identifies the end user to the DAL. Sent as the raw Defra Identity JWT with NO
    // "Bearer " prefix: the DAL decodes this header directly, unlike Authorization below
    headers['x-forwarded-authorization'] = userToken
  }

  const accessToken = await getAccessToken()
  if (accessToken) {
    // Identifies this service to the API gateway. Only sent when COGNITO_ENABLED=true
    headers.Authorization = `Bearer ${accessToken}`
  }

  const response = await fetch(config.get('externalApi.endpoint'), {
    method: 'POST',
    headers,
    body: JSON.stringify({ query: document, variables }),
    // setupProxy() has already set a global undici dispatcher, so no proxy agent
    // needs to be passed to fetch here
    signal: AbortSignal.timeout(config.get('externalApi.timeout'))
  })

  if ((response.status === HTTP_STATUS_UNAUTHORIZED || response.status === HTTP_STATUS_FORBIDDEN) && accessToken && retryOnAuthFailure) {
    // Covers the CDP client secret rotation window: if the cached token is rejected,
    // drop it and retry once with a freshly requested one
    clearCachedToken()
    return sendRequest(document, variables, userToken, false)
  }

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`External API request failed: ${response.status} ${errorBody}`)
  }

  const body = await response.json()

  if (body.errors?.length) {
    const [error] = body.errors
    throw new Error(`External API returned an error: ${error.message} (${error.extensions?.code})`)
  }

  return body.data
}

export { query }
