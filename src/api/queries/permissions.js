const permissionsQuery = `
query Permissions($sbi: ID!, $crn: ID!) {
  business(sbi: $sbi) {
    sbi
    customer(crn: $crn) {
      crn
      permissionGroups {
        id
        level
      }
    }
  }
}
`

export { permissionsQuery }
