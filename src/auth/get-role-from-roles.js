/**
 * Get the role name for the currently selected organisation from the token's roles
 * claim.
 *
 * Each entry is in the format "organisationId:roleName:status", where status is a
 * Defra Identity enrolment status: 1 pending, 2 pending verification,
 * 3 complete/approved, 4 complete/rejected, 5 pending appeal, 6 removed, 7 locked.
 * Only 3 grants access, but the role name here is purely informational (Land App
 * authorisation is driven entirely by the scope built from permission groups), so
 * this deliberately does not filter on status - doing so would silently turn a
 * valid display value into null.
 *
 * As with relationships, roles accumulate across organisation switches within a
 * sign-in session, so matching on organisationId is required.
 *
 * @param {string} organisationId - The currently selected organisation id (the
 * token's currentRelationshipId).
 * @param {Array<string>} roles - The token's roles claim.
 *
 * @returns {string | null} The matching role name, or null if none is found.
 */
function getRoleFromRoles (organisationId, roles) {
  for (const role of roles) {
    const [orgId, roleName] = role.split(':')

    if (organisationId === orgId) {
      return roleName
    }
  }

  return null
}

export { getRoleFromRoles }
