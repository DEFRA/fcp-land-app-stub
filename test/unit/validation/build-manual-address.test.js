import { buildManualAddress } from '../../../src/validation/build-manual-address.js'

describe('buildManualAddress', () => {
  test('should map the manual entry fields to the DAL address shape', () => {
    const result = buildManualAddress({
      line1: '14 Example Drive',
      line2: 'Westbury Park',
      line3: 'Exampletown',
      city: 'Exampletown',
      county: 'Examplesire',
      postalCode: 'AB1 2CD',
      country: 'United Kingdom'
    })

    expect(result).toEqual({
      pafOrganisationName: null,
      buildingNumberRange: null,
      buildingName: null,
      flatName: null,
      street: null,
      dependentLocality: null,
      doubleDependentLocality: null,
      county: null,
      uprn: null,
      line1: '14 Example Drive',
      line2: 'Westbury Park',
      line3: 'Exampletown',
      line4: 'Examplesire',
      line5: null,
      city: 'Exampletown',
      postalCode: 'AB1 2CD',
      country: 'United Kingdom'
    })
  })

  test('should null optional fields left blank', () => {
    const result = buildManualAddress({
      line1: '14 Example Drive',
      line2: '',
      line3: '',
      city: 'Exampletown',
      county: '',
      postalCode: 'AB1 2CD',
      country: 'United Kingdom'
    })

    expect(result.line2).toBeNull()
    expect(result.line3).toBeNull()
    expect(result.line4).toBeNull()
  })
})
