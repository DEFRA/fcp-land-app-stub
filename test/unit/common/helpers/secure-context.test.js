import tls from 'node:tls'

const mockConfigGet = vi.fn()
vi.mock('../../../../src/config/config.js', () => ({
  config: { get: mockConfigGet }
}))

const mockGetTrustStoreCerts = vi.fn()
vi.mock('../../../../src/common/helpers/secure-context/get-trust-store-certs.js', () => ({
  getTrustStoreCerts: mockGetTrustStoreCerts
}))

const { secureContext } = await import('../../../../src/common/helpers/secure-context/secure-context.js')

const originalCreateSecureContext = tls.createSecureContext

let server

describe('secureContext', () => {
  beforeEach(() => {
    tls.createSecureContext = originalCreateSecureContext
    server = {
      logger: { info: vi.fn() },
      decorate: vi.fn()
    }
  })

  afterAll(() => {
    tls.createSecureContext = originalCreateSecureContext
  })

  test('should log and do nothing when disabled', () => {
    mockConfigGet.mockReturnValue(false)
    secureContext.plugin.register(server)

    expect(server.logger.info).toHaveBeenCalledWith('Custom secure context is disabled')
    expect(server.decorate).not.toHaveBeenCalled()
    expect(tls.createSecureContext).toBe(originalCreateSecureContext)
  })

  test('should decorate the server with a secure context when enabled', () => {
    mockConfigGet.mockReturnValue(true)
    mockGetTrustStoreCerts.mockReturnValue([])

    secureContext.plugin.register(server)

    expect(server.decorate).toHaveBeenCalledWith('server', 'secureContext', expect.anything())
  })

  test('should log when no certificates are found', () => {
    mockConfigGet.mockReturnValue(true)
    mockGetTrustStoreCerts.mockReturnValue([])

    secureContext.plugin.register(server)

    expect(server.logger.info).toHaveBeenCalledWith('Could not find any TRUSTSTORE_ certificates')
  })

  test('should add each certificate to the secure context', () => {
    const cert = `-----BEGIN CERTIFICATE-----
MIIBITCBxKADAgECAgEBMAoGCCqGSM49BAMCMBIxEDAOBgNVBAMTB1Rlc3QgQ0Ew
HhcNMjUwMTAxMDAwMDAwWhcNMzUwMTAxMDAwMDAwWjASMRAwDgYDVQQDEwdUZXN0
IENBMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE
-----END CERTIFICATE-----`

    mockConfigGet.mockReturnValue(true)
    mockGetTrustStoreCerts.mockReturnValue([cert])

    const addCACert = vi.fn()
    tls.createSecureContext = vi.fn(() => ({ context: { addCACert } }))

    secureContext.plugin.register(server)

    // The wrapped implementation is invoked once by the decorate call
    expect(addCACert).toHaveBeenCalledWith(cert)
  })
})
