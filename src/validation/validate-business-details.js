import { businessNameSchema } from './business/business-name-schema.js'
import { businessPhoneSchema } from './business/business-phone-schema.js'
import { businessEmailSchema } from './business/business-email-schema.js'
import { businessVatSchema } from './business/business-vat-schema.js'
import { addressSchema } from './shared/address-schema.js'

const schemas = [businessNameSchema, businessPhoneSchema, businessEmailSchema, businessVatSchema, addressSchema]

// Validates each schema independently (not combined into one Joi schema) - same
// technique as validatePersonalDetails. Used both to check the currently stored data
// on GET, and to validate the submitted form on POST.
export function validateBusinessDetails (payload) {
  const errors = []

  for (const schema of schemas) {
    const { error } = schema.validate(payload, { abortEarly: false, allowUnknown: true })

    if (error) {
      errors.push(...error.details)
    }
  }

  return { isValid: errors.length === 0, errors }
}
