import { query } from './query.js'
import { updateBusinessDetailsMutation } from './queries/business-details-mutation.js'

// Unlike the getters, a failed save must surface as an error to the caller - it should
// not be silently swallowed, or the user would be told their details were saved when
// they were not.
async function updateBusinessDetails (input, token) {
  const data = await query(updateBusinessDetailsMutation, { input }, { userToken: token })

  return Boolean(data.updateBusinessAllFields?.success)
}

export { updateBusinessDetails }
