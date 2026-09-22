const mockQuery = vi.fn()
vi.mock('../../../src/api/query.js', () => ({
  query: mockQuery
}))

const mockLoggerWarn = vi.fn()
vi.mock('../../../src/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({ warn: mockLoggerWarn })
}))

const { getBusinessDetails } = await import('../../../src/api/get-business-details.js')

const sbi = '107183280'
const token = 'DEFRA-ID-JWT'

const businessData = {
  business: {
    sbi,
    organisationId: '5565448',
    countyParishHoldings: [{ cphNumber: '10/123/4567' }],
    info: {
      name: 'Henderson Family Farms',
      vat: 'GB123456789',
      traderNumber: '010203040506',
      vendorNumber: '694523',
      legalStatus: { code: '102111', type: 'Sole Proprietorship' },
      type: { code: '101443', type: 'Central Government' },
      address: { line1: '14 Oakwood Drive', postalCode: 'S10 2GH' },
      email: { address: 'contact@hendersonfamilyfarms.example.com' },
      phone: { landline: '01144960123', mobile: '07771234567' }
    }
  }
}

describe('getBusinessDetails', () => {
  test('should call the external api with the sbi and user token', async () => {
    mockQuery.mockResolvedValue(businessData)
    await getBusinessDetails(sbi, token)
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), { sbi }, { userToken: token })
  })

  test('should return the identifiers alongside the flattened business info', async () => {
    mockQuery.mockResolvedValue(businessData)
    const result = await getBusinessDetails(sbi, token)
    expect(result).toEqual({
      sbi,
      organisationId: businessData.business.organisationId,
      countyParishHoldings: businessData.business.countyParishHoldings,
      ...businessData.business.info
    })
  })

  test('should return null when the business is not found', async () => {
    mockQuery.mockResolvedValue({ business: null })
    const result = await getBusinessDetails(sbi, token)
    expect(result).toBeNull()
  })

  test('should log a warning and return null when the query fails', async () => {
    const error = new Error('External API request failed')
    mockQuery.mockRejectedValue(error)
    const result = await getBusinessDetails(sbi, token)
    expect(result).toBeNull()
    expect(mockLoggerWarn).toHaveBeenCalledWith({ error, sbi }, expect.any(String))
  })
})
