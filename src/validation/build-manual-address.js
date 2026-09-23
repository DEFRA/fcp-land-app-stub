// Builds a manual (non-lookup) DAL address input from our edit form's field names.
// Mirrors fcp-sfd-frontend-engine's buildManualAddress mapping exactly: lookup-only
// fields are always null, and the form's "county" value is written into the DAL's
// line4 field rather than its own county field (the DAL's county field is unused
// for manual entry).
export function buildManualAddress (form) {
  return {
    pafOrganisationName: null,
    buildingNumberRange: null,
    buildingName: null,
    flatName: null,
    street: null,
    dependentLocality: null,
    doubleDependentLocality: null,
    county: null,
    uprn: null,
    line1: form.line1,
    line2: form.line2 || null,
    line3: form.line3 || null,
    line4: form.county || null,
    line5: null,
    city: form.city,
    postalCode: form.postalCode,
    country: form.country
  }
}
