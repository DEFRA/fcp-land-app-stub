import { Cluster, Redis } from 'ioredis'

// Local development and tests use a single, plain Redis container.
// CDP environments provide Redis as an Elasticache cluster: connecting to it
// as if it were a single instance leaves the connection open only briefly
// before it is closed by the cluster node. ACL auth there also requires a
// username as well as a password.
//
// catbox-redis hands us an externally managed client as-is, without waiting
// for it to finish connecting, so we wait for 'ready' here ourselves: catbox
// throws "Disconnected" on any cache call made before that.
export async function buildRedisClient (cacheConfig) {
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

  if (client.status !== 'ready') {
    await new Promise((resolve, reject) => {
      client.once('ready', resolve)
      client.once('error', reject)
    })
  }

  return client
}
