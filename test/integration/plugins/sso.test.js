import { constants } from 'node:http2'
import '../helpers/setup-server-mocks.js'

const { HTTP_STATUS_FOUND } = constants

const { createServer } = await import('../../../src/server.js')

let server

describe('sso plugin', () => {
  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  test('should redirect to organisation route when ssoOrgId is provided', async () => {
    const response = await server.inject({ url: '/?ssoOrgId=1234567' })
    expect(response.statusCode).toBe(HTTP_STATUS_FOUND)
    expect(response.headers.location).toBe('/auth/organisation?organisationId=1234567&redirect=/')
  })

  test('should strip the ssoOrgId parameter from the redirect', async () => {
    const response = await server.inject({ url: '/home?ssoOrgId=1234567&foo=bar' })
    expect(response.headers.location).toBe('/auth/organisation?organisationId=1234567&redirect=/home?foo=bar')
  })

  test('should not intercept requests without ssoOrgId', async () => {
    const response = await server.inject({ url: '/' })
    expect(response.headers.location).toBeUndefined()
  })
})
