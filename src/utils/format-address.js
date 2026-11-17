// An address from the external API holds two alternative sets of fields. A UPRN means
// it was picked from a postcode lookup, so the lookup fields (pafOrganisationName,
// buildingNumberRange, street and so on) are populated. Without one it was entered
// manually into line1-line5, where line4 holds the county and line5 is unused.
// city, postalCode and country apply to both. These helpers mirror the presenters in
// fcp-sfd-frontend-engine, which Defra's own services use to read the same data.

const join = (parts, separator) => parts.filter(Boolean).join(separator)
const text = (value) => value ?? ''

const hasContent = (address) => Boolean(address?.uprn || address?.line1)

const lookupLines = (address) => [
  address.pafOrganisationName,
  address.flatName,
  address.buildingName,
  join([address.buildingNumberRange, address.street], ' '),
  address.doubleDependentLocality,
  address.dependentLocality,
  address.city,
  address.county
]

const manualLines = (address) => [
  address.line1,
  address.line2,
  address.line3,
  address.city,
  address.line4,
  address.line5
]

// Returns the lines to display, or an empty array if the address has no content
export function formatDisplayAddress (address) {
  if (!hasContent(address)) {
    return []
  }

  const lines = address.uprn ? lookupLines(address) : manualLines(address)

  return [...lines, address.postalCode, address.country].filter(Boolean)
}

const lookupFormFields = (address) => ({
  line1: join([address.pafOrganisationName, address.flatName, address.buildingName], ', '),
  line2: join([address.buildingNumberRange, address.street], ' '),
  line3: join([address.doubleDependentLocality, address.dependentLocality], ', '),
  county: text(address.county)
})

const manualFormFields = (address) => ({
  line1: text(address.line1),
  line2: text(address.line2),
  line3: text(address.line3),
  county: text(address.line4)
})

// Maps an address onto the manual address form fields, flattening a lookup address
// into lines so it can be edited and saved back as a manual one
export function formatOriginalAddress (address) {
  address ??= {}

  return {
    ...(address.uprn ? lookupFormFields(address) : manualFormFields(address)),
    city: text(address.city),
    postalCode: text(address.postalCode),
    country: text(address.country)
  }
}
