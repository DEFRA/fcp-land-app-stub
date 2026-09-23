import { authRoutes } from '../routes/auth.js'
import { businessDetailsEdit } from '../routes/business-details-edit.js'
import { health } from '../routes/health.js'
import { home } from '../routes/home.js'
import { index } from '../routes/index.js'
import { personalDetailsEdit } from '../routes/personal-details-edit.js'
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
        personalDetailsEdit,
        businessDetailsEdit,
        health,
        authRoutes
      ))

      await server.register([serveStaticFiles])
    }
  }
}
