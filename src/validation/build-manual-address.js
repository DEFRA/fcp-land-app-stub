// Builds a manual (non-lookup) address input from the edit form's field names, the same
// way Defra's own services do so records look alike whoever edits them: lookup-only
// fields are always null, and the form's "county" value is written into line4 rather
// than the county field (which is unused for manual entry).
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
