const mockQuery = vi.fn()
vi.mock('../../../src/api/query.js', () => ({
  query: mockQuery
}))

const { updatePersonalDetails } = await import('../../../src/api/update-personal-details.js')

const token = 'DEFRA-ID-JWT'
const input = { crn: '1102634220', first: 'James' }

describe('updatePersonalDetails', () => {
  test('should call the external api with the input and user token', async () => {
    mockQuery.mockResolvedValue({ updateCustomerAllFields: { success: true } })
    await updatePersonalDetails(input, token)
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), { input }, { userToken: token })
  })

  test('should return true when the mutation succeeds', async () => {
    mockQuery.mockResolvedValue({ updateCustomerAllFields: { success: true } })
    expect(await updatePersonalDetails(input, token)).toBe(true)
  })

  test('should throw when the mutation reports failure', async () => {
    mockQuery.mockResolvedValue({ updateCustomerAllFields: { success: false } })
    await expect(updatePersonalDetails(input, token)).rejects.toThrow('not report the personal details update as successful')
  })

  test('should throw when the mutation returns no result', async () => {
    mockQuery.mockResolvedValue({ updateCustomerAllFields: null })
    await expect(updatePersonalDetails(input, token)).rejects.toThrow('not report the personal details update as successful')
  })

  test('should propagate errors from the external api', async () => {
    const error = new Error('External API request failed')
    mockQuery.mockRejectedValue(error)
    await expect(updatePersonalDetails(input, token)).rejects.toThrow(error)
  })
})
