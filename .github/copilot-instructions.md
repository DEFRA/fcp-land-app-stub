# FCP Land App Stub - AI Coding Agent Instructions

## Overview

A stub of [The Land App](https://thelandapp.com/), a third party land management and
mapping service. It exists to show the Land App team (and other third parties) how to
integrate with Defra Identity, using the same patterns as
[fcp-defra-id-example](../fcp-defra-id-example).

Because it represents a **third party** service, it deliberately does **not** use the
GOV.UK Design System. It uses [Bulma](https://bulma.io/) instead.

## Architecture

### Core technology stack
- **Runtime:** Node.js 24+ with ES modules (`"type": "module"`)
- **Framework:** Hapi.js 21 for HTTP server
- **Templates:** Nunjucks for server-side rendering
- **Styling:** Bulma, compiled from SCSS (self-hosted, never a CDN)
- **Bundling:** Vite for client-side assets, output to `.public/`
- **Auth:** `@hapi/bell` (Defra Identity OAuth2) plus `@hapi/cookie` (session)
- **Session store:** Redis via `@hapi/catbox-redis`, with `@hapi/yar` for temporary data
- **Testing:** Vitest with `unit` and `integration` projects, Testcontainers Redis
- **Linting:** Neostandard
- **Config:** Convict for environment-based configuration

### Project structure

```
src/
  index.js               # Entry point
  server.js              # Hapi server setup, plugin registration, cache config
  api/                   # GraphQL client and Cognito token helper for the external API
  auth/                  # Defra Identity helpers (OIDC discovery, tokens, state, permissions)
  constants/scope/       # Permission level scope constants (eg LAND_DETAILS:AMEND)
  common/helpers/        # CDP plumbing (logging, tracing, pulse, secure context, proxy, errors)
  config/                # Convict schemas plus Nunjucks setup
  plugins/               # Hapi plugins (auth, session, sso, router, CSP, headers)
  routes/                # Route definitions
  views/                 # Nunjucks templates (Bulma markup)
  client/                # Client-side SCSS, JS and images
  utils/                 # Small helpers (safe redirect)
test/
  unit/                  # Isolated tests with mocked dependencies
  integration/           # server.inject() tests against a real Redis container
  setup/global-redis.js  # Testcontainers globalSetup for the integration project
```

## Code quality standards

**All code MUST pass neostandard linting before commit.**

```bash
npm run lint
npm run lint:fix
```

Key rules: no unused variables, no semicolons, single quotes, 2-space indentation,
`const` by default, `curly: ['error', 'all']`.

## Development workflow

```bash
nvm use && npm install
cp .env.example .env
npm run local            # starts Redis + the Defra ID stub, then runs the app with hot reload
```

Or start the dependencies separately:

```bash
npm run services:up
npm run dev
```

Full Docker stack:

```bash
docker compose --profile app up
```

### Testing

```bash
npm test                  # unit + integration with coverage
npm run test:unit         # unit only, no Docker needed
npm run test:integration  # integration only, needs Docker for Testcontainers
npm run test:watch        # TDD watch mode
```

Integration tests use `server.inject()` and `server.initialize()` (never `server.start()`).
They mock the OpenID Connect discovery document through
`test/integration/helpers/setup-server-mocks.js`.

## Defra Identity patterns

These are the patterns third parties are expected to copy. Preserve the explanatory
comments in `src/auth/**` and `src/plugins/auth.js`: they are the documentation.

- **Two strategies.** `defra-id` (Bell) is used only for sign in, change organisation and
  sign out. `session` (Cookie) is the default for everything else.
- **Discovery.** `getOidcConfig()` fetches the well known endpoint once at plugin
  registration and provides the authorisation, token, JWKS and end session URLs.
- **Token verification.** `verifyToken()` converts the JWK from the JWKS endpoint into a
  PEM and verifies the RS256 signature.
- **Enriching the session.** SBI, organisation name and role need no API call: they're
  read straight from the token's `relationships`/`roles` claims by
  `get-organisation-details.js`. Permissions do need
  a call: `getPermissions()` queries the FCP third party external API
  (`src/api/query.js`) and maps the response into a Hapi `scope` array. If that call
  fails, it falls back to the minimum scope rather than blocking sign in.
- **State.** `createState()` / `validateState()` guard the sign out redirect against CSRF.
- **Refresh.** `refreshTokens()` is called from the cookie strategy's `validate()` when the
  access token has expired. Defra Identity refresh tokens are single use.
- **Safe redirects.** Always pass user-supplied redirects through `getSafeRedirect()`.
- **SameSite.** Session cookies must be `Lax` so the redirect back from Defra Identity
  carries the cookie.
- **SSO.** The `sso` plugin turns `?ssoOrgId=` into a change organisation round trip so a
  user arriving from another Defra service lands on the right business.
- **Cognito.** `src/api/get-cognito-token.js` is the optional machine-to-machine
  authentication layer in front of the external API, toggled by `COGNITO_ENABLED`
  (default `false`, which is what local development uses).

## Common gotchas

1. `.npmrc` sets `ignore-scripts=true`, so lifecycle hooks such as `pretest` do not run.
   Build steps are inlined into the npm scripts.
2. `.npmrc` sets `min-release-age=7`, so very recently published versions cannot be installed.
3. The Vite manifest uses the Vite format (entry chunk with `isEntry: true` and a `css`
   array), not the flat webpack format. `src/config/nunjucks/context.js` reads it.
4. `assetPath` in the view context is already `/public/assets`, so template references such
   as `{{ assetPath }}/images/logo.svg` must not repeat `assets`.
5. Integration test files share one Redis container, so session ids must be unique per file.
6. Use `config.get('key.path')`, never `process.env` directly.
7. The content security policy is `'self'` only. Do not introduce inline styles or scripts
   without a nonce.
