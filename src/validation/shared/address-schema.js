import { Joi } from '../joi.js'
import {
  ADDRESS_LINE_MAX,
  TOWN_CITY_MAX,
  COUNTY_MAX,
  POSTCODE_MAX,
  COUNTRY_MAX
} from '../../constants/validation-fields.js'

// Field names match fcp-land-app-stub's own address field naming (line1-3/postalCode,
// as already used for read-only display on /home) rather than fcp-sfd-frontend's
// address1-3/postcode form field names - the validation rules themselves are unchanged.
export const addressSchema = Joi.object({
  line1: Joi.string()
    .trim()
    .required()
    .max(ADDRESS_LINE_MAX)
    .messages({
      'string.empty': 'Enter address line 1, typically the building and street',
      'string.max': `Address line 1 must be ${ADDRESS_LINE_MAX} characters or less`,
      'any.required': 'Enter address line 1, typically the building and street',
      'string.noControlChars': 'Address line 1 must not contain invalid characters'
    }),
  line2: Joi.string()
    .trim()
    .allow('')
    .max(ADDRESS_LINE_MAX)
    .messages({
      'string.max': `Address line 2 must be ${ADDRESS_LINE_MAX} characters or less`,
      'string.noControlChars': 'Address line 2 must not contain invalid characters'
    }),
  line3: Joi.string()
    .trim()
    .allow('')
    .max(ADDRESS_LINE_MAX)
    .messages({
      'string.max': `Address line 3 must be ${ADDRESS_LINE_MAX} characters or less`,
      'string.noControlChars': 'Address line 3 must not contain invalid characters'
    }),
  city: Joi.string()
    .trim()
    .required()
    .max(TOWN_CITY_MAX)
    .messages({
      'string.empty': 'Enter town or city',
      'string.max': `Town or city must be ${TOWN_CITY_MAX} characters or less`,
      'any.required': 'Enter town or city',
      'string.noControlChars': 'Town or city must not contain invalid characters'
    }),
  county: Joi.string()
    .trim()
    .allow('')
    .max(COUNTY_MAX)
    .messages({
      'string.max': `County must be ${COUNTY_MAX} characters or less`,
      'string.noControlChars': 'County must not contain invalid characters'
    }),
  postalCode: Joi.string()
    .trim()
    .required()
    .max(POSTCODE_MAX)
    .messages({
      'any.required': 'Enter a postal code or zip code',
      'string.empty': 'Enter a postal code or zip code',
      'string.max': `Postal code or zip code must be ${POSTCODE_MAX} characters or less`,
      'string.noControlChars': 'Postal code or zip code must not contain invalid characters'
    }),
  country: Joi.string()
    .trim()
    .required()
    .max(COUNTRY_MAX)
    .messages({
      'string.empty': 'Enter a country',
      'string.max': `Country must be ${COUNTRY_MAX} characters or less`,
      'any.required': 'Enter a country',
      'string.noControlChars': 'Country must not contain invalid characters'
    })
})
