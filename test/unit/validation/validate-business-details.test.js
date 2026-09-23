import { validateBusinessDetails } from '../../../src/validation/validate-business-details.js'

const validPayload = {
  businessName: 'Henderson Family Farms',
  businessTelephone: '01144960123',
  businessMobile: '',
  businessEmail: 'contact@hendersonfamilyfarms.example.com',
  vatNumber: '123456789',
  line1: '1 Farm Lane',
  line2: '',
  line3: '',
  city: 'Sheffield',
  county: '',
  postalCode: 'AB1 2CD',
  country: 'United Kingdom'
}

describe('validateBusinessDetails', () => {
  test('should pass for a fully valid payload', () => {
    const { isValid, errors } = validateBusinessDetails(validPayload)
    expect(isValid).toBe(true)
    expect(errors).toEqual([])
  })

  test('should pass when the optional VAT number is blank', () => {
    const { isValid } = validateBusinessDetails({ ...validPayload, vatNumber: '' })
    expect(isValid).toBe(true)
  })

  test('should fail when the business name is missing', () => {
    const { isValid, errors } = validateBusinessDetails({ ...validPayload, businessName: '' })
    expect(isValid).toBe(false)
    expect(errors.some((error) => error.path[0] === 'businessName')).toBe(true)
  })

  test('should fail when the VAT number is not 9 digits', () => {
    const { isValid } = validateBusinessDetails({ ...validPayload, vatNumber: '123' })
    expect(isValid).toBe(false)
  })

  test('should fail when neither phone number is provided', () => {
    const { isValid, errors } = validateBusinessDetails({ ...validPayload, businessTelephone: '', businessMobile: '' })
    expect(isValid).toBe(false)
    expect(errors.some((error) => error.type === 'object.missing')).toBe(true)
  })

  test('should fail when the address is missing required fields', () => {
    const { isValid, errors } = validateBusinessDetails({ ...validPayload, line1: '', city: '', postalCode: '', country: '' })
    expect(isValid).toBe(false)
    expect(errors.some((error) => error.path[0] === 'line1')).toBe(true)
  })
})
