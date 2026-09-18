import { Cluster, Redis } from 'ioredis'
import { createLogger } from './logging/logger.js'

export async function buildRedisClient (cacheConfig) {
  const logger = createLogger()
  const host = cacheConfig.host
  const port = cacheConfig.port
  const keyPrefix = cacheConfig.keyPrefix

  const credentials = cacheConfig.username === ''
    ? { password: cacheConfig.password || undefined }
    : { username: cacheConfig.username, password: cacheConfig.password }

  const tls = cacheConfig.useTLS ? { tls: {} } : {}

  const client = cacheConfig.useSingleInstanceCache
    ? new Redis({
      host,
      port,
      keyPrefix,
      ...credentials,
      ...tls
    })
    : new Cluster([{ host, port }], {
      keyPrefix,
      slotsRefreshTimeout: 10000,
      dnsLookup: (address, callback) => callback(null, address),
      redisOptions: {
        ...credentials,
        ...tls
      }
    })

  client.on('connect', () => {
    logger.info('Connected to Redis server')
  })

  client.on('error', (error) => {
    logger.error(`Redis connection error ${error}`)
  })

  if (client.status !== 'ready') {
    await new Promise((resolve, reject) => {
      client.once('ready', resolve)
      client.once('error', reject)
    })
  }

  return client
}
