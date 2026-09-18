import path from 'node:path'
import nunjucks from 'nunjucks'
import hapiVision from '@hapi/vision'
import { config } from '../config.js'
import { context } from './context.js'
import * as globals from './globals.js'

const dirname = import.meta.dirname

const nunjucksEnvironment = nunjucks.configure(
  [
    path.resolve(dirname, '../../views/'),
    path.resolve(dirname, '../../views/partials')
  ],
  {
    autoescape: true,
    throwOnUndefined: false,
    trimBlocks: true,
    lstripBlocks: true,
    watch: config.get('nunjucks.watch'),
    noCache: config.get('nunjucks.noCache')
  }
)

export const nunjucksConfig = {
  plugin: hapiVision,
  options: {
    engines: {
      njk: {
        compile (src, options) {
          const template = nunjucks.compile(src, options.environment)
          return (ctx) => template.render(ctx)
        }
      }
    },
    compileOptions: {
      environment: nunjucksEnvironment
    },
    relativeTo: path.resolve(dirname, '../..'),
    path: 'views',
    isCached: config.get('isProduction'),
    context
  }
}

Object.entries(globals).forEach(([name, global]) => {
  nunjucksEnvironment.addGlobal(name, global)
})
