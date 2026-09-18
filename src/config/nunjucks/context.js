import path from 'node:path'
import { readFileSync } from 'node:fs'
import { config } from '../config.js'
import { createLogger } from '../../common/helpers/logging/logger.js'

const logger = createLogger()
const assetPath = config.get('assetPath')
const manifestPath = path.join(config.get('root'), '.public/assets-manifest.json')

let assetManifest

function buildAssetMap (manifest) {
  const map = {}
  for (const chunk of Object.values(manifest)) {
    if (chunk.isEntry) {
      map['application.js'] = chunk.file
      if (chunk.css?.[0]) {
        map['stylesheets/application.css'] = chunk.css[0]
      }
    }
  }
  return map
}

function getAuthContext (request) {
  // If the user is authenticated, add the user's details to the view context.
  // This allows the view to display the user's session details and conditionally
  // render content such as the sign out and change organisation links.
  if (!request.auth.isAuthenticated || !request.auth.credentials?.sessionId) {
    return null
  }

  try {
    return request.server.app.cache.get(request.auth.credentials.sessionId)
  } catch (err) {
    // If the cache lookup fails, render without auth to prevent circular errors
    request.log(['warn', 'views'], `Failed to get auth from cache: ${err.message}`)
    return null
  }
}

export async function context (request) {
  const ctx = request.response.source?.context ?? {}

  if (!assetManifest) {
    try {
      assetManifest = buildAssetMap(JSON.parse(readFileSync(manifestPath, 'utf-8')))
    } catch {
      logger.error(`Vite ${path.basename(manifestPath)} not found`)
    }
  }

  return {
    ...ctx,
    auth: await getAuthContext(request),
    assetPath: `${assetPath}/assets`,
    serviceName: config.get('serviceName'),
    serviceUrl: '/',
    getAssetPath (asset) {
      const viteAssetPath = assetManifest?.[asset]
      return `${assetPath}/${viteAssetPath ?? asset}`
    }
  }
}
