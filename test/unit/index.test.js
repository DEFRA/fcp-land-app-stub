// `clearMocks` wipes the call recorded at import time, so record it separately
let started = false
const mockStartServer = vi.fn(() => {
  started = true
})
vi.mock('../../src/common/helpers/start-server.js', () => ({
  startServer: mockStartServer
}))

const mockLoggerInfo = vi.fn()
const mockLoggerError = vi.fn()
vi.mock('../../src/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({ info: mockLoggerInfo, error: mockLoggerError })
}))

await import('../../src/index.js')

describe('index', () => {
  test('should start the server', () => {
    expect(started).toBe(true)
  })

  test('should log unhandled rejections and set a failure exit code', () => {
    const err = new Error('Unhandled')
    process.emit('unhandledRejection', err)

    expect(mockLoggerInfo).toHaveBeenCalledWith('Unhandled rejection')
    expect(mockLoggerError).toHaveBeenCalledWith(err)
    expect(process.exitCode).toBe(1)

    process.exitCode = 0
  })
})
