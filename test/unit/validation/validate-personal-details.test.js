import { validatePersonalDetails } from '../../../src/validation/validate-personal-details.js'

const validPayload = {
  first: 'James',
  middle: 'Alan',
  last: 'Henderson',
  day: '17',
  month: '4',
  year: '1972',
  personalTelephone: '01144960123',
  personalMobile: '',
  personalEmail: 'james.henderson@example.com',
  line1: '14 Oakwood Drive',
  line2: '',
  line3: '',
  city: 'Sheffield',
  county: '',
  postalCode: 'S10 2GH',
  country: 'United Kingdom'
}

describe('validatePersonalDetails', () => {
  test('should pass for a fully valid payload', () => {
    const { isValid, errors } = validatePersonalDetails(validPayload)
    expect(isValid).toBe(true)
    expect(errors).toEqual([])
  })

  test('should fail when the first name is missing', () => {
    const { isValid, errors } = validatePersonalDetails({ ...validPayload, first: '' })
    expect(isValid).toBe(false)
    expect(errors.some((error) => error.path[0] === 'first')).toBe(true)
  })

  test('should fail when the date of birth is not a real date', () => {
    const { isValid, errors } = validatePersonalDetails({ ...validPayload, day: '31', month: '2' })
    expect(isValid).toBe(false)
    expect(errors.some((error) => error.path.includes('day'))).toBe(true)
  })

  test('should fail when the date of birth is in the future', () => {
    const nextYear = String(new Date().getUTCFullYear() + 1)
    const { isValid } = validatePersonalDetails({ ...validPayload, year: nextYear })
    expect(isValid).toBe(false)
  })

  test('should fail when neither phone number is provided', () => {
    const { isValid, errors } = validatePersonalDetails({ ...validPayload, personalTelephone: '', personalMobile: '' })
    expect(isValid).toBe(false)
    expect(errors.some((error) => error.type === 'object.missing')).toBe(true)
  })

  test('should fail when the email address is invalid', () => {
    const { isValid } = validatePersonalDetails({ ...validPayload, personalEmail: 'not-an-email' })
    expect(isValid).toBe(false)
  })

  test('should fail when the address is missing required fields', () => {
    const { isValid, errors } = validatePersonalDetails({ ...validPayload, line1: '', city: '', postalCode: '', country: '' })
    expect(isValid).toBe(false)
    expect(errors.some((error) => error.path[0] === 'line1')).toBe(true)
  })
})
