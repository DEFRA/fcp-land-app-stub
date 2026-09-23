import { constants } from 'node:http2'
import { getBusinessDetails } from '../api/get-business-details.js'
import { updateBusinessDetails } from '../api/update-business-details.js'
import { validateBusinessDetails } from '../validation/validate-business-details.js'
import { formatValidationErrors } from '../validation/format-validation-errors.js'
import { buildManualAddress } from '../validation/build-manual-address.js'
import { FULL_PERMISSIONS } from '../constants/scope/business-details.js'
import { createLogger } from '../common/helpers/logging/logger.js'

const logger = createLogger()

const VIEW = 'business-details-edit'
const PATH = '/business-details/edit'

// Flattens the nested details returned by the external API into the same shape the
// edit form's fields use, so the same validation schemas can check both the
// currently stored data and a freshly submitted form.
function toFormValues (businessDetails) {
  return {
    businessName: businessDetails.name ?? '',
    businessTelephone: businessDetails.phone?.landline ?? '',
    businessMobile: businessDetails.phone?.mobile ?? '',
    businessEmail: businessDetails.email?.address ?? '',
    vatNumber: businessDetails.vat ?? '',
    line1: businessDetails.address?.line1 ?? '',
    line2: businessDetails.address?.line2 ?? '',
    line3: businessDetails.address?.line3 ?? '',
    city: businessDetails.address?.city ?? '',
    // Manual saves write "county" into the DAL's line4 field (see buildManualAddress)
    county: businessDetails.address?.line4 ?? '',
    postalCode: businessDetails.address?.postalCode ?? '',
    country: businessDetails.address?.country ?? ''
  }
}

function toUpdateInput (sbi, payload) {
  return {
    sbi,
    name: payload.businessName,
    phone: {
      landline: payload.businessTelephone || null,
      mobile: payload.businessMobile || null
    },
    email: { address: payload.businessEmail },
    vat: payload.vatNumber || null,
    address: { withoutUprn: buildManualAddress(payload) }
  }
}

const getBusinessDetailsEdit = {
  method: 'GET',
  path: PATH,
  options: {
    auth: { scope: FULL_PERMISSIONS }
  },
  handler: async (request, h) => {
    const { sbi, token } = request.auth.credentials
    const businessDetails = await getBusinessDetails(sbi, token)

    if (!businessDetails) {
      return h.view(VIEW, { cannotUpdate: true })
    }

    const formValues = toFormValues(businessDetails)
    const { isValid } = validateBusinessDetails(formValues)

    if (!isValid) {
      return h.view(VIEW, { cannotUpdate: true })
    }

    return h.view(VIEW, { formValues })
  }
}

const postBusinessDetailsEdit = {
  method: 'POST',
  path: PATH,
  options: {
    auth: { scope: FULL_PERMISSIONS }
  },
  handler: async (request, h) => {
    const { sbi, token } = request.auth.credentials
    const payload = request.payload
    const { isValid, errors } = validateBusinessDetails(payload)

    if (!isValid) {
      return h
        .view(VIEW, { formValues: payload, errors: formatValidationErrors(errors) })
        .code(constants.HTTP_STATUS_BAD_REQUEST)
    }

    try {
      await updateBusinessDetails(toUpdateInput(sbi, payload), token)
    } catch (error) {
      logger.warn({ error, sbi }, 'Failed to update business details via the external API')

      return h
        .view(VIEW, { formValues: payload, updateFailed: true })
        .code(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
    }

    return h.redirect('/home?updated=business')
  }
}

export const businessDetailsEditRoutes = [getBusinessDetailsEdit, postBusinessDetailsEdit]
