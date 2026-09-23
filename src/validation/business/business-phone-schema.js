import { Joi } from '../joi.js'
import {
  PHONE_NUMBER_MIN,
  PHONE_NUMBER_MAX
} from '../../constants/validation-fields.js'
import { PHONE_NUMBER_PATTERN } from '../../constants/patterns.js'

export const businessPhoneSchema = Joi.object({
  businessTelephone: Joi.string()
    .trim()
    .empty('')
    .min(PHONE_NUMBER_MIN)
    .max(PHONE_NUMBER_MAX)
    .pattern(PHONE_NUMBER_PATTERN)
    .messages({
      'string.min': `Business telephone number must be ${PHONE_NUMBER_MIN} characters or more`,
      'string.max': `Business telephone number must be ${PHONE_NUMBER_MAX} characters or less`,
      'string.pattern.base': 'Business telephone number must only include numbers 0 to 9 and special characters such as spaces, brackets and +',
      'string.noControlChars': 'Business telephone number must not contain invalid characters'
    }),
  businessMobile: Joi.string()
    .trim()
    .empty('')
    .min(PHONE_NUMBER_MIN)
    .max(PHONE_NUMBER_MAX)
    .pattern(PHONE_NUMBER_PATTERN)
    .messages({
      'string.min': `Business mobile phone number must be ${PHONE_NUMBER_MIN} characters or more`,
      'string.max': `Business mobile phone number must be ${PHONE_NUMBER_MAX} characters or less`,
      'string.pattern.base': 'Business mobile phone number must only include numbers 0 to 9 and special characters such as spaces, brackets and +',
      'string.noControlChars': 'Business mobile phone number must not contain invalid characters'
    })
})
  .or('businessTelephone', 'businessMobile')
  .messages({
    'object.missing': 'Enter at least one phone number'
  })
