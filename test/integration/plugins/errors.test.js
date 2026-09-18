import { constants } from 'node:http2'
import '../helpers/setup-server-mocks.js'

const { HTTP_STATUS_NOT_FOUND, HTTP_STATUS_INTERNAL_SERVER_ERROR } = constants

const { createServer } = await import('../../../src/server.js')

let server

describe('error handling', () => {
  beforeAll(async () => {
    server = await createServer()
    await server.initialize()

    server.route({
      method: 'GET',
      path: '/test-boom',
      options: { auth: false },
      handler: () => {
        throw new Error('Something went wrong')
      }
    })
  })

  afterAll(async () => {
    await server.stop()
  })

  test('should render the 404 view for an unknown route', async () => {
    const response = await server.inject({ url: '/does-not-exist' })
    expect(response.statusCode).toBe(HTTP_STATUS_NOT_FOUND)
    expect(response.request.response.source.template).toBe('404')
    expect(response.payload).toContain('Page not found')
  })

  test('should render the 500 view for an unhandled error', async () => {
    const response = await server.inject({ url: '/test-boom' })
    expect(response.statusCode).toBe(HTTP_STATUS_INTERNAL_SERVER_ERROR)
    expect(response.request.response.source.template).toBe('500')
    expect(response.payload).toContain('Sorry, there is a problem with the service')
  })
})
