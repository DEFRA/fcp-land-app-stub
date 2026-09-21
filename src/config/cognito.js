import convict from 'convict'

const config = convict({
  enabled: {
    doc: 'Use AWS Cognito to authenticate calls to the external API (when false, no authentication is used for local development).',
    format: Boolean,
    default: false,
    env: 'COGNITO_ENABLED'
  },
  domain: {
    doc: 'The AWS Cognito domain, eg your-service-c63f2.auth.eu-west-2.amazoncognito.com.',
    format: String,
    nullable: true,
    default: null,
    env: 'COGNITO_DOMAIN'
  },
  clientId: {
    doc: 'The AWS Cognito app client ID.',
    format: String,
    nullable: true,
    default: null,
    env: 'COGNITO_CLIENT_ID'
  },
  clientSecret: {
    doc: 'The AWS Cognito app client secret.',
    format: String,
    nullable: true,
    default: null,
    sensitive: true,
    env: 'COGNITO_CLIENT_SECRET'
  },
  scope: {
    doc: 'The OAuth2 scope to request, eg land-app-resource-srv/access. Omitted from the token request when not set.',
    format: String,
    nullable: true,
    default: null,
    env: 'COGNITO_SCOPE'
  }
})

config.validate({ allowed: 'strict' })

export { config as cognito }
