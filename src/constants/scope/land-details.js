// Mirrors the permission group levels returned for LAND_DETAILS by the FCP third
// party external API. The levels are cumulative - a route that requires the view
// level should also accept anyone with a higher level of access - so each exported
// array lists every level that satisfies it, rather than ranking levels numerically.
//
// No route in this stub is gated on these yet (see README "What the token already
// tells you" / "Getting permissions"). They're here ready for the future work that
// adds routes for viewing and editing land data, eg:
//   options: { auth: { scope: VIEW_PERMISSIONS } }

const VIEW_LEVEL_PERMISSION = 'LAND_DETAILS:VIEW'
const AMEND_LEVEL_PERMISSION = 'LAND_DETAILS:AMEND'
const SUBMIT_LEVEL_PERMISSION = 'LAND_DETAILS:SUBMIT'
const FULL_PERMISSION = 'LAND_DETAILS:FULL_PERMISSION'

const VIEW_PERMISSIONS = [VIEW_LEVEL_PERMISSION, AMEND_LEVEL_PERMISSION, SUBMIT_LEVEL_PERMISSION, FULL_PERMISSION]
const AMEND_PERMISSIONS = [AMEND_LEVEL_PERMISSION, SUBMIT_LEVEL_PERMISSION, FULL_PERMISSION]
const SUBMIT_PERMISSIONS = [SUBMIT_LEVEL_PERMISSION, FULL_PERMISSION]
const FULL_PERMISSIONS = [FULL_PERMISSION]

export {
  VIEW_LEVEL_PERMISSION,
  AMEND_LEVEL_PERMISSION,
  SUBMIT_LEVEL_PERMISSION,
  FULL_PERMISSION,
  VIEW_PERMISSIONS,
  AMEND_PERMISSIONS,
  SUBMIT_PERMISSIONS,
  FULL_PERMISSIONS
}
