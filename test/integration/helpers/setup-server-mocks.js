// Every integration test needs the OpenID Connect discovery document, which the
// `auth` plugin fetches at registration time. Mocking it keeps the tests offline.
const mockOidcConfig = {
  authorization_endpoint: 'https://oidc.example.com/authorize',
  token_endpoint: 'https://oidc.example.com/token',
  end_session_endpoint: 'https://oidc.example.com/logout',
  jwks_uri: 'https://oidc.example.com/jwks'
}

vi.mock('../../../src/auth/get-oidc-config.js', async () => {
  return {
    getOidcConfig: async () => (mockOidcConfig)
  }
})

export { mockOidcConfig }
