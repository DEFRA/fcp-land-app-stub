// An address from the external API holds two alternative sets of fields. A UPRN means
// it was picked from a postcode lookup, so the lookup fields (pafOrganisationName,
// buildingNumberRange, street and so on) are populated. Without one it was entered
// manually into line1-line5, where line4 holds the county and line5 is unused.
// city, postalCode and country apply to both. These helpers mirror the presenters in
// fcp-sfd-frontend-engine, which Defra's own services use to read the same data.

const joinParts = (parts, separator) => parts.filter(Boolean).join(separator) || null

// Returns the lines to display, or an empty array if the address has no content
export function formatDisplayAddress (address) {
  if (!address?.uprn && !address?.line1) {
    return []
  }

  const lines = address.uprn
    ? [
        address.pafOrganisationName,
        address.flatName,
        address.buildingName,
        joinParts([address.buildingNumberRange, address.street], ' '),
        address.doubleDependentLocality,
        address.dependentLocality,
        address.city,
        address.county
      ]
    : [
        address.line1,
        address.line2,
        address.line3,
        address.city,
        address.line4,
        address.line5
      ]

  return [...lines, address.postalCode, address.country].filter(Boolean)
}

// Maps an address onto the manual address form fields, flattening a lookup address
// into lines so it can be edited and saved back as a manual one
export function formatOriginalAddress (address) {
  address ??= {}

  const shared = {
    city: address.city ?? '',
    postalCode: address.postalCode ?? '',
    country: address.country ?? ''
  }

  if (address.uprn) {
    return {
      line1: joinParts([address.pafOrganisationName, address.flatName, address.buildingName], ', ') ?? '',
      line2: joinParts([address.buildingNumberRange, address.street], ' ') ?? '',
      line3: joinParts([address.doubleDependentLocality, address.dependentLocality], ', ') ?? '',
      county: address.county ?? '',
      ...shared
    }
  }

  return {
    line1: address.line1 ?? '',
    line2: address.line2 ?? '',
    line3: address.line3 ?? '',
    county: address.line4 ?? '',
    ...shared
  }
}
