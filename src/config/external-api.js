import convict from 'convict'

const config = convict({
  endpoint: {
    doc: 'The FCP third party external API GraphQL endpoint.',
    format: String,
    default: null,
    env: 'EXTERNAL_API_ENDPOINT'
  },
  timeout: {
    doc: 'The FCP third party external API request timeout in milliseconds.',
    format: Number,
    default: 10000,
    env: 'EXTERNAL_API_TIMEOUT'
  }
})

config.validate({ allowed: 'strict' })

export { config as externalApi }
