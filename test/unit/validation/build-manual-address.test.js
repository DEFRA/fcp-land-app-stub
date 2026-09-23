import { buildManualAddress } from '../../../src/validation/build-manual-address.js'

describe('buildManualAddress', () => {
  test('should map the manual entry fields to the DAL address shape', () => {
    const result = buildManualAddress({
      line1: '14 Oakwood Drive',
      line2: 'Westbury Park',
      line3: 'Sheffield',
      city: 'Sheffield',
      county: 'South Yorkshire',
      postalCode: 'S10 2GH',
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
      line1: '14 Oakwood Drive',
      line2: 'Westbury Park',
      line3: 'Sheffield',
      line4: 'South Yorkshire',
      line5: null,
      city: 'Sheffield',
      postalCode: 'S10 2GH',
      country: 'United Kingdom'
    })
  })

  test('should null optional fields left blank', () => {
    const result = buildManualAddress({
      line1: '14 Oakwood Drive',
      line2: '',
      line3: '',
      city: 'Sheffield',
      county: '',
      postalCode: 'S10 2GH',
      country: 'United Kingdom'
    })

    expect(result.line2).toBeNull()
    expect(result.line3).toBeNull()
    expect(result.line4).toBeNull()
  })
})
