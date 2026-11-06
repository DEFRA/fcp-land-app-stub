import { MONTH_MAP } from '../../constants/month-map.js'

// Converts a validated {day, month, year} form value into the ISO date string
// (YYYY-MM-DD) the external API expects. Assumes personalDobSchema has already
// confirmed this resolves to a real, valid date, so this does not re-validate.
export function parseDateOfBirth ({ day, month, year }) {
  const monthNumber = Number.isNaN(Number(month)) ? MONTH_MAP[month.toLowerCase()] : Number.parseInt(month, 10)

  return `${year}-${String(monthNumber).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
