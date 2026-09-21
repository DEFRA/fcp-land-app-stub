import Joi from 'joi'
import { query } from '../api/query.js'
import { permissionsQuery } from '../api/queries/permissions.js'
import { createLogger } from '../common/helpers/logging/logger.js'

const logger = createLogger()

// Hapi's scope authorisation always checks a flat array, so every signed-in user
// gets this baseline entry regardless of what the external API returns. It's what
// lets `auth: { scope: ['user'] }` be used on any route that just requires sign in.
const DEFAULT_SCOPE = 'user'

// Validates the shape actually needed from the response, not the whole schema
const permissionsResponseSchema = Joi.object({
  business: Joi.object({
    info: Joi.object({
      name: Joi.string()
    }),
    customer: Joi.object({
      permissionGroups: Joi.array().items(Joi.object({
        id: Joi.string().required(),
        level: Joi.string().required()
      }))
    }).allow(null)
  }).allow(null)
}).unknown(true)

async function getPermissions (sbi, crn, token) {
  try {
    const data = await query(permissionsQuery, { sbi, crn }, { userToken: token })

    return mapPermissions(data)
  } catch (error) {
    // The external API being unreachable, or the user having no relationship with this
    // SBI/CRN, should not block sign in - it just means they see the minimum permission set
    logger.warn({ error, sbi, crn }, 'Failed to get permissions from the external API, falling back to default scope')

    return { scope: [DEFAULT_SCOPE], businessName: null }
  }
}

function mapPermissions (data) {
  const { error, value } = permissionsResponseSchema.validate(data)

  if (error) {
    throw new Error(`Unexpected permissions response shape: ${error.message}`)
  }

  const permissionGroups = value.business?.customer?.permissionGroups

  if (!permissionGroups) {
    // business is null for an unknown SBI, customer is null when the user has no
    // relationship with this business - both are valid responses, not errors
    return { scope: [DEFAULT_SCOPE], businessName: null }
  }

  const privileges = permissionGroups.map(({ id, level }) => `${id.toUpperCase()}:${level.toUpperCase()}`)

  return {
    scope: [DEFAULT_SCOPE, ...privileges],
    businessName: value.business.info?.name ?? null
  }
}

export { getPermissions }
