import { toAddressLines, toAddressFormValues, toAddressInput } from '../../../src/utils/address.js'

const address = {
  line1: 'Example Farm',
  line2: '14 Example Drive',
  line3: null,
  city: 'Exampletown',
  county: 'Examplesire',
  postalCode: 'AB1 2CD',
  country: 'United Kingdom',
  uprn: null
}

describe('toAddressLines', () => {
  test('should return the populated fields in display order', () => {
    expect(toAddressLines(address)).toEqual([
      'Example Farm', '14 Example Drive', 'Exampletown', 'Examplesire', 'AB1 2CD', 'United Kingdom'
    ])
  })

  test('should return no lines when there is no address', () => {
    expect(toAddressLines(null)).toEqual([])
  })
})

describe('toAddressFormValues', () => {
  test('should map the address onto the form fields, with empty strings for missing values', () => {
    expect(toAddressFormValues(address)).toEqual({
      line1: 'Example Farm',
      line2: '14 Example Drive',
      line3: '',
      city: 'Exampletown',
      county: 'Examplesire',
      postalCode: 'AB1 2CD',
      country: 'United Kingdom'
    })
  })

  test('should return empty strings when there is no address', () => {
    expect(Object.values(toAddressFormValues(null))).toEqual(['', '', '', '', '', '', ''])
  })
})

describe('toAddressInput', () => {
  test('should pick the address fields from the form, sending blank optional fields as null', () => {
    const payload = { ...toAddressFormValues(address), first: 'Ignored' }

    expect(toAddressInput(payload)).toEqual({
      line1: 'Example Farm',
      line2: '14 Example Drive',
      line3: null,
      city: 'Exampletown',
      county: 'Examplesire',
      postalCode: 'AB1 2CD',
      country: 'United Kingdom'
    })
  })
})
