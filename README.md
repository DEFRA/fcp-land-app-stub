# fcp-land-app-stub

A stub of [The Land App](https://thelandapp.com/) that demonstrates how a third party
service integrates with **Defra Identity**.

The Land App is a commercial land management and mapping service used by farmers and
land agents. This repository is not the Land App: it is a deliberately small, readable
stand-in that implements the complete Defra Identity sign in journey so the Land App
team (and any other third party) has a working reference implementation to copy.

It is the third party sibling of [fcp-defra-id-example](https://github.com/DEFRA/fcp-defra-id-example),
which shows the same patterns for an internal Defra service. The difference is
presentational: because this stub represents a third party, it uses
[Bulma](https://bulma.io/) rather than the GOV.UK Design System.

> The source code, and in particular the comments in `src/auth/**` and
> `src/plugins/auth.js`, are the documentation. Read them alongside this README.

## Contents

- [What it does](#what-it-does)
- [Running it locally](#running-it-locally)
- [How the Defra Identity integration works](#how-the-defra-identity-integration-works)
  - [The sign in journey](#the-sign-in-journey)
  - [Two authentication strategies](#two-authentication-strategies)
  - [OpenID Connect discovery](#openid-connect-discovery)
  - [Verifying the token](#verifying-the-token)
  - [What the token already tells you](#what-the-token-already-tells-you)
  - [Getting permissions](#getting-permissions)
  - [The session](#the-session)
  - [Refreshing tokens](#refreshing-tokens)
  - [Changing organisation](#changing-organisation)
  - [Single sign on from another Defra service](#single-sign-on-from-another-defra-service)
  - [Signing out](#signing-out)
  - [Security notes](#security-notes)
- [Calling the FCP third party external API](#calling-the-fcp-third-party-external-api)
  - [The GraphQL client](#the-graphql-client)
  - [Machine-to-machine authentication with Cognito](#machine-to-machine-authentication-with-cognito)
  - [The two tokens](#the-two-tokens)
  - [Running against the API locally](#running-against-the-api-locally)
  - [CDP API gateway URLs](#cdp-api-gateway-urls)
- [Integration checklist](#integration-checklist)
- [Project structure](#project-structure)
- [Testing](#testing)
- [Debugging](#debugging)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [SonarQube Cloud](#sonarqube-cloud)
- [Licence](#licence)

## What it does

Three pages and five auth routes:

| Page | Route | Description |
|---|---|---|
| Landing page | `GET /` | Public. Offers a "Sign in with Defra account" link. |
| Session details | `GET /home` | Requires the `user` scope. Lists everything held in the session, with links to change organisation and sign out. |
| Health check | `GET /health` | Public. Used by the platform. |

| Auth route | Description |
|---|---|
| `GET /auth/sign-in` | Starts the Defra Identity journey. |
| `GET /auth/sign-in-oidc` | The redirect URI. Exchanges the code, verifies the token, creates the session. |
| `GET /auth/organisation` | Restarts the journey forcing the organisation selection screen. |
| `GET /auth/sign-out` | Clears the local session and redirects to Defra Identity to end the SSO session. |
| `GET /auth/sign-out-oidc` | The post logout redirect URI. Validates state and returns the user to the landing page. |

## Running it locally

Prerequisites: Node.js 24+ (use `nvm`), Docker.

```bash
nvm use
npm install
cp .env.example .env
npm run local
```

`npm run local` starts the dependency containers (Redis and
[fcp-defra-id-stub](https://github.com/DEFRA/fcp-defra-id-stub)) and then runs the app
host-native with hot reload. Open <http://localhost:3000>.

To start the dependencies and the app separately:

```bash
npm run services:up
npm run dev
```

To run everything, including the app, in Docker:

```bash
docker compose --profile app up
```

`fcp-defra-id-stub` stands in for Defra Identity locally. It reads `example.data.json`,
so you can sign in as any customer reference number (CRN) in that file. When you deploy,
point `DEFRA_ID_WELL_KNOWN_URL` at the real Defra Identity tenant and drop the stub from
your compose file.

> `example.data.json` here is aligned to the SBIs and CRNs that
> [fcp-tp-external-api](https://github.com/DEFRA/fcp-tp-external-api)'s local mock DAL
> data recognises, so the sign in journey can demonstrate real permission groups end to
> end. This requires a `fcp-defra-id-stub` release that includes the fix for reading
> `AUTH_OVERRIDE_FILE` (older versions ignore it and always serve their own built-in
> data) - if the business name or SBI in the app don't match this file, that's the
> symptom.

Useful scripts:

| Script | Description |
|---|---|
| `npm run local` | Dependencies plus the app with hot reload |
| `npm run dev` | The app only, with hot reload |
| `npm run dev:debug` | As above with the Node inspector on 9229 |
| `npm run services:up` / `services:down` | Dependency containers |
| `npm run build:frontend` | Build client assets with Vite |
| `npm run lint` / `lint:fix` | Neostandard |
| `npm test` | Unit and integration tests with coverage |

## How the Defra Identity integration works

### The sign in journey

```mermaid
sequenceDiagram
    participant U as User
    participant A as Land App stub
    participant D as Defra Identity
    participant X as FCP third party external API

    U->>A: GET /
    U->>A: GET /auth/sign-in
    A->>D: 302 to authorisation endpoint<br/>(client_id, serviceId, policy, scope, state)
    U->>D: Signs in with CRN and password
    U->>D: Chooses a business
    D->>A: 302 to /auth/sign-in-oidc?code=...&state=...
    A->>D: POST token endpoint (code exchange, handled by Bell)
    D-->>A: access_token, refresh_token
    A->>D: GET JWKS endpoint
    A->>A: Verify RS256 signature
    A->>X: GraphQL permissions query (x-forwarded-authorization)
    X-->>A: permission groups, or an error
    A->>A: Store the session in Redis, set the session cookie
    A->>U: 302 to /home
```

### Two authentication strategies

`src/plugins/auth.js` registers two strategies and they do different jobs.

| Strategy | Plugin | Used by | Purpose |
|---|---|---|---|
| `defra-id` | `@hapi/bell` | `/auth/sign-in`, `/auth/sign-in-oidc`, `/auth/organisation` | Talks OAuth2 to Defra Identity |
| `session` | `@hapi/cookie` | Everything else (it is the default) | Validates the local session on each request |

Only three routes use `defra-id`. Once the session exists, every subsequent request is
authenticated by the cookie strategy, which looks the session up in Redis. Do not put
`defra-id` on ordinary routes: it would send the user back to Defra Identity on every
request.

### OpenID Connect discovery

`src/auth/get-oidc-config.js` fetches the well known endpoint once, at plugin
registration. That single document supplies:

| Field | Used for |
|---|---|
| `authorization_endpoint` | Where to send the user to sign in |
| `token_endpoint` | Code exchange and token refresh |
| `jwks_uri` | Public keys for signature verification |
| `end_session_endpoint` | Signing out of the Defra Identity SSO session |

Never hard code these URLs. They differ per environment and can change.

### Verifying the token

Defra Identity signs its tokens with RS256. `src/auth/verify-token.js` fetches the JWK
from the JWKS endpoint, converts it to a PEM with Node's `createPublicKey`, and verifies
the signature. Do this on every sign in: a token you have not verified is just a string a
caller handed you.

The token payload carries the claims the service needs:

| Claim | Meaning |
|---|---|
| `contactId` | The customer reference number (CRN), the person |
| `currentRelationshipId` | The organisation (business) the user selected |
| `sessionId` | Defra Identity's session identifier, reused as the local session key |
| `firstName`, `lastName` | The user's name |
| `relationships` | Every organisation the user is linked to, including the SBI and business name |
| `roles` | Role names only, without permission detail |

The Bell `profile` function in `src/plugins/auth.js` maps these onto friendlier names
(`crn`, `organisationId`, `name`) while keeping every original claim.

### What the token already tells you

Not everything needs a network call. Two claims carry more than a single value per
organisation, because a user can belong to more than one business and can switch between
them within a sign in session:

```
relationships: ["<organisationId>:<sbi>:<organisationName>:<organisationLoa>:<relationship>:<relationshipLoa>", ...]
roles:         ["<organisationId>:<roleName>:<enrolmentStatus>", ...]
```

Both arrays accumulate one entry per organisation the user has visited this session, so
reading the wrong index would silently pick up a stale organisation. `src/auth/get-organisation-from-relationships.js`
and `src/auth/get-role-from-roles.js` both match on `currentRelationshipId` rather than
taking the first entry, for that reason.

A `relationships` entry's organisation name can itself contain a colon (for example
`"Acme: Holdings Ltd"`), so the name is read positionally from the middle of the entry
rather than by a fixed index.

The third segment of a `roles` entry is a Defra Identity enrolment status
(1 pending, 2 pending verification, 3 complete/approved, 4 complete/rejected,
5 pending appeal, 6 removed, 7 locked). This stub treats the role name as informational
only and does not filter on it - Land App's authorisation is driven entirely by the
`scope` built from permission groups (see below), matching how role is used (or rather,
not used) across FCP services.

SBI, organisation name and role are therefore derived from the token alone, with no API
call, in the Bell `profile` function in `src/plugins/auth.js`.

### Getting permissions

`roles` in the token contains role names but not the permission levels a service needs to
make authorisation decisions (see [What the token already tells you](#what-the-token-already-tells-you)).
Those come from the [FCP third party external API](#calling-the-fcp-third-party-external-api)
instead, authenticated with the Defra Identity token that was just verified.

`src/auth/get-permissions.js` sends a GraphQL query for the signed in user's SBI and CRN
and maps the response's `permissionGroups` (`{ id, level }` pairs, for example
`{ id: 'LAND_DETAILS', level: 'AMEND' }`) into the flat array Hapi's scope authorisation
expects:

```js
{ scope: ['user', 'LAND_DETAILS:AMEND', ...] }
```

`user` is always included, so any route that just requires sign in (like `/home`) can use
`auth: { scope: ['user'] }` regardless of what the external API returns. Everything else
is `<permission group id>:<level>`, uppercased, ready to compare against constants like
those in `src/constants/scope/land-details.js`.

If the external API is unreachable, or the user has no relationship with the queried SBI
(both are normal, expected responses, not exceptional ones), `getPermissions` logs a
warning and falls back to `{ scope: ['user'] }` rather than failing sign in. A user who
can't be resolved a permission set still gets to see the parts of the service that only
need proof of identity.

The business name shown on `/home` is the one already read from the token (see
[What the token already tells you](#what-the-token-already-tells-you)) - it isn't
re-fetched from the external API, since the token already has it.

### The session

Two stores, with different jobs:

| Store | Plugin | Segment | Holds |
|---|---|---|---|
| Authenticated session | `@hapi/catbox-redis` via `server.app.cache` | `session` | Token, refresh token, profile, role, scope |
| Temporary data | `@hapi/yar` | `session-temp` | CSRF state, the post sign in redirect |

Only a session identifier goes in the cookie. Tokens never leave the server. `maxCookieSize: 0`
forces Yar to use the server-side cache rather than packing data into the cookie.

The session cookie must be `SameSite=Lax`. With `Strict` the browser would withhold the
cookie on the redirect back from Defra Identity and the journey would fail.

### Refreshing tokens

The cookie strategy's `validate()` runs on every request. It decodes the stored access
token and checks the expiry with a 60 second tolerance for clock skew. If the token has
expired it calls `src/auth/refresh-tokens.js` and writes the new pair back to the cache.

Defra Identity refresh tokens are **single use**: each refresh returns a new refresh token
and invalidates the old one. Always persist the new one.

### Changing organisation

A user with more than one business needs to switch between them.
`GET /auth/organisation` restarts the Bell journey with `forceReselection=true`, which
makes Defra Identity show the organisation selection screen even though the user is
already signed in. The journey rejoins the service at `/auth/sign-in-oidc`, which
overwrites the session with the new organisation.

### Single sign on from another Defra service

When a user arrives from another Defra service that already knows which business they are
working on, that service appends `?ssoOrgId=<organisationId>`. The `sso` plugin
(`src/plugins/sso.js`) intercepts it on `onRequest`, strips the parameter to avoid a
redirect loop, and sends the user through `/auth/organisation` with
`relationshipId=<organisationId>`. Defra Identity then skips the selection screen and the
user lands on the right business.

### Signing out

Signing out has two halves: the local session and the Defra Identity SSO session.

1. `GET /auth/sign-out` drops the Redis entry, clears the cookie, then redirects to the
   `end_session_endpoint` with `post_logout_redirect_uri`, `id_token_hint` and `state`.
2. Defra Identity ends its own session and redirects to `GET /auth/sign-out-oidc`.
3. That route validates the `state` value, clears the session again as a failsafe, and
   returns the user to the landing page.

Clearing only the local session would leave the user signed in at Defra Identity, so the
next sign in attempt would silently reuse the old identity.

### Security notes

| Concern | Mitigation |
|---|---|
| CSRF on sign out | `createState()` / `validateState()` in `src/auth/state.js` |
| Open redirect | `getSafeRedirect()` in `src/utils/get-safe-redirect.js`, applied to every user-supplied redirect |
| Token leakage | Tokens live in Redis, never in the cookie |
| Back button after sign out | The `headers` plugin disables caching on every page except the landing page and assets |
| XSS | Content Security Policy of `'self'` only, with a per-request nonce for the single inline script tag |

## Calling the FCP third party external API

[fcp-tp-external-api](https://github.com/DEFRA/fcp-tp-external-api) is a GraphQL API that
sits between third party services and Defra's internal Data Access Layer (DAL). It's how
this stub gets permissions today, and where any future work reading or writing more
business or customer data would go.

### The GraphQL client

`src/api/query.js` is a single, generic `query(document, variables, { userToken })`
function. It isn't specific to permissions: `src/api/queries/permissions.js` is just the
first query document that uses it. Adding a new query is adding a new document plus a
call to `query()`, not a new HTTP client.

The endpoint is configurable (`EXTERNAL_API_ENDPOINT`), defaulting to
`http://localhost:3001/graphql` for local development against a
[fcp-tp-external-api](https://github.com/DEFRA/fcp-tp-external-api) checkout. In a
deployed environment it points at the CDP API gateway URL for that service instead (see
[CDP API gateway URLs](#cdp-api-gateway-urls)).

### Machine-to-machine authentication with Cognito

CDP fronts REST and GraphQL APIs with an API Gateway that can require an AWS Cognito
access token, issued via the OAuth2 client credentials grant, in addition to whatever
authentication the API itself performs.

```mermaid
sequenceDiagram
    participant A as Land App stub
    participant C as AWS Cognito
    participant G as CDP API Gateway
    participant E as fcp-tp-external-api

    A->>C: POST /oauth2/token<br/>(Basic auth: client id/secret, grant_type=client_credentials)
    C-->>A: access_token, expires_in
    A->>G: POST /graphql<br/>Authorization: Bearer access_token<br/>x-forwarded-authorization: Defra Identity token
    G->>E: forwarded request
    E-->>A: GraphQL response
```

`src/api/get-cognito-token.js` requests and caches that token in memory, refreshing a few
minutes before it actually expires so a request never fails mid-flight because the token
expired between check and use. Concurrent callers that arrive while there is no valid
cached token share a single in-flight request rather than each firing their own call to
Cognito. If a cached token is rejected by the gateway (for example because the CDP
platform team has rotated the client secret), `src/api/query.js` clears the cache and
retries once with a freshly requested token.

Set `COGNITO_ENABLED=false` (the default) to skip all of this: no Cognito call is made and
no `Authorization` header is sent to the external API. This is what local development
uses, since `fcp-tp-external-api` has no authentication of its own when run locally.

### The two tokens

Every request to the external API can carry two different tokens, doing two different
jobs, and they are **not interchangeable**:

| Header | Identifies | Format | Verified by |
|---|---|---|---|
| `Authorization` | This service, to the API gateway | `Bearer <cognito access token>` | AWS Cognito / API Gateway |
| `x-forwarded-authorization` | The signed in user, to the DAL | The raw Defra Identity JWT, **no** `Bearer ` prefix | The DAL, against the Defra Identity JWKS |

Getting the second one wrong is the easiest mistake to make when copying this pattern:
the DAL reads `x-forwarded-authorization` verbatim and hands it straight to a JWT decoder,
so a `Bearer ` prefix there causes a verification failure rather than being stripped.

### Running against the API locally

1. Start [fcp-tp-external-api](https://github.com/DEFRA/fcp-tp-external-api) on its
   default port: `npm run services:up && npm run dev` in that repository.
2. Leave `COGNITO_ENABLED=false` in this repository's `.env` - the external API has no
   authentication of its own locally.
3. Start this stub as normal (`npm run local`). Containerised runs reach the other stack
   through `host.docker.internal`, which is already set up in `compose.yml`.

### CDP API gateway URLs

When the CDP platform team provisions an API for a service, they follow a predictable
naming convention:

| | Pattern | Example |
|---|---|---|
| API URL | `https://<service>.api.<environment>.cdp-int.defra.cloud` | `https://fcp-tp-external-api.api.ext-test.cdp-int.defra.cloud/graphql` |
| Cognito token URL | `https://<service>-<suffix>.auth.eu-west-2.amazoncognito.com/oauth2/token` | one random suffix per environment, supplied by the platform team |

The platform team issues the Cognito domain, client ID and client secret for each
environment (contact them via Slack `#cdp-support`), and periodically rotates the client
secret with an overlap window - see the retry behaviour described above. Throttling
defaults to 25 requests/second (private APIs, lower environments) or 100 requests/second
(public APIs, `ext-test`/`prod`); ask the platform team if a service needs different
limits.

## Integration checklist

What you need from Defra Identity onboarding, and where it goes:

| Value | Environment variable |
|---|---|
| Well known (discovery) URL | `DEFRA_ID_WELL_KNOWN_URL` |
| Client ID | `DEFRA_ID_CLIENT_ID` |
| Client secret | `DEFRA_ID_CLIENT_SECRET` |
| Service ID | `DEFRA_ID_SERVICE_ID` |
| Policy name | `DEFRA_ID_POLICY` |

You must also register two redirect URIs with Defra Identity and set them here:

| Redirect | Environment variable |
|---|---|
| Sign in | `DEFRA_ID_REDIRECT_URL`, for example `https://your-service/auth/sign-in-oidc` |
| Sign out | `DEFRA_ID_SIGN_OUT_REDIRECT_URL`, for example `https://your-service/auth/sign-out-oidc` |

Then:

- [ ] Request the `openid`, `offline_access` and `<client id>` scopes. The client ID scope
      is what makes Defra Identity issue an access token for your service.
- [ ] Send `serviceId`, `p` (the policy) and `response_mode=query` as provider parameters.
- [ ] Verify the token signature against the JWKS endpoint on every sign in.
- [ ] Store tokens server-side, keyed by `sessionId`.
- [ ] Set the session cookie to `SameSite=Lax` and `Secure` in production.
- [ ] Handle refresh tokens as single use.
- [ ] Implement `forceReselection` for change organisation.
- [ ] Implement `ssoOrgId` handling if users can arrive from other Defra services.
- [ ] End the Defra Identity session on sign out, not just your own.
- [ ] Validate `state` on the sign out redirect.
- [ ] Pass every user-supplied redirect through a safe redirect check.

## Project structure

```
src/
  index.js                  Entry point
  server.js                 Hapi server, plugin registration, Redis cache
  api/
    query.js                 Reusable GraphQL client for the external API
    get-cognito-token.js     Cognito client credentials token, cached in memory
    queries/
      permissions.js         The permissions GraphQL query document
  auth/
    get-oidc-config.js      OpenID Connect discovery
    verify-token.js         JWKS fetch and RS256 verification
    get-organisation-from-relationships.js   SBI and organisation name from the token
    get-role-from-roles.js  Role name from the token
    get-permissions.js      Permission groups from the external API
    refresh-tokens.js       Single use refresh token exchange
    get-sign-out-url.js     End session URL construction
    state.js                CSRF state for the sign out redirect
  constants/scope/
    land-details.js         LAND_DETAILS permission level scope constants
  plugins/
    auth.js                 Bell and Cookie strategies
    session.js              Yar temporary session data
    sso.js                  ssoOrgId interception
    router.js               Route registration
    content-security-policy.js
    headers.js              Security and cache headers
  routes/                   index, home, health, auth
  views/                    Nunjucks templates using Bulma
  client/                   SCSS, JS and images built by Vite into .public/
  config/                   Convict schemas and Nunjucks setup
  common/helpers/           CDP plumbing: logging, tracing, pulse, secure context, proxy, errors
  utils/get-safe-redirect.js
```

## Testing

```bash
npm test                  # unit and integration with coverage
npm run test:unit         # unit only, no Docker needed
npm run test:integration  # integration only, needs Docker
npm run test:watch        # watch mode
```

Unit tests mock their dependencies. Integration tests use `server.inject()` against a real
Redis started by Testcontainers (`test/setup/global-redis.js`) and mock only the
OpenID Connect discovery document, so the whole plugin and route stack is exercised.

## Debugging

VS Code launch configurations are in [.vscode/launch.json](.vscode/launch.json):

- **Dev: run server** launches the server with the inspector attached.
- **Debug current test** opens the inspector on the active test file.
- **Docker: Attach to App (together)** attaches to the container on port 9000.

## Configuration

All configuration goes through Convict in [src/config](src/config). Never read
`process.env` directly.

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `development` | Node environment |
| `REDIS_HOST` | `redis` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `REDIS_USERNAME` | | Redis ACL username (CDP environments) |
| `REDIS_PASSWORD` | | Redis password (CDP environments) |
| `REDIS_KEY_PREFIX` | `fcp-land-app-stub:` | Key prefix, isolates this service in a shared Redis |
| `USE_SINGLE_INSTANCE_CACHE` | `true` outside production | `false` connects as a cluster, as CDP's Elasticache requires |
| `REDIS_TLS` | `true` in production | Connect to Redis using TLS |
| `REDIS_TTL` | `86400000` | Session lifetime in milliseconds |
| `COOKIE_PASSWORD` | | Session cookie encryption key, at least 32 characters |
| `DEFRA_ID_WELL_KNOWN_URL` | | OpenID Connect discovery endpoint |
| `DEFRA_ID_CLIENT_ID` | | Client ID issued by Defra Identity |
| `DEFRA_ID_CLIENT_SECRET` | | Client secret issued by Defra Identity |
| `DEFRA_ID_SERVICE_ID` | | Service ID issued by Defra Identity |
| `DEFRA_ID_POLICY` | | Defra Identity policy name |
| `DEFRA_ID_REDIRECT_URL` | | Sign in redirect URI |
| `DEFRA_ID_SIGN_OUT_REDIRECT_URL` | | Sign out redirect URI |
| `DEFRA_ID_REFRESH_TOKENS` | `true` | Refresh expired access tokens automatically |
| `EXTERNAL_API_ENDPOINT` | `http://localhost:3001/graphql` | The FCP third party external API GraphQL endpoint |
| `EXTERNAL_API_TIMEOUT` | `10000` | Request timeout in milliseconds |
| `COGNITO_ENABLED` | `false` | Authenticate to the external API's CDP gateway with Cognito |
| `COGNITO_DOMAIN` | | Cognito domain, eg `your-service-c63f2.auth.eu-west-2.amazoncognito.com` |
| `COGNITO_CLIENT_ID` | | Cognito app client ID |
| `COGNITO_CLIENT_SECRET` | | Cognito app client secret |
| `COGNITO_SCOPE` | | OAuth2 scope to request, eg `land-app-resource-srv/access`. Omitted from the token request when unset |
| `HTTP_PROXY` | | Outbound proxy, set by the platform |
| `ENABLE_SECURE_CONTEXT` | `true` in production | Load `TRUSTSTORE_` certificates |

## Deployment

The service runs on the Core Delivery Platform (CDP). The Dockerfile has `development`,
`production_build` and `production` stages and builds from the CDP Node.js parent image.
Health checks are served from `/health` via `hapi-pulse`, logs are ECS formatted in
production, and requests are traced through the `x-cdp-request-id` header.

## SonarQube Cloud

Instructions for setting up SonarQube Cloud can be found in [sonar-project.properties](./sonar-project.properties).

## Licence

THIS INFORMATION IS LICENSED UNDER THE CONDITIONS OF THE OPEN GOVERNMENT LICENCE found at:

<http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3>

The following attribution statement MUST be cited in your products and applications when using this information.

> Contains public sector information licensed under the Open Government license v3

### About the licence

The Open Government Licence (OGL) was developed by the Controller of Her Majesty's Stationery Office (HMSO) to enable
information providers in the public sector to license the use and re-use of their information under a common open
licence.

It is designed to encourage use and re-use of information freely and flexibly, with only a few conditions.
