import { query } from './query.js'
import { updateCustomerDetailsMutation } from './queries/personal-details-mutation.js'

// Unlike the getters, a failed save must throw, or the user would be told their
// details were saved when they were not.
async function updatePersonalDetails (input, token) {
  const data = await query(updateCustomerDetailsMutation, { input }, { userToken: token })

  if (data.updateCustomerAllFields?.success !== true) {
    throw new Error('External API did not report the personal details update as successful')
  }

  return true
}

export { updatePersonalDetails }
