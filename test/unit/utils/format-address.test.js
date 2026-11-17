import { formatDisplayAddress, formatOriginalAddress } from '../../../src/utils/format-address.js'

const manualAddress = {
  line1: 'Example Farm',
  line2: '14 Example Drive',
  line3: 'Exampleton',
  line4: 'Examplesire',
  line5: null,
  city: 'Exampletown',
  postalCode: 'AB1 2CD',
  country: 'United Kingdom',
  uprn: null
}

const lookupAddress = {
  pafOrganisationName: 'Farms Ltd',
  flatName: null,
  buildingName: 'Example Barn',
  buildingNumberRange: '1',
  street: 'Example Lane',
  doubleDependentLocality: null,
  dependentLocality: 'Exampleton',
  county: 'Examplesire',
  city: 'Exampletown',
  postalCode: 'AB1 2CD',
  country: 'United Kingdom',
  // Line fields are ignored when there is a UPRN
  line1: 'ignored',
  line4: 'ZZ9 9ZZ',
  uprn: '100012345678'
}

describe('formatDisplayAddress', () => {
  test('should show manual lines, city, county (line4), postcode and country in that order', () => {
    expect(formatDisplayAddress(manualAddress)).toEqual([
      'Example Farm', '14 Example Drive', 'Exampleton', 'Exampletown', 'Examplesire', 'AB1 2CD', 'United Kingdom'
    ])
  })

  test('should show the lookup fields, not the lines, when there is a UPRN', () => {
    expect(formatDisplayAddress(lookupAddress)).toEqual([
      'Farms Ltd', 'Example Barn', '1 Example Lane', 'Exampleton', 'Exampletown', 'Examplesire', 'AB1 2CD', 'United Kingdom'
    ])
  })

  test('should return no lines when there is neither a UPRN nor a first line', () => {
    expect(formatDisplayAddress({ ...manualAddress, line1: null })).toEqual([])
  })

  test.each([null, undefined])('should return no lines when the address is %s', (address) => {
    expect(formatDisplayAddress(address)).toEqual([])
  })
})

describe('formatOriginalAddress', () => {
  test('should map a manual address onto the form fields, with line4 as the county', () => {
    expect(formatOriginalAddress(manualAddress)).toEqual({
      line1: 'Example Farm',
      line2: '14 Example Drive',
      line3: 'Exampleton',
      county: 'Examplesire',
      city: 'Exampletown',
      postalCode: 'AB1 2CD',
      country: 'United Kingdom'
    })
  })

  test('should flatten a lookup address into the form fields when there is a UPRN', () => {
    expect(formatOriginalAddress(lookupAddress)).toEqual({
      line1: 'Farms Ltd, Example Barn',
      line2: '1 Example Lane',
      line3: 'Exampleton',
      county: 'Examplesire',
      city: 'Exampletown',
      postalCode: 'AB1 2CD',
      country: 'United Kingdom'
    })
  })

  test('should return empty fields when the address is null', () => {
    expect(formatOriginalAddress(null)).toEqual({
      line1: '', line2: '', line3: '', county: '', city: '', postalCode: '', country: ''
    })
  })
})
