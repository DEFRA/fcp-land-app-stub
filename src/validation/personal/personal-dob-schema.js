import { Joi } from '../joi.js'
import { MAX_AGE_YEARS } from '../../constants/validation-fields.js'
import { MONTH_MAP } from '../../constants/month-map.js'

export const personalDobSchema = Joi.object({
  day: Joi.string().allow(''),
  month: Joi.string().allow(''),
  year: Joi.string().allow('')
}).custom((value, helpers) => {
  const { day, month, year } = value

  // Check for missing fields or combinations
  const missingFieldsError = checkMissingFields(day, month, year, helpers)
  if (missingFieldsError) {
    return missingFieldsError
  }

  // Year format check (must be 4 digits)
  if (year && year.length !== 4) {
    return makeError(helpers, 'dob.yearLength', ['year'])
  }

  // Normalise and validate month input (can be name, abbreviation, or number)
  const monthValue = getMonthNumber(month, helpers)
  if (monthValue.isJoiError) {
    return monthValue
  }

  // Validate that a real, valid date exists
  const fullDate = getFullDate(day, monthValue, year, helpers)
  if (fullDate.isJoiError) {
    return fullDate
  }

  // Date must be in the past
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  if (fullDate >= today) {
    return makeError(helpers, 'dob.future', ['day', 'month', 'year'])
  }

  // Date must not be more than 120 years ago
  const tooOldError = checkNotTooOld(fullDate, helpers)
  if (tooOldError) {
    return tooOldError
  }

  return value
}).messages({
  'dob.missingAll': 'Enter your date of birth',
  'dob.missingDay': 'Date of birth must include a day',
  'dob.missingMonth': 'Date of birth must include a month',
  'dob.missingYear': 'Date of birth must include a year',
  'dob.missingDayMonth': 'Date of birth must include a day and month',
  'dob.missingDayYear': 'Date of birth must include a day and year',
  'dob.missingMonthYear': 'Date of birth must include a month and year',
  'dob.yearLength': 'Enter a year with 4 numbers, like 1975',
  'dob.invalid': 'Date of birth must be a real date',
  'dob.future': 'Date of birth must be in the past',
  'dob.tooOld': 'Date of birth must be on or after {{#oldest}}',
  'string.noControlChars': 'Date of birth must not contain invalid characters'
})

const checkNotTooOld = (fullDate, helpers) => {
  const oldestDateAllowed = getOldestAllowedDate()

  if (fullDate < oldestDateAllowed) {
    // Create date string from 120 years ago (to use for the error)
    const oldestDateString = oldestDateAllowed.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })

    // Pass the date string as context so the message template can use it
    const error = helpers.error('dob.tooOld', { oldest: oldestDateString })
    error.path = ['day', 'month', 'year']

    return error
  }

  return null
}

const getOldestAllowedDate = () => {
  const date = new Date()
  date.setUTCHours(0, 0, 0, 0)
  date.setUTCFullYear(date.getUTCFullYear() - MAX_AGE_YEARS)

  return date
}

/**
 * Gets and validates a full date (day, month, year) to ensure it is a real and valid date.
 */
const getFullDate = (day, monthValue, year, helpers) => {
  const dayValue = Number.parseInt(day, 10)
  const yearValue = Number.parseInt(year, 10)
  const date = new Date(Date.UTC(yearValue, monthValue - 1, dayValue))

  if (
    date.getUTCFullYear() !== yearValue ||
    date.getUTCMonth() + 1 !== monthValue ||
    date.getUTCDate() !== dayValue
  ) {
    return makeError(helpers, 'dob.invalid', ['day', 'month', 'year'])
  }

  return date
}

/**
 * Normalises a month value entered by the user.
 *
 * A user can enter either:
 * - a month number (e.g. "10")
 * - a full month name (e.g. "October")
 * - or a common abbreviation (e.g. "Oct")
 *
 * If the value is not numeric, it is converted to lowercase and looked up in the MONTH_MAP,
 * which maps all valid month names and abbreviations to their corresponding number values
 * (e.g. "january" → 1, "feb" → 2).
 *
 * If a valid mapping is found, the mapped number is returned.
 * If no mapping exists, an error is returned via `makeError`, as the input is likely invalid.
 * If the month is already numeric, it is parsed and validated to be within the range 1–12.
 */
const getMonthNumber = (month, helpers) => {
  if (Number.isNaN(Number(month))) {
    const lower = month.toLowerCase()
    const mapped = MONTH_MAP[lower]

    if (!mapped) {
      return makeError(helpers, 'dob.invalid', ['month'])
    }

    return mapped
  }

  const parsedMonth = Number.parseInt(month, 10)

  if (parsedMonth < 1 || parsedMonth > 12) {
    return makeError(helpers, 'dob.invalid', ['month'])
  }

  return parsedMonth
}

/**
 * Validates combinations of missing date fields
 * (e.g. day missing, month+year entered, etc.)
 */
const checkMissingFields = (day, month, year, helpers) => {
  if (!day && !month && !year) {
    return makeError(helpers, 'dob.missingAll', ['day', 'month', 'year'])
  }
  if (!day && month && year) {
    return makeError(helpers, 'dob.missingDay', ['day'])
  }
  if (day && !month && year) {
    return makeError(helpers, 'dob.missingMonth', ['month'])
  }
  if (day && month && !year) {
    return makeError(helpers, 'dob.missingYear', ['year'])
  }
  if (!day && !month && year) {
    return makeError(helpers, 'dob.missingDayMonth', ['day', 'month'])
  }
  if (!day && month && !year) {
    return makeError(helpers, 'dob.missingDayYear', ['day', 'year'])
  }
  if (day && !month && !year) {
    return makeError(helpers, 'dob.missingMonthYear', ['month', 'year'])
  }

  return null
}

/**
 * Creates a Joi error and manually sets its path so the right input fields highlight.
 */
const makeError = (helpers, code, fields) => {
  const error = helpers.error(code)
  error.path = fields
  error.isJoiError = true

  return error
}
