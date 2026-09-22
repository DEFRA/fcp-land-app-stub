import { findClaimForOrganisation } from './find-claim-for-organisation.js'

/**
 * Get the SBI and organisation name for the currently selected organisation from
 * the token's relationships claim.
 *
 * Each entry is in the format
 * "organisationId:sbi:organisationName:organisationLoa:relationship:relationshipLoa".
 */
const TRAILING_FIELD_COUNT = 3

function getOrganisationFromRelationships (organisationId, relationships) {
  const parts = findClaimForOrganisation(organisationId, relationships)

  if (!parts) {
    return null
  }

  const [, sbi] = parts
  // Organisation names can themselves contain a colon (eg "Acme: Holdings Ltd"),
  // so the name is taken from the middle of the entry by counting in from both
  // ends rather than reading a fixed index
  const organisationName = parts.slice(2, -TRAILING_FIELD_COUNT).join(':')

  return { sbi, organisationName }
}

export { getOrganisationFromRelationships }
