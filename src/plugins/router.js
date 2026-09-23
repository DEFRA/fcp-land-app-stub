import { authRoutes } from '../routes/auth.js'
import { businessDetailsEditRoutes } from '../routes/business-details-edit.js'
import { health } from '../routes/health.js'
import { home } from '../routes/home.js'
import { index } from '../routes/index.js'
import { personalDetailsEditRoutes } from '../routes/personal-details-edit.js'
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
        personalDetailsEditRoutes,
        businessDetailsEditRoutes,
        health,
        authRoutes
      ))

      await server.register([serveStaticFiles])
    }
  }
}
