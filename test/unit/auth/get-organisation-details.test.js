import { getOrganisationDetails } from '../../../src/auth/get-organisation-details.js'

describe('getOrganisationDetails', () => {
  test('should return the sbi, organisation name and role for the matching organisation', () => {
    const relationships = ['5900001:110100101:Farms Ltd:1:External:0']
    const roles = ['5900001:Agent:3']
    const result = getOrganisationDetails('5900001', relationships, roles)
    expect(result).toEqual({ sbi: '110100101', organisationName: 'Farms Ltd', role: 'Agent' })
  })

  test('should pick the matching entry out of a cumulative multi-organisation array', () => {
    const relationships = [
      '5900001:110100101:Farms Ltd:1:External:0',
      '5900002:110100102:Andrew Farmer:1:External:0'
    ]
    const roles = ['5900001:Agent:3', '5900002:Agent:3']
    const result = getOrganisationDetails('5900002', relationships, roles)
    expect(result).toEqual({ sbi: '110100102', organisationName: 'Andrew Farmer', role: 'Agent' })
  })

  test('should keep a colon in the organisation name intact', () => {
    const relationships = ['5900001:110100101:Acme: Holdings Ltd:1:External:0']
    const result = getOrganisationDetails('5900001', relationships, [])
    expect(result.organisationName).toBe('Acme: Holdings Ltd')
  })

  test('should still return the role name when the enrolment status is not approved', () => {
    const roles = ['5900001:Agent:6']
    const result = getOrganisationDetails('5900001', [], roles)
    expect(result.role).toBe('Agent')
  })

  test('should return nulls when no relationship matches the organisation id', () => {
    const relationships = ['5900001:110100101:Farms Ltd:1:External:0']
    const result = getOrganisationDetails('9999999', relationships, [])
    expect(result).toEqual({ sbi: null, organisationName: null, role: null })
  })

  test('should return a null role when no role matches the organisation id', () => {
    const relationships = ['5900001:110100101:Farms Ltd:1:External:0']
    const roles = ['9999999:Agent:3']
    const result = getOrganisationDetails('5900001', relationships, roles)
    expect(result.role).toBeNull()
  })

  test('should return nulls for empty arrays', () => {
    const result = getOrganisationDetails('5900001', [], [])
    expect(result).toEqual({ sbi: null, organisationName: null, role: null })
  })
})
