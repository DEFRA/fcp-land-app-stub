import { findClaimForOrganisation } from './find-claim-for-organisation.js'

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
 */
function getRoleFromRoles (organisationId, roles) {
  const parts = findClaimForOrganisation(organisationId, roles)

  return parts ? parts[1] : null
}

export { getRoleFromRoles }
