import { createPublicKey } from 'node:crypto'
import Wreck from '@hapi/wreck'
import Jwt from '@hapi/jwt'
import { getOidcConfig } from './get-oidc-config.js'

async function verifyToken (token) {
  const { jwks_uri: uri } = await getOidcConfig()

  const { payload } = await Wreck.get(uri, {
    json: true
  })
  const { keys } = payload

  // Uses the first key only: a production service should pick the key matching the token's `kid` header, as keys rotate
  // Convert the JSON Web Key (JWK) to a PEM-encoded public key so that it can be used to verify the token
  const pem = createPublicKey({ key: keys[0], format: 'jwk' }).export({ type: 'spki', format: 'pem' })

  // Check that the token is signed with the appropriate key by decoding it and verifying the signature using the public key
  // Only the signature is checked here, not the issuer (iss) or audience (aud) claims
  const decoded = Jwt.token.decode(token)
  Jwt.token.verify(decoded, { key: pem, algorithm: 'RS256' })
}

export { verifyToken }
