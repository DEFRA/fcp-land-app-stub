// The form uses the external API's address field names, so values map across one to one
const ADDRESS_FIELDS = ['line1', 'line2', 'line3', 'city', 'county', 'postalCode', 'country']

// The API returns the fields in display order
export function toAddressLines (address) {
  return ADDRESS_FIELDS.map((field) => address?.[field]).filter(Boolean)
}

export function toAddressFormValues (address) {
  return Object.fromEntries(ADDRESS_FIELDS.map((field) => [field, address?.[field] ?? '']))
}

export function toAddressInput (payload) {
  return Object.fromEntries(ADDRESS_FIELDS.map((field) => [field, payload[field] || null]))
}
