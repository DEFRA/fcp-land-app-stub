import { constants } from 'node:http2'
import '../helpers/setup-server-mocks.js'

const { HTTP_STATUS_OK, HTTP_STATUS_NO_CONTENT } = constants

const { createServer } = await import('../../../src/server.js')

let server

describe('static assets', () => {
  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  test('should serve the health check without authentication', async () => {
    const response = await server.inject({ url: '/health' })
    expect(response.statusCode).toBe(HTTP_STATUS_OK)
    expect(response.result).toEqual({ message: 'success' })
  })

  test('should serve the logo without authentication', async () => {
    const response = await server.inject({ url: '/public/assets/images/logo.svg' })
    expect(response.statusCode).toBe(HTTP_STATUS_OK)
  })

  test('should serve every asset referenced by the layout', async () => {
    const page = await server.inject({ url: '/' })
    const urls = [...page.payload.matchAll(/(?:href|src)="(\/public\/[^"]+)"/g)].map(match => match[1])

    expect(urls.length).toBeGreaterThan(0)

    for (const url of urls) {
      const response = await server.inject({ url })
      expect(response.statusCode, url).toBe(HTTP_STATUS_OK)
    }
  })

  test('should return 204 for favicon', async () => {
    const response = await server.inject({ url: '/favicon.ico' })
    expect(response.statusCode).toBe(HTTP_STATUS_NO_CONTENT)
  })
})
