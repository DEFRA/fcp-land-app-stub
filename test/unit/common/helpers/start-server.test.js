const mockStart = vi.fn()
const mockLoggerInfo = vi.fn()
const mockLoggerError = vi.fn()

const mockCreateServer = vi.fn()
vi.mock('../../../../src/server.js', () => ({
  createServer: mockCreateServer
}))

vi.mock('../../../../src/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({ info: mockLoggerInfo, error: mockLoggerError })
}))

const { startServer } = await import('../../../../src/common/helpers/start-server.js')

describe('startServer', () => {
  beforeEach(() => {
    mockCreateServer.mockResolvedValue({
      start: mockStart,
      logger: { info: mockLoggerInfo, error: mockLoggerError }
    })
  })

  test('should create and start the server', async () => {
    await startServer()
    expect(mockCreateServer).toHaveBeenCalled()
    expect(mockStart).toHaveBeenCalled()
  })

  test('should log the local url', async () => {
    await startServer()
    expect(mockLoggerInfo).toHaveBeenCalledWith(expect.stringContaining('Access the Land App stub on http://localhost:'))
  })

  test('should return the server', async () => {
    const server = await startServer()
    expect(server.start).toBe(mockStart)
  })

  test('should log and swallow a start up failure', async () => {
    const err = new Error('Server failed')
    mockCreateServer.mockRejectedValue(err)

    await expect(startServer()).resolves.toBeUndefined()
    expect(mockLoggerInfo).toHaveBeenCalledWith('Server failed to start')
    expect(mockLoggerError).toHaveBeenCalledWith(err)
  })
})
