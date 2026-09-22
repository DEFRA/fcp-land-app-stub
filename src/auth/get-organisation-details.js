import { findClaimForOrganisation } from './find-claim-for-organisation.js'

// A relationship entry always ends with organisationLoa:relationship:relationshipLoa
const TRAILING_FIELD_COUNT = 3

/**
 * Get the SBI, organisation name and role for the currently selected organisation
 * from the token's relationships and roles claims.
 *
 * A relationships entry is in the format
 * "organisationId:sbi:organisationName:organisationLoa:relationship:relationshipLoa".
 * A roles entry is in the format "organisationId:roleName:status", where status is
 * a Defra Identity enrolment status: 1 pending, 2 pending verification,
 * 3 complete/approved, 4 complete/rejected, 5 pending appeal, 6 removed, 7 locked.
 * Only 3 grants access, but the role name here is purely informational (Land App
 * authorisation is driven entirely by the scope built from permission groups), so
 * this deliberately does not filter on status - doing so would silently turn a
 * valid display value into null.
 */
function getOrganisationDetails (organisationId, relationships, roles) {
  const relationship = findClaimForOrganisation(organisationId, relationships)
  const role = findClaimForOrganisation(organisationId, roles)

  if (!relationship) {
    return { sbi: null, organisationName: null, role: role ? role[1] : null }
  }

  const [, sbi] = relationship
  // Organisation names can themselves contain a colon (eg "Acme: Holdings Ltd"),
  // so the name is taken from the middle of the entry by counting in from both
  // ends rather than reading a fixed index
  const organisationName = relationship.slice(2, -TRAILING_FIELD_COUNT).join(':')

  return { sbi, organisationName, role: role ? role[1] : null }
}

export { getOrganisationDetails }
