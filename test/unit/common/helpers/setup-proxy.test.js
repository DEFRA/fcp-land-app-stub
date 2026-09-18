const mockSetGlobalDispatcher = vi.fn()
const mockProxyAgent = vi.fn()
vi.mock('undici', () => ({
  ProxyAgent: mockProxyAgent,
  setGlobalDispatcher: mockSetGlobalDispatcher
}))

const mockBootstrap = vi.fn(() => {
  globalThis.GLOBAL_AGENT = {}
})
vi.mock('global-agent', () => ({
  bootstrap: mockBootstrap
}))

const mockConfigGet = vi.fn()
vi.mock('../../../../src/config/config.js', () => ({
  config: { get: mockConfigGet }
}))

vi.mock('../../../../src/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({ info: vi.fn(), error: vi.fn() })
}))

const { setupProxy } = await import('../../../../src/common/helpers/proxy/setup-proxy.js')

describe('setupProxy', () => {
  test('should do nothing when no proxy is configured', () => {
    mockConfigGet.mockReturnValue(null)
    setupProxy()
    expect(mockSetGlobalDispatcher).not.toHaveBeenCalled()
    expect(mockBootstrap).not.toHaveBeenCalled()
  })

  test('should configure undici and global-agent when a proxy is configured', () => {
    mockConfigGet.mockReturnValue('http://proxy.example.com:8080')
    setupProxy()
    expect(mockProxyAgent).toHaveBeenCalledWith('http://proxy.example.com:8080')
    expect(mockSetGlobalDispatcher).toHaveBeenCalled()
    expect(mockBootstrap).toHaveBeenCalled()
    expect(globalThis.GLOBAL_AGENT.HTTP_PROXY).toBe('http://proxy.example.com:8080')
  })
})
