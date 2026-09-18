import { constants } from 'node:http2'
import '../helpers/setup-server-mocks.js'

const { HTTP_STATUS_OK, HTTP_STATUS_FOUND } = constants

const { createServer } = await import('../../../src/server.js')

let server

describe('GET /', () => {
  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  test('should return 200 when unauthenticated', async () => {
    const response = await server.inject({ url: '/' })
    expect(response.statusCode).toBe(HTTP_STATUS_OK)
  })

  test('should render the index view', async () => {
    const response = await server.inject({ url: '/' })
    expect(response.request.response.source.template).toBe('index')
  })

  test('should offer a Defra account sign in link', async () => {
    const response = await server.inject({ url: '/' })
    expect(response.payload).toContain('href="/auth/sign-in"')
    expect(response.payload).toContain('Sign in with Defra account')
  })

  test('should not offer sign out when unauthenticated', async () => {
    const response = await server.inject({ url: '/' })
    expect(response.payload).not.toContain('href="/auth/sign-out"')
  })

  test('should redirect unknown pages through the session strategy', async () => {
    const response = await server.inject({ url: '/home' })
    expect(response.statusCode).toBe(HTTP_STATUS_FOUND)
    expect(response.headers.location).toBe('/auth/sign-in?redirect=/home')
  })
})
