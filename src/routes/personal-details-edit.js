import { constants } from 'node:http2'
import { getPersonalDetails } from '../api/get-personal-details.js'
import { updatePersonalDetails } from '../api/update-personal-details.js'
import { validatePersonalDetails } from '../validation/validate-personal-details.js'
import { formatValidationErrors } from '../validation/format-validation-errors.js'
import { buildManualAddress } from '../validation/build-manual-address.js'
import { parseDateOfBirth } from '../validation/personal/parse-date-of-birth.js'
import { createLogger } from '../common/helpers/logging/logger.js'

const logger = createLogger()

// Flattens the nested details returned by the external API into the same shape the
// edit form's fields use, so the same validation schemas can check both the
// currently stored data and a freshly submitted form.
function toFormValues (personalDetails) {
  const [year, month, day] = (personalDetails.dateOfBirth ?? '').split('-')

  return {
    first: personalDetails.name?.first ?? '',
    middle: personalDetails.name?.middle ?? '',
    last: personalDetails.name?.last ?? '',
    day: day ?? '',
    month: month ?? '',
    year: year ?? '',
    personalTelephone: personalDetails.phone?.landline ?? '',
    personalMobile: personalDetails.phone?.mobile ?? '',
    personalEmail: personalDetails.email?.address ?? '',
    line1: personalDetails.address?.line1 ?? '',
    line2: personalDetails.address?.line2 ?? '',
    line3: personalDetails.address?.line3 ?? '',
    city: personalDetails.address?.city ?? '',
    // Manual saves write "county" into the DAL's line4 field (see buildManualAddress)
    county: personalDetails.address?.line4 ?? '',
    postalCode: personalDetails.address?.postalCode ?? '',
    country: personalDetails.address?.country ?? ''
  }
}

function toUpdateInput (crn, payload) {
  return {
    crn,
    first: payload.first,
    middle: payload.middle || null,
    last: payload.last,
    dateOfBirth: parseDateOfBirth(payload),
    phone: {
      landline: payload.personalTelephone || null,
      mobile: payload.personalMobile || null
    },
    email: { address: payload.personalEmail },
    address: buildManualAddress(payload)
  }
}

const getPersonalDetailsEdit = {
  method: 'GET',
  path: '/personal-details/edit',
  options: {
    auth: { scope: ['user'] }
  },
  handler: async (request, h) => {
    const { crn, token } = request.auth.credentials
    const personalDetails = await getPersonalDetails(crn, token)

    if (!personalDetails) {
      return h.view('personal-details-edit', { cannotUpdate: true })
    }

    const formValues = toFormValues(personalDetails)
    const { isValid } = validatePersonalDetails(formValues)

    if (!isValid) {
      return h.view('personal-details-edit', { cannotUpdate: true })
    }

    return h.view('personal-details-edit', { formValues })
  }
}

const postPersonalDetailsEdit = {
  method: 'POST',
  path: '/personal-details/edit',
  options: {
    auth: { scope: ['user'] }
  },
  handler: async (request, h) => {
    const { crn, token } = request.auth.credentials
    const payload = request.payload
    const { isValid, errors } = validatePersonalDetails(payload)

    if (!isValid) {
      return h
        .view('personal-details-edit', { formValues: payload, errors: formatValidationErrors(errors) })
        .code(constants.HTTP_STATUS_BAD_REQUEST)
    }

    try {
      await updatePersonalDetails(toUpdateInput(crn, payload), token)
    } catch (error) {
      logger.warn({ error, crn }, 'Failed to update personal details via the external API')

      return h
        .view('personal-details-edit', { formValues: payload, updateFailed: true })
        .code(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
    }

    return h.redirect('/home?updated=personal')
  }
}

export const personalDetailsEditRoutes = [getPersonalDetailsEdit, postPersonalDetailsEdit]
