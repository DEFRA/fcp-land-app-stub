import { getAccessToken, clearCachedToken } from './get-cognito-token.js'
import { config } from '../config/config.js'
import { createLogger } from '../common/helpers/logging/logger.js'
import { describeFetchError } from './describe-fetch-error.js'

const logger = createLogger()

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
  // Only booleans are logged for credentials, never the tokens themselves
  const requestContext = {
    endpoint,
    hasUserToken: Boolean(userToken),
    hasAccessToken: Boolean(accessToken),
    isRetry: !retryOnAuthFailure
  }

  logger.info(requestContext, `Sending request to the external API at ${endpoint}`)

  const startedAt = Date.now()
  let response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: document, variables }),
      signal: AbortSignal.timeout(config.get('externalApi.timeout'))
    })
  } catch (error) {
    const failedAfterMs = Date.now() - startedAt
    logger.error({ ...requestContext, durationMs: failedAfterMs, err: error }, `External API request to ${endpoint} failed after ${failedAfterMs}ms: ${describeFetchError(error)}`)
    throw new Error(`External API request to ${endpoint} failed: ${describeFetchError(error)}`, { cause: error })
  }

  const durationMs = Date.now() - startedAt
  logger.info({ ...requestContext, status: response.status, durationMs }, `External API responded with ${response.status} in ${durationMs}ms`)

  if ((response.status === HTTP_STATUS_UNAUTHORIZED || response.status === HTTP_STATUS_FORBIDDEN) && accessToken && retryOnAuthFailure) {
    // Covers the CDP client secret rotation window: if the cached token is rejected,
    // drop it and retry once with a freshly requested one
    logger.warn({ ...requestContext, status: response.status }, 'External API rejected the access token, clearing the cached token and retrying once')
    clearCachedToken()
    return sendRequest(document, variables, userToken, false)
  }

  if (!response.ok) {
    const errorBody = await response.text()
    logger.error({ ...requestContext, status: response.status, durationMs }, `External API request failed: ${response.status} ${errorBody}`)
    throw new Error(`External API request failed: ${response.status} ${errorBody}`)
  }

  const body = await response.json()

  if (body.errors?.length) {
    const [error] = body.errors
    logger.error({ ...requestContext, status: response.status, durationMs, errorCount: body.errors.length }, `External API returned an error: ${error.message} (${error.extensions?.code})`)
    throw new Error(`External API returned an error: ${error.message} (${error.extensions?.code})`)
  }

  return body.data
}

export { query }
