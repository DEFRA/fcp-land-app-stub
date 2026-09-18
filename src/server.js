import path from 'node:path'
import Hapi from '@hapi/hapi'
import Joi from 'joi'
import Bell from '@hapi/bell'
import Cookie from '@hapi/cookie'
import Inert from '@hapi/inert'
import Scooter from '@hapi/scooter'
import { Engine as CatboxRedis } from '@hapi/catbox-redis'
import { config } from './config/config.js'
import { nunjucksConfig } from './config/nunjucks/nunjucks.js'
import { auth } from './plugins/auth.js'
import { contentSecurityPolicy } from './plugins/content-security-policy.js'
import { headers } from './plugins/headers.js'
import { router } from './plugins/router.js'
import { session } from './plugins/session.js'
import { sso } from './plugins/sso.js'
import { buildRedisClient } from './common/helpers/redis-client.js'
import { catchAll } from './common/helpers/errors.js'
import { pulse } from './common/helpers/pulse.js'
import { requestLogger } from './common/helpers/logging/request-logger.js'
import { requestTracing } from './common/helpers/request-tracing.js'
import { secureContext } from './common/helpers/secure-context/secure-context.js'
import { setupProxy } from './common/helpers/proxy/setup-proxy.js'

export async function createServer () {
  setupProxy()

  const redisClient = await buildRedisClient(config.get('cache'))

  const server = Hapi.server({
    host: config.get('host'),
    port: config.get('port'),
    routes: {
      validate: {
        options: {
          abortEarly: false
        }
      },
      files: {
        relativeTo: path.resolve(config.get('root'), '.public')
      },
      security: {
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true
        },
        xss: 'enabled',
        noSniff: true,
        xframe: true
      }
    },
    router: {
      stripTrailingSlash: true
    },
    cache: [{
      name: config.get('cache.name'),
      provider: {
        constructor: CatboxRedis,
        options: {
          client: redisClient
        }
      }
    }]
  })

  server.app.cache = server.cache({
    cache: config.get('cache.name'),
    segment: config.get('cache.segment'),
    expiresIn: config.get('cache.ttl')
  })

  server.validator(Joi)

  await server.register([
    Inert,
    Bell,
    Cookie,
    Scooter,
    requestLogger,
    requestTracing,
    secureContext,
    pulse,
    nunjucksConfig,
    contentSecurityPolicy,
    headers,
    auth,
    session,
    router,
    sso
  ])

  server.ext('onPreResponse', catchAll)

  return server
}
