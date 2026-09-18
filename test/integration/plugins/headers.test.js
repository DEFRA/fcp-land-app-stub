import '../helpers/setup-server-mocks.js'

const { createServer } = await import('../../../src/server.js')

let server

describe('security headers', () => {
  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  test.each([
    ['x-content-type-options', 'nosniff'],
    ['x-frame-options', 'DENY'],
    ['x-robots-tag', 'noindex, nofollow'],
    ['x-xss-protection', '1; mode=block'],
    ['cross-origin-opener-policy', 'same-origin'],
    ['cross-origin-embedder-policy', 'require-corp'],
    ['cross-origin-resource-policy', 'same-site'],
    ['referrer-policy', 'no-referrer']
  ])('should set %s', async (header, value) => {
    const response = await server.inject({ url: '/' })
    expect(response.headers[header]).toBe(value)
  })

  test('should set a strict transport security header', async () => {
    const response = await server.inject({ url: '/' })
    expect(response.headers['strict-transport-security']).toContain('max-age=31536000')
  })

  test('should set a permissions policy header', async () => {
    const response = await server.inject({ url: '/' })
    expect(response.headers['permissions-policy']).toContain('geolocation=()')
  })

  test('should allow caching of the index page', async () => {
    const response = await server.inject({ url: '/' })
    expect(response.headers['cache-control']).not.toContain('no-store')
  })

  test('should disable caching of authenticated pages', async () => {
    const response = await server.inject({ url: '/home' })
    expect(response.headers['cache-control']).toContain('no-store')
    expect(response.headers.pragma).toBe('no-cache')
    expect(response.headers.expires).toBe('0')
  })
})
