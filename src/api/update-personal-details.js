import { query } from './query.js'
import { updateCustomerDetailsMutation } from './queries/personal-details-mutation.js'

// Unlike the getters, a failed save must surface as an error to the caller - it should
// not be silently swallowed, or the user would be told their details were saved when
// they were not.
async function updatePersonalDetails (input, token) {
  const data = await query(updateCustomerDetailsMutation, { input }, { userToken: token })

  return Boolean(data.updateCustomerAllFields?.success)
}

export { updatePersonalDetails }
