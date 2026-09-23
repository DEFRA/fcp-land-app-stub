import { constants } from 'node:http2'
import '../helpers/setup-server-mocks.js'

const { HTTP_STATUS_OK, HTTP_STATUS_FOUND, HTTP_STATUS_BAD_REQUEST, HTTP_STATUS_INTERNAL_SERVER_ERROR } = constants

const mockGetPersonalDetails = vi.fn()
vi.mock('../../../src/api/get-personal-details.js', () => ({
  getPersonalDetails: mockGetPersonalDetails
}))

const mockUpdatePersonalDetails = vi.fn()
vi.mock('../../../src/api/update-personal-details.js', () => ({
  updatePersonalDetails: mockUpdatePersonalDetails
}))

const { createServer } = await import('../../../src/server.js')

// Integration test files share one Redis instance, so session ids must be unique per file
const credentials = {
  isAuthenticated: true,
  sessionId: 'personal-details-edit-session-id',
  crn: '1234567890',
  organisationId: '1234567',
  sbi: '107183280',
  name: 'Andrew Farmer',
  organisationName: 'Farms Ltd',
  role: 'Agent',
  scope: ['user'],
  token: 'DEFRA-ID-JWT',
  refreshToken: 'DEFRA-ID-REFRESH-TOKEN'
}

const validPersonalDetails = {
  crn: credentials.crn,
  name: { first: 'Andrew', middle: null, last: 'Farmer' },
  dateOfBirth: '1980-01-01',
  address: {
    line1: '14 Oakwood Drive',
    line2: null,
    line3: null,
    line4: 'South Yorkshire',
    city: 'Sheffield',
    postalCode: 'S10 2GH',
    country: 'United Kingdom'
  },
  email: { address: 'andrew.farmer@example.com' },
  phone: { landline: '01144960123', mobile: '07771234567' }
}

const validPayload = {
  first: 'Andrew',
  middle: '',
  last: 'Farmer',
  day: '1',
  month: '1',
  year: '1980',
  personalTelephone: '01144960123',
  personalMobile: '07771234567',
  personalEmail: 'andrew.farmer@example.com',
  line1: '14 Oakwood Drive',
  line2: '',
  line3: '',
  city: 'Sheffield',
  county: 'South Yorkshire',
  postalCode: 'S10 2GH',
  country: 'United Kingdom'
}

let server

describe('GET /personal-details/edit', () => {
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
    const response = await server.inject({ url: '/personal-details/edit' })
    expect(response.statusCode).toBe(HTTP_STATUS_FOUND)
  })

  test('should render the edit form pre-filled when the current data is valid', async () => {
    mockGetPersonalDetails.mockResolvedValue(validPersonalDetails)

    const response = await server.inject({
      url: '/personal-details/edit',
      auth: { strategy: 'session', credentials }
    })

    expect(response.statusCode).toBe(HTTP_STATUS_OK)
    expect(response.request.response.source.template).toBe('personal-details-edit')
    expect(response.payload).toContain('value="Andrew"')
    expect(response.payload).toContain('value="S10 2GH"')
  })

  test('should show a contact-RPA notice instead of the form when the current data is invalid', async () => {
    mockGetPersonalDetails.mockResolvedValue({ ...validPersonalDetails, email: null })

    const response = await server.inject({
      url: '/personal-details/edit',
      auth: { strategy: 'session', credentials }
    })

    expect(response.statusCode).toBe(HTTP_STATUS_OK)
    expect(response.payload).toContain('Rural Payments Agency')
    expect(response.payload).not.toContain('<form')
  })

  test('should show a contact-RPA notice when there is no record to edit', async () => {
    mockGetPersonalDetails.mockResolvedValue(null)

    const response = await server.inject({
      url: '/personal-details/edit',
      auth: { strategy: 'session', credentials }
    })

    expect(response.payload).toContain('Rural Payments Agency')
  })
})

describe('POST /personal-details/edit', () => {
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
      url: '/personal-details/edit',
      auth: { strategy: 'session', credentials },
      payload: { ...validPayload, first: '' }
    })

    expect(response.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
    expect(response.payload).toContain('Enter first name')
    expect(mockUpdatePersonalDetails).not.toHaveBeenCalled()
  })

  test('should update the details and redirect to /home when the payload is valid', async () => {
    mockUpdatePersonalDetails.mockResolvedValue(true)

    const response = await server.inject({
      method: 'POST',
      url: '/personal-details/edit',
      auth: { strategy: 'session', credentials },
      payload: validPayload
    })

    expect(response.statusCode).toBe(HTTP_STATUS_FOUND)
    expect(response.headers.location).toBe('/home?updated=personal')

    const [input] = mockUpdatePersonalDetails.mock.calls[0]
    expect(input.crn).toBe(credentials.crn)
    expect(input.dateOfBirth).toBe('1980-01-01')
    expect(input.address.line1).toBe('14 Oakwood Drive')
    expect(input.address.line4).toBe('South Yorkshire')
    expect(input.address.county).toBeNull()
  })

  test('should show an error notice when the update fails', async () => {
    mockUpdatePersonalDetails.mockRejectedValue(new Error('External API request failed'))

    const response = await server.inject({
      method: 'POST',
      url: '/personal-details/edit',
      auth: { strategy: 'session', credentials },
      payload: validPayload
    })

    expect(response.statusCode).toBe(HTTP_STATUS_INTERNAL_SERVER_ERROR)
    expect(response.payload).toContain('Something went wrong')
  })
})
