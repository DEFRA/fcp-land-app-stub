/**
 * Find the entry for a given organisation in a colon-delimited token claim (eg
 * relationships or roles).
 *
 * Claims like this accumulate one entry per organisation visited during a sign-in
 * session, so matching on organisationId is required rather than taking the first
 * entry.
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
