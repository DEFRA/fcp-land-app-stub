import { getOrganisationFromRelationships } from '../../../src/auth/get-organisation-from-relationships.js'

describe('getOrganisationFromRelationships', () => {
  test('should return the sbi and name for the matching organisation', () => {
    const relationships = ['5900001:110100101:Farms Ltd:1:External:0']
    const result = getOrganisationFromRelationships('5900001', relationships)
    expect(result).toEqual({ sbi: '110100101', name: 'Farms Ltd' })
  })

  test('should pick the matching entry out of a cumulative multi-organisation array', () => {
    const relationships = [
      '5900001:110100101:Farms Ltd:1:External:0',
      '5900002:110100102:Andrew Farmer:1:External:0'
    ]
    const result = getOrganisationFromRelationships('5900002', relationships)
    expect(result).toEqual({ sbi: '110100102', name: 'Andrew Farmer' })
  })

  test('should keep a colon in the organisation name intact', () => {
    const relationships = ['5900001:110100101:Acme: Holdings Ltd:1:External:0']
    const result = getOrganisationFromRelationships('5900001', relationships)
    expect(result).toEqual({ sbi: '110100101', name: 'Acme: Holdings Ltd' })
  })

  test('should return null when no entry matches the organisation id', () => {
    const relationships = ['5900001:110100101:Farms Ltd:1:External:0']
    const result = getOrganisationFromRelationships('9999999', relationships)
    expect(result).toBeNull()
  })

  test('should return null for an empty array', () => {
    const result = getOrganisationFromRelationships('5900001', [])
    expect(result).toBeNull()
  })
})
