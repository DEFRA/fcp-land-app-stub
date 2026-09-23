import { constants } from 'node:http2'
import '../helpers/setup-server-mocks.js'

const {
  HTTP_STATUS_OK,
  HTTP_STATUS_FOUND,
  HTTP_STATUS_FORBIDDEN,
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} = constants

const mockGetBusinessDetails = vi.fn()
vi.mock('../../../src/api/get-business-details.js', () => ({
  getBusinessDetails: mockGetBusinessDetails
}))

const mockUpdateBusinessDetails = vi.fn()
vi.mock('../../../src/api/update-business-details.js', () => ({
  updateBusinessDetails: mockUpdateBusinessDetails
}))

const { createServer } = await import('../../../src/server.js')

// Integration test files share one Redis instance, so session ids must be unique per file
const credentials = {
  isAuthenticated: true,
  sessionId: 'business-details-edit-session-id',
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

const validBusinessDetails = {
  sbi: credentials.sbi,
  organisationId: credentials.organisationId,
  countyParishHoldings: [{ cphNumber: '10/123/4567' }],
  name: 'Farms Ltd',
  vat: '123456789',
  address: {
    line1: '1 Farm Lane',
    line2: null,
    line3: null,
    line4: null,
    city: 'Sheffield',
    postalCode: 'AB1 2CD',
    country: 'United Kingdom'
  },
  email: { address: 'contact@farmsltd.example.com' },
  phone: { landline: '01144960124', mobile: '07771234568' }
}

const validPayload = {
  businessName: 'Farms Ltd',
  businessTelephone: '01144960124',
  businessMobile: '07771234568',
  businessEmail: 'contact@farmsltd.example.com',
  vatNumber: '123456789',
  line1: '1 Farm Lane',
  line2: '',
  line3: '',
  city: 'Sheffield',
  county: '',
  postalCode: 'AB1 2CD',
  country: 'United Kingdom'
}

let server

describe('GET /business-details/edit', () => {
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
    vi.clearAllMocks()
  })

  test('should redirect to sign in if unauthenticated', async () => {
    const response = await server.inject({ url: '/business-details/edit' })
    expect(response.statusCode).toBe(HTTP_STATUS_FOUND)
  })

  test('should return 403 without full business permission', async () => {
    const response = await server.inject({
      url: '/business-details/edit',
      auth: { strategy: 'session', credentials: { ...credentials, scope: ['user', 'BUSINESS_DETAILS:AMEND'] } }
    })

    expect(response.statusCode).toBe(HTTP_STATUS_FORBIDDEN)
  })

  test('should render the edit form pre-filled when the current data is valid', async () => {
    mockGetBusinessDetails.mockResolvedValue(validBusinessDetails)

    const response = await server.inject({
      url: '/business-details/edit',
      auth: { strategy: 'session', credentials }
    })

    expect(response.statusCode).toBe(HTTP_STATUS_OK)
    expect(response.request.response.source.template).toBe('business-details-edit')
    expect(response.payload).toContain('value="Farms Ltd"')
  })

  test('should show a contact-RPA notice instead of the form when the current data is invalid', async () => {
    mockGetBusinessDetails.mockResolvedValue({ ...validBusinessDetails, name: '' })

    const response = await server.inject({
      url: '/business-details/edit',
      auth: { strategy: 'session', credentials }
    })

    expect(response.payload).toContain('Rural Payments Agency')
    expect(response.payload).not.toContain('<form')
  })
})

describe('POST /business-details/edit', () => {
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
    vi.clearAllMocks()
  })

  test('should re-render with errors when the payload is invalid', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/business-details/edit',
      auth: { strategy: 'session', credentials },
      payload: { ...validPayload, businessName: '' }
    })

    expect(response.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
    expect(response.payload).toContain('Enter business name')
    expect(mockUpdateBusinessDetails).not.toHaveBeenCalled()
  })

  test('should update the details and redirect to /home when the payload is valid', async () => {
    mockUpdateBusinessDetails.mockResolvedValue(true)

    const response = await server.inject({
      method: 'POST',
      url: '/business-details/edit',
      auth: { strategy: 'session', credentials },
      payload: validPayload
    })

    expect(response.statusCode).toBe(HTTP_STATUS_FOUND)
    expect(response.headers.location).toBe('/home?updated=business')

    const [input] = mockUpdateBusinessDetails.mock.calls[0]
    expect(input.sbi).toBe(credentials.sbi)
    expect(input.name).toBe('Farms Ltd')
    expect(input.address.withoutUprn.line1).toBe('1 Farm Lane')
  })

  test('should show an error notice when the update fails', async () => {
    mockUpdateBusinessDetails.mockRejectedValue(new Error('External API request failed'))

    const response = await server.inject({
      method: 'POST',
      url: '/business-details/edit',
      auth: { strategy: 'session', credentials },
      payload: validPayload
    })

    expect(response.statusCode).toBe(HTTP_STATUS_INTERNAL_SERVER_ERROR)
    expect(response.payload).toContain('Something went wrong')
  })
})
