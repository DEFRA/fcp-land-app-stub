import { Joi } from '../joi.js'
import { EMAIL_MAX } from '../../constants/validation-fields.js'

export const businessEmailSchema = Joi.object({
  businessEmail: Joi.string()
    .required()
    .max(EMAIL_MAX)
    .email({
      minDomainSegments: 2,
      tlds: {
        allow: true
      }
    })
    .messages({
      'string.max': `Business email address must be ${EMAIL_MAX} characters or less`,
      'string.empty': 'Enter business email address',
      'string.email': 'Enter an email address, like name@example.com',
      'string.noControlChars': 'Business email address must not contain invalid characters'
    })
})
