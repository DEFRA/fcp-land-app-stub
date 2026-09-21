const mockConfigGet = vi.fn()
vi.mock('../../../src/config/config.js', () => ({
  config: { get: mockConfigGet }
}))

const mockLoggerInfo = vi.fn()
const mockLoggerError = vi.fn()
vi.mock('../../../src/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({ info: mockLoggerInfo, error: mockLoggerError })
}))

const { getAccessToken, clearCachedToken } = await import('../../../src/api/get-cognito-token.js')

const configValues = {
  'cognito.enabled': true,
  'cognito.domain': 'land-app-c63f2.auth.eu-west-2.amazoncognito.com',
  'cognito.clientId': 'mock-client-id',
  'cognito.clientSecret': 'mock-client-secret',
  'cognito.scope': null
}

const mockFetch = vi.fn()

const okResponse = (body, overrides = {}) => ({
  ok: true,
  json: async () => body,
  ...overrides
})

beforeEach(() => {
  global.fetch = mockFetch
  mockConfigGet.mockImplementation((key) => configValues[key])
  clearCachedToken()
})

describe('getAccessToken', () => {
  test('should return null and not call fetch when Cognito is disabled', async () => {
    mockConfigGet.mockImplementation((key) => key === 'cognito.enabled' ? false : configValues[key])

    const token = await getAccessToken()

    expect(token).toBeNull()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  test('should throw when the domain is missing', async () => {
    mockConfigGet.mockImplementation((key) => key === 'cognito.domain' ? null : configValues[key])
    await expect(getAccessToken()).rejects.toThrow()
  })

  test('should throw when the client id is missing', async () => {
    mockConfigGet.mockImplementation((key) => key === 'cognito.clientId' ? null : configValues[key])
    await expect(getAccessToken()).rejects.toThrow()
  })

  test('should throw when the client secret is missing', async () => {
    mockConfigGet.mockImplementation((key) => key === 'cognito.clientSecret' ? null : configValues[key])
    await expect(getAccessToken()).rejects.toThrow()
  })

  test('should request a token from the Cognito token endpoint', async () => {
    mockFetch.mockResolvedValue(okResponse({ access_token: 'a-token', expires_in: 3600 }))

    await getAccessToken()

    const [url] = mockFetch.mock.calls[0]
    expect(url).toBe('https://land-app-c63f2.auth.eu-west-2.amazoncognito.com/oauth2/token')
  })

  test('should send the client credentials as a Basic auth header', async () => {
    mockFetch.mockResolvedValue(okResponse({ access_token: 'a-token', expires_in: 3600 }))

    await getAccessToken()

    const [, options] = mockFetch.mock.calls[0]
    const decoded = Buffer.from(options.headers.Authorization.replace('Basic ', ''), 'base64').toString()
    expect(decoded).toBe('mock-client-id:mock-client-secret')
  })

  test('should send a client credentials grant with no scope by default', async () => {
    mockFetch.mockResolvedValue(okResponse({ access_token: 'a-token', expires_in: 3600 }))

    await getAccessToken()

    const [, options] = mockFetch.mock.calls[0]
    expect(options.body).toBe('grant_type=client_credentials')
  })

  test('should append the scope when configured', async () => {
    mockConfigGet.mockImplementation((key) => key === 'cognito.scope' ? 'land-app-resource-srv/access' : configValues[key])
    mockFetch.mockResolvedValue(okResponse({ access_token: 'a-token', expires_in: 3600 }))

    await getAccessToken()

    const [, options] = mockFetch.mock.calls[0]
    expect(options.body).toBe('grant_type=client_credentials&scope=land-app-resource-srv/access')
  })

  test('should return the access token', async () => {
    mockFetch.mockResolvedValue(okResponse({ access_token: 'a-token', expires_in: 3600 }))

    const token = await getAccessToken()

    expect(token).toBe('a-token')
  })

  test('should cache the token and not call fetch again while it is still valid', async () => {
    mockFetch.mockResolvedValue(okResponse({ access_token: 'a-token', expires_in: 3600 }))

    await getAccessToken()
    await getAccessToken()

    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  test('should request a new token once the cached one is within the expiry buffer', async () => {
    mockFetch.mockResolvedValue(okResponse({ access_token: 'a-token', expires_in: 60 }))

    await getAccessToken()
    await getAccessToken()

    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  test('should share one request between concurrent callers with no cached token', async () => {
    let resolveFetch
    mockFetch.mockReturnValue(new Promise((resolve) => { resolveFetch = resolve }))

    const first = getAccessToken()
    const second = getAccessToken()
    resolveFetch(okResponse({ access_token: 'a-token', expires_in: 3600 }))
    await Promise.all([first, second])

    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  test('should throw when the token request fails', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401, text: async () => 'invalid_client' })
    await expect(getAccessToken()).rejects.toThrow()
  })

  test('should request a fresh token after clearCachedToken is called', async () => {
    mockFetch.mockResolvedValue(okResponse({ access_token: 'a-token', expires_in: 3600 }))

    await getAccessToken()
    clearCachedToken()
    await getAccessToken()

    expect(mockFetch).toHaveBeenCalledTimes(2)
  })
})
