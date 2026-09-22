import { findClaimForOrganisation } from '../../../src/auth/find-claim-for-organisation.js'

describe('findClaimForOrganisation', () => {
  test('should return the matching entry split on colons', () => {
    const claim = ['5900001:110100101:Farms Ltd:1:External:0']
    const result = findClaimForOrganisation('5900001', claim)
    expect(result).toEqual(['5900001', '110100101', 'Farms Ltd', '1', 'External', '0'])
  })

  test('should pick the matching entry out of a cumulative multi-organisation array', () => {
    const claim = ['5900001:Agent:3', '5900002:Agent:3']
    const result = findClaimForOrganisation('5900002', claim)
    expect(result).toEqual(['5900002', 'Agent', '3'])
  })

  test('should return null when no entry matches the organisation id', () => {
    const claim = ['5900001:Agent:3']
    const result = findClaimForOrganisation('9999999', claim)
    expect(result).toBeNull()
  })

  test('should return null for an empty array', () => {
    const result = findClaimForOrganisation('5900001', [])
    expect(result).toBeNull()
  })
})
