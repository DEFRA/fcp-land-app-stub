import Blankie from 'blankie'

// Bulma ships no inline scripts, so no script hashes are required here.
// A per-request nonce is generated for the one inline script in the layout.
export const contentSecurityPolicy = {
  plugin: Blankie,
  options: {
    fontSrc: ['self'],
    imgSrc: ['self'],
    scriptSrc: ['self'],
    styleSrc: ['self'],
    frameAncestors: ['self'],
    formAction: ['self'],
    manifestSrc: ['self'],
    generateNonces: true
  }
}
