import { Joi } from '../joi.js'
import { EMAIL_MAX } from '../../constants/validation-fields.js'

export const personalEmailSchema = Joi.object({
  personalEmail: Joi.string()
    .required()
    .max(EMAIL_MAX)
    .email({
      minDomainSegments: 2,
      tlds: {
        allow: true,
        min: 2
      }
    })
    .messages({
      'string.max': `Email address must be ${EMAIL_MAX} characters or less`,
      'string.empty': 'Enter a personal email address',
      'string.email': 'Enter an email address, like name@example.com',
      'string.noControlChars': 'Personal email address must not contain invalid characters'
    })
})
