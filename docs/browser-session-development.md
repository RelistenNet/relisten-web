# Browser-session development

Timber uses `https://web.relisten.localhost:5173` for browser-session development. The fixed HTTPS origin keeps secure cookies, OpenID Connect callback validation, and exact `Origin` checks equivalent to the production design.

## First-time setup

Install Node.js 22.18 or newer, pnpm, the .NET SDK, Docker, and `mkcert`. On macOS, install `mkcert` with:

```sh
brew install mkcert
```

From the `relisten-web` checkout, run:

```sh
pnpm install --frozen-lockfile
pnpm setup:browser-session
```

The setup command asks macOS to trust the local `mkcert` certificate authority. It then creates one certificate for these names:

- `web.relisten.localhost`
- `auth.relisten.localhost`
- `accounts.relisten.localhost`

The certificate, private key, public certificate authority, and local OpenIddict client secret stay under `~/Library/Application Support/Relisten/local-browser-session-tls`. The setup command copies the public `mkcert` certificate authority only. It does not copy the certificate authority private key.

The setup command also writes the certificate paths and confidential client secret to the User Service's .NET user-secrets store. It does not print the client secret or put the client secret in a command argument. Reruns preserve the existing secret because the local OpenIddict client stores a hash of that value.

The setup command expects the API checkout at `../RelistenApi`. Set `RELISTEN_API_CHECKOUT` to an absolute checkout path when the repositories are elsewhere. Set `RELISTEN_LOCAL_TLS_DIR` to an absolute path only when the standard application-support location cannot be used.

## Run the local services

Start PostgreSQL and Redis from the API checkout:

```sh
cd /path/to/RelistenApi
./start-local-databases.sh
```

Start the User Service in a second terminal:

```sh
cd /path/to/RelistenApi
dotnet run --project RelistenUserService/RelistenUserService.csproj
```

Start Timber in a third terminal:

```sh
cd /path/to/relisten-web
pnpm dev
```

Open `https://web.relisten.localhost:5173`. Vite uses a strict port, so startup fails if another process owns port 5173. The User Service uses HTTPS on loopback port 5443 and accepts only the configured Development hostnames.

The local profile enables development personas because the User Service runs in the `Development` environment. Development personas are unavailable in other environments.

## Proxy and credential boundaries

The Timber development server proxies these routes by path convention:

- `/auth/session/*`
- `/v1/library/*`
- `/v1/me`
- `/api/user/v1/csrf`

The proxy only makes these routes reachable from the fixed web origin. The User Service still decides whether a native bearer credential or opaque web-session cookie can use each endpoint. The User Service rejects requests that contain both credentials. It also enforces session-bound CSRF and the exact browser `Origin` for cookie-authenticated mutations.

The proxy replaces `X-Relisten-Web-Origin` with the fixed Timber origin. A browser cannot choose the origin that the User Service uses to reconstruct the OpenID Connect callback. The proxy does not forward arbitrary browser-supplied forwarding headers.

Timber's browser-session client uses relative URLs, `credentials: "include"`, and `cache: "no-store"`. It fetches a new CSRF token for each mutation. It does not store access tokens or refresh tokens.

## Checks

Run the client and proxy regression tests without starting the services:

```sh
pnpm test:browser-session
```

Install Chromium once for the current Playwright version when it is not already available:

```sh
pnpm exec playwright install chromium
```

The browser smoke expects PostgreSQL, Redis, the User Service, and Timber to be running already:

```sh
pnpm test:smoke:browser-session
```

The smoke enters through a development persona and the real authorization-code flow. It checks the browser-safe account contract, a library snapshot, and logout. It does not start services, query PostgreSQL, parse credentials, or inspect browser storage.

Use Browser or Chrome DevTools for deeper local verification. Keep any direct PostgreSQL inspection read-only and avoid printing cookies, validators, tokens, or user data.

## Production-backed development

The development proxy supports the production target:

```sh
RELISTEN_WEB_SESSION_TARGET=production pnpm dev
```

Do not use the production target until the production session routes, confidential client secret, and callback configuration have been deployed through the approved production plan. A production Google sign-in creates production session rows. Production sign-in and favorite mutations require explicit approval for this project.

## Setup failures

- If `mkcert` is missing, install it and rerun `pnpm setup:browser-session`.
- If macOS rejects the trust change, complete the normal system password prompt and rerun setup. Do not give the password to a script or another person.
- If the TLS files are absent, rerun `pnpm setup:browser-session`. Timber does not fall back to HTTP or disable certificate validation.
- If the saved client secret has broad file permissions or malformed content, setup stops before changing User Service configuration. Correct the file permissions or restore the prior local secret. Do not rotate the secret while the existing local OpenIddict client remains in the database.
- If port 5173 or 5443 is occupied, stop the conflicting process. The development servers do not choose a different origin or port.
