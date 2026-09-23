import BaseJoi from 'joi'
import { NO_CONTROL_CHARS_PATTERN } from '../constants/patterns.js'

// Extends Joi's string type so every Joi.string() automatically rejects ASCII control
// characters (0x00–0x1f and 0x7f), which have no valid use in text input fields. Using a
// dedicated 'string.noControlChars' error keeps it distinct from the generic pattern rule
// used by numeric and phone fields. Fields may override the message via their own .messages().
export const Joi = BaseJoi.extend((joi) => ({
  type: 'string',
  base: joi.string(),
  messages: {
    'string.noControlChars': 'Field must not contain invalid characters'
  },
  validate (value, helpers) {
    if (typeof value === 'string' && !NO_CONTROL_CHARS_PATTERN.test(value)) {
      return { value, errors: helpers.error('string.noControlChars') }
    }

    return { value }
  }
}))
