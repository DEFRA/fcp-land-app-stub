const mockGetTraceId = vi.fn()
vi.mock('@defra/hapi-tracing', () => ({
  getTraceId: mockGetTraceId
}))

const { loggerOptions } = await import('../../../../../src/common/helpers/logging/logger-options.js')

describe('loggerOptions', () => {
  test('should ignore health check requests', () => {
    expect(loggerOptions.ignorePaths).toEqual(['/health'])
  })

  test('should remove redacted paths', () => {
    expect(loggerOptions.redact.remove).toBe(true)
  })

  test('should add the trace id to log entries when present', () => {
    mockGetTraceId.mockReturnValue('trace-id')
    expect(loggerOptions.mixin()).toEqual({ trace: { id: 'trace-id' } })
  })

  test('should not add a trace id when there is none', () => {
    mockGetTraceId.mockReturnValue(undefined)
    expect(loggerOptions.mixin()).toEqual({})
  })
})
