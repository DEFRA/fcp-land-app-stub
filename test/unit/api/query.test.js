const mockGetAccessToken = vi.fn()
const mockClearCachedToken = vi.fn()
vi.mock('../../../src/api/get-cognito-token.js', () => ({
  getAccessToken: mockGetAccessToken,
  clearCachedToken: mockClearCachedToken
}))

const mockConfigGet = vi.fn()
vi.mock('../../../src/config/config.js', () => ({
  config: { get: mockConfigGet }
}))

const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
vi.mock('../../../src/common/helpers/logging/logger.js', () => ({
  createLogger: () => mockLogger
}))

const { query } = await import('../../../src/api/query.js')

const configValues = {
  'externalApi.endpoint': 'https://external-api.example.com/graphql',
  'externalApi.timeout': 10000
}

const mockFetch = vi.fn()

const okResponse = (body) => ({ ok: true, json: async () => body })

beforeEach(() => {
  mockLogger.info.mockClear()
  mockLogger.warn.mockClear()
  mockLogger.error.mockClear()
  global.fetch = mockFetch
  mockConfigGet.mockImplementation((key) => configValues[key])
  mockGetAccessToken.mockResolvedValue(null)
})

describe('query', () => {
  test('should post to the configured external api endpoint', async () => {
    mockFetch.mockResolvedValue(okResponse({ data: { business: null } }))

    await query('query { business }', { sbi: '123456789' })

    const [url] = mockFetch.mock.calls[0]
    expect(url).toBe('https://external-api.example.com/graphql')
  })

  test('should send the query document and variables as the request body', async () => {
    mockFetch.mockResolvedValue(okResponse({ data: {} }))

    await query('query { business }', { sbi: '123456789' })

    const [, options] = mockFetch.mock.calls[0]
    expect(JSON.parse(options.body)).toEqual({ query: 'query { business }', variables: { sbi: '123456789' } })
  })

  test('should send a json content type', async () => {
    mockFetch.mockResolvedValue(okResponse({ data: {} }))

    await query('query { business }', {})

    const [, options] = mockFetch.mock.calls[0]
    expect(options.headers['Content-Type']).toBe('application/json')
  })

  test('should forward the user token as x-forwarded-authorization with no Bearer prefix', async () => {
    mockFetch.mockResolvedValue(okResponse({ data: {} }))

    await query('query { business }', {}, { userToken: 'a-defra-id-jwt' })

    const [, options] = mockFetch.mock.calls[0]
    expect(options.headers['x-forwarded-authorization']).toBe('a-defra-id-jwt')
  })

  test('should not send an authorization header when Cognito is disabled', async () => {
    mockFetch.mockResolvedValue(okResponse({ data: {} }))

    await query('query { business }', {})

    const [, options] = mockFetch.mock.calls[0]
    expect(options.headers.Authorization).toBeUndefined()
  })

  test('should send a bearer token when Cognito is enabled', async () => {
    mockGetAccessToken.mockResolvedValue('a-cognito-token')
    mockFetch.mockResolvedValue(okResponse({ data: {} }))

    await query('query { business }', {})

    const [, options] = mockFetch.mock.calls[0]
    expect(options.headers.Authorization).toBe('Bearer a-cognito-token')
  })

  test('should return the data property of the response', async () => {
    const data = { business: { sbi: '123456789' } }
    mockFetch.mockResolvedValue(okResponse({ data }))

    const result = await query('query { business }', {})

    expect(result).toBe(data)
  })

  test('should throw when the response is not ok', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500, text: async () => 'Internal Server Error' })
    await expect(query('query { business }', {})).rejects.toThrow()
  })

  test('should throw when the graphql response contains errors', async () => {
    mockFetch.mockResolvedValue(okResponse({
      errors: [{ message: 'Bad SBI', extensions: { code: 'BAD_USER_INPUT' } }]
    }))

    await expect(query('query { business }', {})).rejects.toThrow('Bad SBI')
  })

  test('should clear the cached token and retry once on a 401', async () => {
    mockGetAccessToken.mockResolvedValue('a-cognito-token')
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 401, text: async () => 'Unauthorized' })
      .mockResolvedValueOnce(okResponse({ data: { business: null } }))

    const result = await query('query { business }', {})

    expect(mockClearCachedToken).toHaveBeenCalled()
    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(result).toEqual({ business: null })
  })

  test('should not retry a 401 more than once', async () => {
    mockGetAccessToken.mockResolvedValue('a-cognito-token')
    mockFetch.mockResolvedValue({ ok: false, status: 401, text: async () => 'Unauthorized' })

    await expect(query('query { business }', {})).rejects.toThrow()

    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  test('should include the underlying cause when the connection fails', async () => {
    const cause = Object.assign(new Error('connect ECONNREFUSED 10.0.0.1:443'), { code: 'ECONNREFUSED' })
    const fetchError = new TypeError('fetch failed', { cause })
    mockFetch.mockRejectedValue(fetchError)

    const error = await query('query { business }', {}).catch((e) => e)

    expect(error.message).toBe('External API request to https://external-api.example.com/graphql failed: fetch failed (ECONNREFUSED connect ECONNREFUSED 10.0.0.1:443)')
    expect(error.cause).toBe(fetchError)
  })

  test('should describe a timeout when the error has no cause', async () => {
    mockFetch.mockRejectedValue(new DOMException('The operation was aborted due to timeout', 'TimeoutError'))

    await expect(query('query { business }', {})).rejects.toThrow('failed: TimeoutError: The operation was aborted due to timeout')
  })

  test('should log the request and response status without logging credentials or variables', async () => {
    mockGetAccessToken.mockResolvedValue('a-cognito-token')
    mockFetch.mockResolvedValue({ ...okResponse({ data: {} }), status: 200 })

    await query('query { business }', { sbi: '123456789' }, { userToken: 'a-defra-id-jwt' })

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: 'https://external-api.example.com/graphql', hasUserToken: true, hasAccessToken: true, isRetry: false }),
      expect.stringContaining('Sending request')
    )
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({ status: 200, durationMs: expect.any(Number) }),
      expect.stringContaining('responded with 200')
    )
    const logged = JSON.stringify([...mockLogger.info.mock.calls, ...mockLogger.warn.mock.calls, ...mockLogger.error.mock.calls])
    expect(logged).not.toContain('a-cognito-token')
    expect(logged).not.toContain('a-defra-id-jwt')
    expect(logged).not.toContain('123456789')
  })

  test('should log the underlying cause when the connection fails', async () => {
    const cause = Object.assign(new Error('connect ECONNREFUSED 10.0.0.1:443'), { code: 'ECONNREFUSED' })
    const fetchError = new TypeError('fetch failed', { cause })
    mockFetch.mockRejectedValue(fetchError)

    await expect(query('query { business }', {})).rejects.toThrow()

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: fetchError, endpoint: 'https://external-api.example.com/graphql', durationMs: expect.any(Number) }),
      expect.stringContaining('ECONNREFUSED connect ECONNREFUSED 10.0.0.1:443')
    )
  })

  test('should log a non-ok response with its status and body', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 502, text: async () => 'Bad Gateway' })

    await expect(query('query { business }', {})).rejects.toThrow()

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({ status: 502 }),
      'External API request failed: 502 Bad Gateway'
    )
  })

  test('should log graphql errors', async () => {
    mockFetch.mockResolvedValue(okResponse({ errors: [{ message: 'Bad SBI', extensions: { code: 'BAD_USER_INPUT' } }] }))

    await expect(query('query { business }', {})).rejects.toThrow()

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({ errorCount: 1 }),
      'External API returned an error: Bad SBI (BAD_USER_INPUT)'
    )
  })

  test('should log a warning and mark the second request as a retry when the token is rejected', async () => {
    mockGetAccessToken.mockResolvedValue('a-cognito-token')
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 401, text: async () => 'Unauthorized' })
      .mockResolvedValueOnce(okResponse({ data: {} }))

    await query('query { business }', {})

    expect(mockLogger.warn).toHaveBeenCalledWith(expect.objectContaining({ status: 401 }), expect.stringContaining('retrying once'))
    expect(mockLogger.info).toHaveBeenCalledWith(expect.objectContaining({ isRetry: true }), expect.any(String))
  })
})
