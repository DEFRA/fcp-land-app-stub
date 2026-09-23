import { parseDateOfBirth } from '../../../src/validation/personal/parse-date-of-birth.js'

describe('parseDateOfBirth', () => {
  test('should build an iso date string from numeric day/month/year', () => {
    expect(parseDateOfBirth({ day: '17', month: '4', year: '1972' })).toBe('1972-04-17')
  })

  test('should resolve a full month name', () => {
    expect(parseDateOfBirth({ day: '1', month: 'January', year: '2000' })).toBe('2000-01-01')
  })

  test('should resolve a month abbreviation', () => {
    expect(parseDateOfBirth({ day: '25', month: 'Dec', year: '1999' })).toBe('1999-12-25')
  })
})
