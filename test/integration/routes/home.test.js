import { constants } from 'node:http2'
import '../helpers/setup-server-mocks.js'

const { HTTP_STATUS_OK, HTTP_STATUS_FOUND, HTTP_STATUS_FORBIDDEN } = constants

const { createServer } = await import('../../../src/server.js')

// Integration test files share one Redis instance, so session ids must be unique per file
const credentials = {
  isAuthenticated: true,
  sessionId: 'home-session-id',
  crn: '1234567890',
  organisationId: '1234567',
  sbi: '107183280',
  name: 'Andrew Farmer',
  organisationName: 'Farms Ltd',
  businessName: 'Farms Ltd',
  role: 'Agent',
  scope: ['user', 'LAND_DETAILS:FULL_PERMISSION'],
  token: 'DEFRA-ID-JWT',
  refreshToken: 'DEFRA-ID-REFRESH-TOKEN'
}

let server

describe('GET /home', () => {
  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
    await server.app.cache.set(credentials.sessionId, credentials)
  })

  afterAll(async () => {
    await server.app.cache.drop(credentials.sessionId)
    await server.stop()
  })

  test('should redirect to sign in if unauthenticated', async () => {
    const response = await server.inject({ url: '/home' })
    expect(response.statusCode).toBe(HTTP_STATUS_FOUND)
    expect(response.headers.location).toBe('/auth/sign-in?redirect=/home')
  })

  test('should return 200 if authenticated with user scope', async () => {
    const response = await server.inject({
      url: '/home',
      auth: { strategy: 'session', credentials }
    })
    expect(response.statusCode).toBe(HTTP_STATUS_OK)
  })

  test('should render the home view', async () => {
    const response = await server.inject({
      url: '/home',
      auth: { strategy: 'session', credentials }
    })
    expect(response.request.response.source.template).toBe('home')
  })

  test('should display session details from the cache', async () => {
    const response = await server.inject({
      url: '/home',
      auth: { strategy: 'session', credentials }
    })
    expect(response.payload).toContain(credentials.crn)
    expect(response.payload).toContain(credentials.organisationId)
    expect(response.payload).toContain(credentials.name)
  })

  test('should offer change organisation and sign out links', async () => {
    const response = await server.inject({
      url: '/home',
      auth: { strategy: 'session', credentials }
    })
    expect(response.payload).toContain('href="/auth/organisation"')
    expect(response.payload).toContain('href="/auth/sign-out"')
  })

  test('should return 403 if authenticated without the user scope', async () => {
    const response = await server.inject({
      url: '/home',
      auth: { strategy: 'session', credentials: { ...credentials, scope: ['other'] } }
    })
    expect(response.statusCode).toBe(HTTP_STATUS_FORBIDDEN)
    expect(response.request.response.source.template).toBe('403')
  })
})
