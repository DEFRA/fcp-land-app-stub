const mockQuery = vi.fn()
vi.mock('../../../src/api/query.js', () => ({
  query: mockQuery
}))

const mockLoggerWarn = vi.fn()
vi.mock('../../../src/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({ warn: mockLoggerWarn })
}))

const { getPermissions } = await import('../../../src/auth/get-permissions.js')

const sbi = '107183280'
const crn = '1102634220'
const token = 'DEFRA-ID-JWT'

const businessData = {
  business: {
    info: { name: 'Farms Ltd' },
    customer: {
      permissionGroups: [
        { id: 'business_details', level: 'full_permission' },
        { id: 'land_details', level: 'amend' }
      ]
    }
  }
}

beforeEach(() => {
  mockQuery.mockResolvedValue(businessData)
})

describe('getPermissions', () => {
  test('should call the external api with the sbi, crn and user token', async () => {
    await getPermissions(sbi, crn, token)
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), { sbi, crn }, { userToken: token })
  })

  test('should map permission groups to uppercase id:level scope entries', async () => {
    const { scope } = await getPermissions(sbi, crn, token)
    expect(scope).toContain('BUSINESS_DETAILS:FULL_PERMISSION')
    expect(scope).toContain('LAND_DETAILS:AMEND')
  })

  test('should always include the user scope', async () => {
    const { scope } = await getPermissions(sbi, crn, token)
    expect(scope).toContain('user')
  })

  test('should return the business name', async () => {
    const { businessName } = await getPermissions(sbi, crn, token)
    expect(businessName).toBe('Farms Ltd')
  })

  test('should fall back to the default scope when business is null', async () => {
    mockQuery.mockResolvedValue({ business: null })
    const result = await getPermissions(sbi, crn, token)
    expect(result).toEqual({ scope: ['user'], businessName: null })
  })

  test('should fall back to the default scope when customer is null', async () => {
    mockQuery.mockResolvedValue({ business: { info: { name: 'Farms Ltd' }, customer: null } })
    const result = await getPermissions(sbi, crn, token)
    expect(result).toEqual({ scope: ['user'], businessName: null })
  })

  test('should fall back to the default scope and log a warning when the query throws', async () => {
    mockQuery.mockRejectedValue(new Error('External API unreachable'))
    const result = await getPermissions(sbi, crn, token)
    expect(result).toEqual({ scope: ['user'], businessName: null })
    expect(mockLoggerWarn).toHaveBeenCalled()
  })

  test('should fall back to the default scope when the response fails schema validation', async () => {
    mockQuery.mockResolvedValue({ business: { customer: { permissionGroups: [{ id: 'land_details' }] } } })
    const result = await getPermissions(sbi, crn, token)
    expect(result).toEqual({ scope: ['user'], businessName: null })
  })
})
