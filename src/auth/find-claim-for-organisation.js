/**
 * Find the entry for a given organisation in a colon-delimited token claim (eg
 * relationships or roles).
 *
 * Claims like this accumulate one entry per organisation visited during a sign-in
 * session, so matching on organisationId is required rather than taking the first
 * entry.
 *
 * @param {string} organisationId - The currently selected organisation id (the
 * token's currentRelationshipId).
 * @param {Array<string>} claim - The token claim to search, eg relationships or roles.
 *
 * @returns {Array<string> | null} The matching entry, split on ':', or null if
 * none is found.
 */
function findClaimForOrganisation (organisationId, claim) {
  for (const entry of claim) {
    const parts = entry.split(':')

    if (parts[0] === organisationId) {
      return parts
    }
  }

  return null
}

export { findClaimForOrganisation }
