import { query } from './query.js'
import { updateBusinessDetailsMutation } from './queries/business-details-mutation.js'

// Unlike the getters, a failed save must throw, or the user would be told their
// details were saved when they were not.
async function updateBusinessDetails (input, token) {
  const data = await query(updateBusinessDetailsMutation, { input }, { userToken: token })

  if (data.updateBusinessAllFields?.success !== true) {
    throw new Error('External API did not report the business details update as successful')
  }

  return true
}

export { updateBusinessDetails }
