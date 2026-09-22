// Every field a resolver might need from the external API for a signed-in user's
// selected organisation. Adding a field here is free; the schema encourages
// requesting a superset and picking only what a given caller needs.
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
