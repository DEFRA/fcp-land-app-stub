const mockQuery = vi.fn()
vi.mock('../../../src/api/query.js', () => ({
  query: mockQuery
}))

const { updateBusinessDetails } = await import('../../../src/api/update-business-details.js')

const token = 'DEFRA-ID-JWT'
const input = { sbi: '107183280', name: 'Henderson Family Farms' }

describe('updateBusinessDetails', () => {
  test('should call the external api with the input and user token', async () => {
    mockQuery.mockResolvedValue({ updateBusinessAllFields: { success: true } })
    await updateBusinessDetails(input, token)
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), { input }, { userToken: token })
  })

  test('should return true when the mutation succeeds', async () => {
    mockQuery.mockResolvedValue({ updateBusinessAllFields: { success: true } })
    expect(await updateBusinessDetails(input, token)).toBe(true)
  })

  test('should return false when the mutation reports failure', async () => {
    mockQuery.mockResolvedValue({ updateBusinessAllFields: { success: false } })
    expect(await updateBusinessDetails(input, token)).toBe(false)
  })

  test('should propagate errors from the external api', async () => {
    const error = new Error('External API request failed')
    mockQuery.mockRejectedValue(error)
    await expect(updateBusinessDetails(input, token)).rejects.toThrow(error)
  })
})
