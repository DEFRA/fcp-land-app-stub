import { Joi } from '../joi.js'

export const businessVatSchema = Joi.object({
  vatNumber: Joi.string()
    .trim()
    .pattern(/^\d{9}$/)
    .allow('')
    .optional()
    .messages({
      'string.pattern.base': 'Enter a VAT registration number, like 123456789',
      'string.noControlChars': 'VAT registration number must not contain invalid characters'
    })
})
