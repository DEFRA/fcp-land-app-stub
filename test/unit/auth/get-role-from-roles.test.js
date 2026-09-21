import { getRoleFromRoles } from '../../../src/auth/get-role-from-roles.js'

describe('getRoleFromRoles', () => {
  test('should return the role name for the matching organisation', () => {
    const roles = ['5900001:Agent:3']
    const result = getRoleFromRoles('5900001', roles)
    expect(result).toBe('Agent')
  })

  test('should pick the matching entry out of a cumulative multi-organisation array', () => {
    const roles = ['5900001:Agent:3', '5900002:Agent:3']
    const result = getRoleFromRoles('5900002', roles)
    expect(result).toBe('Agent')
  })

  test('should return null when no entry matches the organisation id', () => {
    const roles = ['5900001:Agent:3']
    const result = getRoleFromRoles('9999999', roles)
    expect(result).toBeNull()
  })

  test('should return null for an empty array', () => {
    const result = getRoleFromRoles('5900001', [])
    expect(result).toBeNull()
  })

  test('should still return the role name when the enrolment status is not approved', () => {
    const roles = ['5900001:Agent:6']
    const result = getRoleFromRoles('5900001', roles)
    expect(result).toBe('Agent')
  })
})
