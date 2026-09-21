/**
 * Get the SBI and organisation name for the currently selected organisation from
 * the token's relationships claim.
 *
 * Each entry is in the format
 * "organisationId:sbi:organisationName:organisationLoa:relationship:relationshipLoa".
 * A user can change their "active" organisation during a sign-in session, so the
 * array can hold entries for organisations other than the one currently selected -
 * matching on organisationId is required, not just a defensive check.
 *
 * @param {string} organisationId - The currently selected organisation id (the
 * token's currentRelationshipId).
 * @param {Array<string>} relationships - The token's relationships claim.
 *
 * @returns {{ sbi: string, name: string } | null} The matching organisation, or
 * null if none is found.
 */
// A relationship entry always ends with organisationLoa:relationship:relationshipLoa
const TRAILING_FIELD_COUNT = 3

function getOrganisationFromRelationships (organisationId, relationships) {
  for (const relationship of relationships) {
    const parts = relationship.split(':')
    const [orgId, sbi] = parts

    if (organisationId === orgId) {
      // Organisation names can themselves contain a colon (eg "Acme: Holdings Ltd"),
      // so the name is taken from the middle of the entry by counting in from both
      // ends rather than reading a fixed index
      const name = parts.slice(2, -TRAILING_FIELD_COUNT).join(':')
      return { sbi, name }
    }
  }

  return null
}

export { getOrganisationFromRelationships }
