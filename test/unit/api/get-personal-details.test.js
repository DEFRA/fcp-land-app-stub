const mockQuery = vi.fn()
vi.mock('../../../src/api/query.js', () => ({
  query: mockQuery
}))

const mockLoggerWarn = vi.fn()
vi.mock('../../../src/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({ warn: mockLoggerWarn })
}))

const { getPersonalDetails } = await import('../../../src/api/get-personal-details.js')

const crn = '1102634220'
const token = 'DEFRA-ID-JWT'

const personData = {
  customer: {
    crn,
    info: {
      name: { first: 'James', middle: 'Alan', last: 'Henderson' },
      dateOfBirth: '1972-04-17',
      address: { line1: '14 Oakwood Drive', postalCode: 'S10 2GH' },
      email: { address: 'james.henderson@example.com' },
      phone: { landline: '01144960123', mobile: '07771234567' }
    }
  }
}

describe('getPersonalDetails', () => {
  test('should call the external api with the crn and user token', async () => {
    mockQuery.mockResolvedValue(personData)
    await getPersonalDetails(crn, token)
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), { crn }, { userToken: token })
  })

  test('should return the crn alongside the flattened customer info', async () => {
    mockQuery.mockResolvedValue(personData)
    const result = await getPersonalDetails(crn, token)
    expect(result).toEqual({ crn, ...personData.customer.info })
  })

  test('should return null when the customer is not found', async () => {
    mockQuery.mockResolvedValue({ customer: null })
    const result = await getPersonalDetails(crn, token)
    expect(result).toBeNull()
  })

  test('should log a warning and return null when the query fails', async () => {
    const error = new Error('External API request failed')
    mockQuery.mockRejectedValue(error)
    const result = await getPersonalDetails(crn, token)
    expect(result).toBeNull()
    expect(mockLoggerWarn).toHaveBeenCalledWith({ error, crn }, expect.any(String))
  })
})
