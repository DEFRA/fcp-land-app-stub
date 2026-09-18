import { getTrustStoreCerts } from '../../../../src/common/helpers/secure-context/get-trust-store-certs.js'

describe('getTrustStoreCerts', () => {
  test('should return decoded certs for TRUSTSTORE_ prefixed variables', () => {
    const cert = '-----BEGIN CERTIFICATE-----\nabc\n-----END CERTIFICATE-----'
    const result = getTrustStoreCerts({
      TRUSTSTORE_ONE: Buffer.from(cert).toString('base64')
    })
    expect(result).toEqual([cert])
  })

  test('should ignore variables without the TRUSTSTORE_ prefix', () => {
    const result = getTrustStoreCerts({
      NOT_A_CERT: Buffer.from('nope').toString('base64')
    })
    expect(result).toEqual([])
  })

  test('should ignore empty TRUSTSTORE_ variables', () => {
    const result = getTrustStoreCerts({ TRUSTSTORE_EMPTY: '' })
    expect(result).toEqual([])
  })

  test('should return an empty array when there are no variables', () => {
    expect(getTrustStoreCerts({})).toEqual([])
  })
})
