import Joi from 'joi'
import { query } from '../api/query.js'
import { permissionsQuery } from '../api/queries/permissions.js'
import { createLogger } from '../common/helpers/logging/logger.js'

const logger = createLogger()

const DEFAULT_SCOPE = 'user'

// Validates the shape actually needed from the response, not the whole schema
const permissionsResponseSchema = Joi.object({
  business: Joi.object({
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

    return { scope: [DEFAULT_SCOPE] }
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
    return { scope: [DEFAULT_SCOPE] }
  }

  const privileges = permissionGroups.map(({ id, level }) => `${id.toUpperCase()}:${level.toUpperCase()}`)

  return {
    scope: [DEFAULT_SCOPE, ...privileges]
  }
}

export { getPermissions }
