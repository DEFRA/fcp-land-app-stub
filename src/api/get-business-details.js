import { query } from './query.js'
import { businessDetailsQuery } from './queries/business-details.js'
import { createLogger } from '../common/helpers/logging/logger.js'

const logger = createLogger()

async function getBusinessDetails (sbi, token) {
  try {
    const data = await query(businessDetailsQuery, { sbi }, { userToken: token })

    // business is null for an unknown SBI
    return data.business
      ? {
          sbi: data.business.sbi,
          organisationId: data.business.organisationId,
          countyParishHoldings: data.business.countyParishHoldings,
          ...data.business.info
        }
      : null
  } catch (error) {
    // A failed lookup should not break the page - it just means the section can't be shown
    logger.warn({ error, sbi }, 'Failed to get business details from the external API')

    return null
  }
}

export { getBusinessDetails }
