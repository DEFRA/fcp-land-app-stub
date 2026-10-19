import { getAccessToken, clearCachedToken } from './get-cognito-token.js'
import { config } from '../config/config.js'

const HTTP_STATUS_UNAUTHORIZED = 401
const HTTP_STATUS_FORBIDDEN = 403

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

  const endpoint = config.get('externalApi.endpoint')

  let response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: document, variables }),
      signal: AbortSignal.timeout(config.get('externalApi.timeout'))
    })
  } catch (error) {
    throw new Error(`External API request to ${endpoint} failed: ${describeFetchError(error)}`, { cause: error })
  }

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

// fetch reports connectivity problems as a generic "fetch failed" TypeError, with the real
// reason (ECONNREFUSED, ENOTFOUND, certificate errors...) on error.cause, which ECS log
// formatting does not output. Timeouts surface as a TimeoutError with no cause.
function describeFetchError (error) {
  const cause = error.cause
  const detail = [cause?.code, cause?.message].filter(Boolean).join(' ')

  return detail ? `${error.message} (${detail})` : `${error.name}: ${error.message}`
}

export { query }
