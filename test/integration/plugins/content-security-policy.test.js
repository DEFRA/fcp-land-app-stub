import '../helpers/setup-server-mocks.js'

const { createServer } = await import('../../../src/server.js')

let server

describe('content security policy', () => {
  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  test('should set a content security policy header', async () => {
    const response = await server.inject({ url: '/' })
    expect(response.headers['content-security-policy']).toBeDefined()
  })

  test('should restrict every directive to self', async () => {
    const response = await server.inject({ url: '/' })
    const csp = response.headers['content-security-policy']
    expect(csp).toContain("script-src 'self'")
    expect(csp).toContain("style-src 'self'")
    expect(csp).toContain("img-src 'self'")
    expect(csp).toContain("font-src 'self'")
    expect(csp).toContain("frame-ancestors 'self'")
    expect(csp).toContain("form-action 'self'")
  })

  test('should generate a nonce for the inline script tag', async () => {
    const response = await server.inject({ url: '/' })
    const nonce = /'nonce-([^']+)'/.exec(response.headers['content-security-policy'])
    expect(nonce).not.toBeNull()
    expect(response.payload).toContain(`nonce="${nonce[1]}"`)
  })
})
