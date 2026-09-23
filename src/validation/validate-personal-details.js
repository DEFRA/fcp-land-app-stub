import { personalNameSchema } from './personal/personal-name-schema.js'
import { personalDobSchema } from './personal/personal-dob-schema.js'
import { personalPhoneSchema } from './personal/personal-phone-schema.js'
import { personalEmailSchema } from './personal/personal-email-schema.js'
import { addressSchema } from './shared/address-schema.js'

const schemas = [personalNameSchema, personalDobSchema, personalPhoneSchema, personalEmailSchema, addressSchema]

// Validates each schema independently (not combined into one Joi schema) so that
// custom validation logic - like the date of birth schema's real-date check - always
// runs, even when another section of the payload is also invalid. Used both to check
// the currently stored data on GET, and to validate the submitted form on POST.
export function validatePersonalDetails (payload) {
  const errors = []

  for (const schema of schemas) {
    const { error } = schema.validate(payload, { abortEarly: false, allowUnknown: true })

    if (error) {
      errors.push(...error.details)
    }
  }

  return { isValid: errors.length === 0, errors }
}
