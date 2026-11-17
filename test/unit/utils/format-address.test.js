import { formatDisplayAddress, formatOriginalAddress } from '../../../src/utils/format-address.js'

const manualAddress = {
  line1: 'Oak Farm',
  line2: '14 Oakwood Drive',
  line3: 'Crookes',
  line4: 'South Yorkshire',
  line5: null,
  city: 'Sheffield',
  postalCode: 'S10 2GH',
  country: 'United Kingdom',
  uprn: null
}

const lookupAddress = {
  pafOrganisationName: 'Farms Ltd',
  flatName: null,
  buildingName: 'Oak Barn',
  buildingNumberRange: '1',
  street: 'Farm Lane',
  doubleDependentLocality: null,
  dependentLocality: 'Crookes',
  county: 'South Yorkshire',
  city: 'Sheffield',
  postalCode: 'S10 2GH',
  country: 'United Kingdom',
  // Line fields are ignored when there is a UPRN
  line1: 'ignored',
  line4: 'IG1 1NO',
  uprn: '100012345678'
}

describe('formatDisplayAddress', () => {
  test('should show manual lines, city, county (line4), postcode and country in that order', () => {
    expect(formatDisplayAddress(manualAddress)).toEqual([
      'Oak Farm', '14 Oakwood Drive', 'Crookes', 'Sheffield', 'South Yorkshire', 'S10 2GH', 'United Kingdom'
    ])
  })

  test('should show the lookup fields, not the lines, when there is a UPRN', () => {
    expect(formatDisplayAddress(lookupAddress)).toEqual([
      'Farms Ltd', 'Oak Barn', '1 Farm Lane', 'Crookes', 'Sheffield', 'South Yorkshire', 'S10 2GH', 'United Kingdom'
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
      line1: 'Oak Farm',
      line2: '14 Oakwood Drive',
      line3: 'Crookes',
      county: 'South Yorkshire',
      city: 'Sheffield',
      postalCode: 'S10 2GH',
      country: 'United Kingdom'
    })
  })

  test('should flatten a lookup address into the form fields when there is a UPRN', () => {
    expect(formatOriginalAddress(lookupAddress)).toEqual({
      line1: 'Farms Ltd, Oak Barn',
      line2: '1 Farm Lane',
      line3: 'Crookes',
      county: 'South Yorkshire',
      city: 'Sheffield',
      postalCode: 'S10 2GH',
      country: 'United Kingdom'
    })
  })

  test('should return empty fields when the address is null', () => {
    expect(formatOriginalAddress(null)).toEqual({
      line1: '', line2: '', line3: '', county: '', city: '', postalCode: '', country: ''
    })
  })
})
