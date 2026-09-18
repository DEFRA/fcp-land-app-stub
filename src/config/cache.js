import convict from 'convict'

const isProduction = process.env.NODE_ENV === 'production'

const config = convict({
  name: {
    doc: 'The cache name.',
    format: String,
    default: 'redis'
  },
  host: {
    doc: 'The Redis cache host.',
    format: String,
    default: null,
    env: 'REDIS_HOST'
  },
  port: {
    doc: 'The Redis cache port.',
    format: 'port',
    default: 6379,
    env: 'REDIS_PORT'
  },
  username: {
    doc: 'The Redis cache username. CDP Elasticache uses ACL based auth, which requires a username as well as a password.',
    format: String,
    default: '',
    env: 'REDIS_USERNAME'
  },
  password: {
    doc: 'The Redis cache password.',
    format: '*',
    default: '',
    sensitive: true,
    env: 'REDIS_PASSWORD'
  },
  keyPrefix: {
    doc: 'Redis key prefix, used to isolate this service in a shared Redis instance.',
    format: String,
    default: 'fcp-land-app-stub:',
    env: 'REDIS_KEY_PREFIX'
  },
  // CDP environments run Redis as an Elasticache cluster: a single host/port
  // connection to it will repeatedly have its connection closed. Local
  // development and tests use a single plain Redis container instead.
  useSingleInstanceCache: {
    doc: 'Connect to a single instance of Redis instead of a cluster.',
    format: Boolean,
    default: !isProduction,
    env: 'USE_SINGLE_INSTANCE_CACHE'
  },
  useTLS: {
    doc: 'Connect to Redis using TLS.',
    format: Boolean,
    default: isProduction,
    env: 'REDIS_TLS'
  },
  segment: {
    doc: 'The cache segment.',
    format: String,
    default: 'session'
  },
  ttl: {
    doc: 'The cache TTL.',
    format: Number,
    default: 1000 * 60 * 60 * 24,
    env: 'REDIS_TTL'
  }
})

config.validate({ allowed: 'strict' })

export { config as cache }
