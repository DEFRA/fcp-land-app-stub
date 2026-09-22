import { constants } from 'node:http2'
import '../helpers/setup-server-mocks.js'

const { HTTP_STATUS_OK, HTTP_STATUS_FOUND, HTTP_STATUS_FORBIDDEN } = constants

const mockGetPersonalDetails = vi.fn()
vi.mock('../../../src/api/get-personal-details.js', () => ({
  getPersonalDetails: mockGetPersonalDetails
}))

const mockGetBusinessDetails = vi.fn()
vi.mock('../../../src/api/get-business-details.js', () => ({
  getBusinessDetails: mockGetBusinessDetails
}))

const { createServer } = await import('../../../src/server.js')

// Integration test files share one Redis instance, so session ids must be unique per file
const credentials = {
  isAuthenticated: true,
  sessionId: 'home-details-session-id',
  crn: '1234567890',
  organisationId: '1234567',
  sbi: '107183280',
  name: 'Andrew Farmer',
  organisationName: 'Farms Ltd',
  role: 'Agent',
  scope: ['user', 'BUSINESS_DETAILS:FULL_PERMISSION'],
  token: 'DEFRA-ID-JWT',
  refreshToken: 'DEFRA-ID-REFRESH-TOKEN'
}

const personalDetails = {
  crn: credentials.crn,
  name: { first: 'Andrew', middle: null, last: 'Farmer' },
  dateOfBirth: '1980-01-01',
  address: { line1: '14 Oakwood Drive', postalCode: 'S10 2GH' },
  email: { address: 'andrew.farmer@example.com' },
  phone: { landline: '01144960123', mobile: '07771234567' }
}

const businessDetails = {
  sbi: credentials.sbi,
  organisationId: credentials.organisationId,
  countyParishHoldings: [{ cphNumber: '10/123/4567' }],
  name: 'Farms Ltd',
  vat: 'GB123456789',
  traderNumber: '010203040506',
  vendorNumber: '694523',
  legalStatus: { code: '102111', type: 'Sole Proprietorship' },
  type: { code: '101443', type: 'Central Government' },
  address: { line1: '1 Farm Lane', postalCode: 'AB1 2CD' },
  email: { address: 'contact@farmsltd.example.com' },
  phone: { landline: '01144960124', mobile: '07771234568' }
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

  beforeEach(() => {
    mockGetPersonalDetails.mockResolvedValue(personalDetails)
    mockGetBusinessDetails.mockResolvedValue(businessDetails)
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

  test('should display personal details fetched from the external api', async () => {
    const response = await server.inject({
      url: '/home',
      auth: { strategy: 'session', credentials }
    })
    expect(response.payload).toContain(personalDetails.crn)
    expect(response.payload).toContain(personalDetails.email.address)
  })

  test('should display business details when the user has business scope', async () => {
    const response = await server.inject({
      url: '/home',
      auth: { strategy: 'session', credentials }
    })
    expect(response.payload).toContain(businessDetails.name)
    expect(response.payload).toContain(businessDetails.vat)
  })

  test('should show a permission notice instead of business details when the user lacks business scope', async () => {
    const response = await server.inject({
      url: '/home',
      auth: { strategy: 'session', credentials: { ...credentials, scope: ['user'] } }
    })
    expect(mockGetBusinessDetails).not.toHaveBeenCalled()
    expect(response.payload).toContain('do not have permission')
    expect(response.payload).not.toContain(businessDetails.vat)
  })

  test('should offer a link to the session details page', async () => {
    const response = await server.inject({
      url: '/home',
      auth: { strategy: 'session', credentials }
    })
    expect(response.payload).toContain('href="/session"')
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
