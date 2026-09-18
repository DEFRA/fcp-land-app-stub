import { config } from '../config/config.js'

const assetPath = config.get('assetPath')

export const headers = {
  plugin: {
    name: 'headers',
    register: (server, _options) => {
      server.ext('onPreResponse', (request, h) => {
        const responseHeaders = request.response.headers

        if (!responseHeaders) {
          return h.continue
        }

        responseHeaders['X-Content-Type-Options'] = 'nosniff'
        responseHeaders['X-Frame-Options'] = 'DENY'
        responseHeaders['X-Robots-Tag'] = 'noindex, nofollow'
        responseHeaders['X-XSS-Protection'] = '1; mode=block'
        responseHeaders['Cross-Origin-Opener-Policy'] = 'same-origin'
        responseHeaders['Cross-Origin-Embedder-Policy'] = 'require-corp'
        responseHeaders['Cross-Origin-Resource-Policy'] = 'same-site'
        responseHeaders['Referrer-Policy'] = 'no-referrer'
        responseHeaders['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload'
        responseHeaders['Permissions-Policy'] = 'camera=(), geolocation=(), magnetometer=(), microphone=(), payment=(), usb=()'

        // Disable caching for all routes except the index page and assets
        // This is to prevent browsers from caching sensitive data in the browser history
        // Prevents the back button from displaying sensitive data after the user has signed out
        if (request.path !== '/' && !request.path.startsWith(assetPath)) {
          // Cache-Control must be lower case to avoid conflicts with Hapi's built-in header handling
          responseHeaders['cache-control'] = 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
          responseHeaders.Pragma = 'no-cache'
          responseHeaders.Expires = '0'
        }

        return h.continue
      })
    }
  }
}
