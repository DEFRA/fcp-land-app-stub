import Jwt from '@hapi/jwt'

const mockRefreshTokens = vi.fn()
vi.mock('../../../src/auth/refresh-tokens.js', () => ({
  refreshTokens: mockRefreshTokens
}))

const mockGetOidcConfig = vi.fn()
vi.mock('../../../src/auth/get-oidc-config.js', () => ({
  getOidcConfig: mockGetOidcConfig
}))

const mockGetSafeRedirect = vi.fn()
vi.mock('../../../src/utils/get-safe-redirect.js', () => ({
  getSafeRedirect: mockGetSafeRedirect
}))

const mockConfigGet = vi.fn()
vi.mock('../../../src/config/config.js', () => ({
  config: { get: mockConfigGet }
}))

const mockOidcConfig = {
  authorization_endpoint: 'https://oidc.example.com/authorize',
  token_endpoint: 'https://oidc.example.com/token'
}

const { auth, getBellOptions, getCookieOptions } = await import('../../../src/plugins/auth.js')

const configValues = {
  'defraId.clientId': 'mockClientId',
  'defraId.clientSecret': 'mockClientSecret',
  'defraId.serviceId': 'mockServiceId',
  'defraId.policy': 'mockPolicy',
  'defraId.redirectUrl': 'https://example.com/auth/sign-in-oidc',
  'defraId.refreshTokens': true,
  'cookie.password': 'this-is-a-secret-that-must-be-at-least-32-characters',
  isProduction: false
}

beforeEach(() => {
  mockConfigGet.mockImplementation((key) => configValues[key])
  mockGetOidcConfig.mockResolvedValue(mockOidcConfig)
})

describe('auth plugin', () => {
  test('should register both strategies and default to session', async () => {
    const server = { auth: { strategy: vi.fn(), default: vi.fn() } }

    await auth.plugin.register(server)

    expect(server.auth.strategy).toHaveBeenCalledWith('defra-id', 'bell', expect.anything())
    expect(server.auth.strategy).toHaveBeenCalledWith('session', 'cookie', expect.anything())
    expect(server.auth.default).toHaveBeenCalledWith('session')
  })
})

describe('getBellOptions', () => {
  test('should use the endpoints from the oidc config', () => {
    const options = getBellOptions(mockOidcConfig)
    expect(options.provider.auth).toBe(mockOidcConfig.authorization_endpoint)
    expect(options.provider.token).toBe(mockOidcConfig.token_endpoint)
  })

  test('should request the openid, offline_access and client id scopes', () => {
    const options = getBellOptions(mockOidcConfig)
    expect(options.provider.scope).toEqual(['openid', 'offline_access', 'mockClientId'])
  })

  describe('profile', () => {
    test('should map token claims onto the credentials profile', () => {
      const token = Jwt.token.generate({
        contactId: '1234567890',
        currentRelationshipId: '1234567',
        firstName: 'Andrew',
        lastName: 'Farmer',
        relationships: ['1234567:107183280:Farms Ltd:1:External:0'],
        roles: ['1234567:Agent:3']
      }, { key: 'a-secret', algorithm: 'HS256' })

      const credentials = { token }
      getBellOptions(mockOidcConfig).provider.profile(credentials)

      expect(credentials.profile.crn).toBe('1234567890')
      expect(credentials.profile.organisationId).toBe('1234567')
      expect(credentials.profile.name).toBe('Andrew Farmer')
      expect(credentials.profile.firstName).toBe('Andrew')
      expect(credentials.profile.sbi).toBe('107183280')
      expect(credentials.profile.organisationName).toBe('Farms Ltd')
      expect(credentials.profile.role).toBe('Agent')
    })

    test('should not throw when relationships and roles are missing', () => {
      const token = Jwt.token.generate({
        contactId: '1234567890',
        currentRelationshipId: '1234567',
        firstName: 'Andrew',
        lastName: 'Farmer'
      }, { key: 'a-secret', algorithm: 'HS256' })

      const credentials = { token }
      getBellOptions(mockOidcConfig).provider.profile(credentials)

      expect(credentials.profile.sbi).toBeNull()
      expect(credentials.profile.organisationName).toBeNull()
      expect(credentials.profile.role).toBeNull()
    })
  })

  describe('location', () => {
    test('should return the configured redirect url', () => {
      const request = { query: {}, yar: { set: vi.fn() } }
      expect(getBellOptions(mockOidcConfig).location(request)).toBe(configValues['defraId.redirectUrl'])
    })

    test('should store a safe redirect in the session when provided', () => {
      mockGetSafeRedirect.mockReturnValue('/home')
      const request = { query: { redirect: '/home' }, yar: { set: vi.fn() } }

      getBellOptions(mockOidcConfig).location(request)

      expect(mockGetSafeRedirect).toHaveBeenCalledWith('/home')
      expect(request.yar.set).toHaveBeenCalledWith('redirect', '/home')
    })

    test('should not store a redirect when none is provided', () => {
      const request = { query: {}, yar: { set: vi.fn() } }
      getBellOptions(mockOidcConfig).location(request)
      expect(request.yar.set).not.toHaveBeenCalled()
    })
  })

  describe('providerParams', () => {
    test('should always send the service id, policy and response mode', () => {
      const params = getBellOptions(mockOidcConfig).providerParams({ path: '/auth/sign-in', query: {} })
      expect(params).toEqual({
        serviceId: 'mockServiceId',
        p: 'mockPolicy',
        response_mode: 'query'
      })
    })

    test('should force reselection on the organisation route', () => {
      const params = getBellOptions(mockOidcConfig).providerParams({ path: '/auth/organisation', query: {} })
      expect(params.forceReselection).toBe(true)
      expect(params.relationshipId).toBeUndefined()
    })

    test('should pass a preselected organisation as relationshipId', () => {
      const params = getBellOptions(mockOidcConfig).providerParams({
        path: '/auth/organisation',
        query: { organisationId: '1234567' }
      })
      expect(params.relationshipId).toBe('1234567')
    })
  })
})

describe('getCookieOptions', () => {
  const buildRequest = (userSession) => ({
    server: {
      app: {
        cache: {
          get: vi.fn().mockResolvedValue(userSession),
          set: vi.fn()
        }
      }
    }
  })

  test('should set a lax same site cookie', () => {
    expect(getCookieOptions().cookie.isSameSite).toBe('Lax')
  })

  test('should redirect to sign in with the original path', () => {
    const request = { url: { pathname: '/home', search: '?foo=bar' } }
    expect(getCookieOptions().redirectTo(request)).toBe('/auth/sign-in?redirect=/home?foo=bar')
  })

  describe('validate', () => {
    test('should be invalid when there is no session in the cache', async () => {
      const request = buildRequest(null)
      const result = await getCookieOptions().validate(request, { sessionId: 'session-id' })
      expect(result).toEqual({ isValid: false })
    })

    test('should be valid with an unexpired token', async () => {
      const token = Jwt.token.generate(
        { name: 'Andrew Farmer', exp: Math.floor(Date.now() / 1000) + 3600 },
        { key: 'a-secret', algorithm: 'HS256' }
      )
      const userSession = { token, refreshToken: 'refresh' }
      const request = buildRequest(userSession)

      const result = await getCookieOptions().validate(request, { sessionId: 'session-id' })

      expect(result.isValid).toBe(true)
      expect(result.credentials).toBe(userSession)
      expect(mockRefreshTokens).not.toHaveBeenCalled()
    })

    test('should refresh an expired token and update the cache', async () => {
      const token = Jwt.token.generate(
        { name: 'Andrew Farmer', exp: Math.floor(Date.now() / 1000) - 3600 },
        { key: 'a-secret', algorithm: 'HS256' }
      )
      const userSession = { token, refreshToken: 'refresh' }
      const request = buildRequest(userSession)

      mockRefreshTokens.mockResolvedValue({ access_token: 'new-token', refresh_token: 'new-refresh' })

      const result = await getCookieOptions().validate(request, { sessionId: 'session-id' })

      expect(mockRefreshTokens).toHaveBeenCalledWith('refresh')
      expect(request.server.app.cache.set).toHaveBeenCalledWith('session-id', userSession)
      expect(result.isValid).toBe(true)
      expect(result.credentials.token).toBe('new-token')
      expect(result.credentials.refreshToken).toBe('new-refresh')
    })

    test('should be invalid when the token has expired and refreshing is disabled', async () => {
      mockConfigGet.mockImplementation((key) => key === 'defraId.refreshTokens' ? false : configValues[key])

      const token = Jwt.token.generate(
        { name: 'Andrew Farmer', exp: Math.floor(Date.now() / 1000) - 3600 },
        { key: 'a-secret', algorithm: 'HS256' }
      )
      const request = buildRequest({ token, refreshToken: 'refresh' })

      const result = await getCookieOptions().validate(request, { sessionId: 'session-id' })

      expect(result).toEqual({ isValid: false })
      expect(mockRefreshTokens).not.toHaveBeenCalled()
    })
  })
})
