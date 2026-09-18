import './helpers/setup-server-mocks.js'

const { createServer } = await import('../../src/server.js')

describe('createServer', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  test('should create a server with a session cache', () => {
    expect(server.app.cache).toBeDefined()
  })

  test('should register the defra-id and session auth strategies', () => {
    expect(server.auth.settings.default.strategies).toEqual(['session'])
  })

  test('should strip trailing slashes', async () => {
    const response = await server.inject({ url: '/health/' })
    expect(response.statusCode).toBe(200)
  })
})
