import { authRoutes } from '../routes/auth.js'
import { health } from '../routes/health.js'
import { home } from '../routes/home.js'
import { index } from '../routes/index.js'
import { session } from '../routes/session.js'
import { serveStaticFiles } from '../common/helpers/serve-static-files.js'

export const router = {
  plugin: {
    name: 'router',
    register: async (server) => {
      server.route([].concat(
        index,
        home,
        session,
        health,
        authRoutes
      ))

      await server.register([serveStaticFiles])
    }
  }
}
