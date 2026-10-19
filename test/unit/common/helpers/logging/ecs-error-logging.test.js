import { Writable } from 'node:stream'
import { pino } from 'pino'
import { ecsFormat } from '@elastic/ecs-pino-format'

// Guards the convention used when logging failures: CDP expects the ECS error.type,
// error.message and error.stack_trace fields, which are only produced for the `err` key.
function logWith (fields) {
  let output = ''
  const stream = new Writable({
    write (chunk, _encoding, callback) {
      output += chunk
      callback()
    }
  })
  const logger = pino({ ...ecsFormat(), nesting: true }, stream)

  logger.warn(fields, 'Failed to get personal details from the external API')

  return JSON.parse(output)
}

describe('ECS error logging', () => {
  test('should output the ECS error fields when the error is logged under err', () => {
    const entry = logWith({ err: new Error('External API request failed'), crn: '1102634220' })

    expect(entry.error).toEqual({
      type: 'Error',
      message: 'External API request failed',
      stack_trace: expect.stringContaining('External API request failed')
    })
    expect(entry.crn).toBe('1102634220')
  })

  test('should lose the error details when the error is logged under error', () => {
    const entry = logWith({ error: new Error('External API request failed') })

    expect(entry.error).toEqual({})
  })
})
