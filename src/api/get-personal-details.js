import { query } from './query.js'
import { personalDetailsQuery } from './queries/personal-details.js'
import { createLogger } from '../common/helpers/logging/logger.js'

const logger = createLogger()

async function getPersonalDetails (crn, token) {
  try {
    const data = await query(personalDetailsQuery, { crn }, { userToken: token })

    // customer is null when the CRN has no matching person record
    return data.customer ? { crn: data.customer.crn, ...data.customer.info } : null
  } catch (error) {
    // A failed lookup should not break the page - it just means the section can't be shown
    logger.warn({ error, crn }, 'Failed to get personal details from the external API')

    return null
  }
}

export { getPersonalDetails }
