import { constants } from 'node:http2'
import { getBusinessDetails } from '../api/get-business-details.js'
import { updateBusinessDetails } from '../api/update-business-details.js'
import { validateBusinessDetails } from '../validation/validate-business-details.js'
import { formatValidationErrors } from '../validation/format-validation-errors.js'
import { toAddressFormValues, toAddressInput } from '../utils/address.js'
import { FULL_PERMISSIONS } from '../constants/scope/business-details.js'
import { createLogger } from '../common/helpers/logging/logger.js'

const logger = createLogger()

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
    ...toAddressFormValues(businessDetails.address)
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
    address: toAddressInput(payload)
  }
}

const getBusinessDetailsEdit = {
  method: 'GET',
  path: '/business-details/edit',
  options: {
    // Users without this scope get a 403
    auth: { scope: FULL_PERMISSIONS }
  },
  handler: async (request, h) => {
    const { sbi, token } = request.auth.credentials
    const businessDetails = await getBusinessDetails(sbi, token)

    if (!businessDetails) {
      return h.view('business-details-edit', { cannotUpdate: true })
    }

    const formValues = toFormValues(businessDetails)
    // An address from a postcode lookup was never held to these rules, so let the user fix it in the form
    const { isValid } = validateBusinessDetails(formValues, { includeAddress: !businessDetails.address?.uprn })

    // Stored data the form would reject can't be saved back without the user changing fields they didn't touch
    if (!isValid) {
      return h.view('business-details-edit', { cannotUpdate: true })
    }

    return h.view('business-details-edit', { formValues })
  }
}

const postBusinessDetailsEdit = {
  method: 'POST',
  path: '/business-details/edit',
  options: {
    auth: { scope: FULL_PERMISSIONS }
  },
  handler: async (request, h) => {
    const { sbi, token } = request.auth.credentials
    const payload = request.payload
    const { isValid, errors } = validateBusinessDetails(payload)

    if (!isValid) {
      return h
        .view('business-details-edit', { formValues: payload, errors: formatValidationErrors(errors) })
        .code(constants.HTTP_STATUS_BAD_REQUEST)
    }

    try {
      await updateBusinessDetails(toUpdateInput(sbi, payload), token)
    } catch (error) {
      logger.warn({ err: error }, `Failed to update business details via the external API for SBI ${sbi}`)

      return h
        .view('business-details-edit', { formValues: payload, updateFailed: true })
        .code(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
    }

    return h.redirect('/home?updated=business')
  }
}

export const businessDetailsEditRoutes = [getBusinessDetailsEdit, postBusinessDetailsEdit]
