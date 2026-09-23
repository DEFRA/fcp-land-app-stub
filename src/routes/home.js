import { getPersonalDetails } from '../api/get-personal-details.js'
import { getBusinessDetails } from '../api/get-business-details.js'
import { VIEW_PERMISSIONS, FULL_PERMISSIONS } from '../constants/scope/business-details.js'

export const home = {
  method: 'GET',
  path: '/home',
  options: {
    auth: { scope: ['user'] }
  },
  handler: async (request, h) => {
    const { crn, sbi, scope, token } = request.auth.credentials
    // Personal details need no extra scope, business details need BUSINESS_DETAILS:VIEW or above
    const hasBusinessAccess = scope.some((permission) => VIEW_PERMISSIONS.includes(permission))
    const canEditBusiness = scope.some((permission) => FULL_PERMISSIONS.includes(permission))

    const personalDetails = await getPersonalDetails(crn, token)
    const businessDetails = hasBusinessAccess ? await getBusinessDetails(sbi, token) : null

    return h.view('home', {
      personalDetails,
      businessDetails,
      hasBusinessAccess,
      canEditBusiness,
      updated: request.query.updated
    })
  }
}
