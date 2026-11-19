# Browser sessions (sign-in and `/account`)

Accounts live in the Relisten **User Service** (`RelistenUserService` in the
RelistenApi repo), not in this app. The web app only reads the session and
forwards a few routes to the User Service.

Plain `pnpm dev` needs nothing extra. `/account` there always shows you signed out
(server-side lookups go to relisten.net), and its sign-in link 404s. Sign-in needs the User Service reachable _same-origin_
on the one local origin it accepts, `https://web.relisten.localhost:5173`, because
its cookies are `__Host-` cookies (HTTPS, bound to one origin).

Forwarded paths: `/auth/session/*`, `/api/user/v1/csrf`, `/v1/me`.
Who forwards them:

- **Production:** Traefik, in front of relisten.net.
- **PR previews:** the preview gateway.
- **Local development:** a dev-only Vite plugin in `vite.session.ts`, when
  `pnpm dev:session` is running.

## One-time setup

You need the .NET 10 SDK and a RelistenApi checkout next to this one
(`../RelistenApi`, or set `RELISTEN_API_CHECKOUT`).

```sh
brew install mkcert nss           # nss (certutil) is only needed so Firefox trusts the CA
brew install --cask dotnet-sdk@10
pnpm setup:browser-session
```

The setup script:

- trusts a local CA with mkcert;
- issues one certificate for `localhost`, `web.relisten.localhost` and
  `accounts.relisten.localhost`;
- writes the User Service's .NET user-secrets. These are the certificate paths, the
  CA path, and a stable OpenIddict client secret. The User Service won't start
  locally without them.

The files live in `~/Library/Application Support/Relisten/local-browser-session-tls`
on macOS and `${XDG_DATA_HOME:-~/.local/share}/relisten/local-browser-session-tls`
elsewhere (override with `RELISTEN_LOCAL_TLS_DIR`). Rerunning the script is safe: it reuses
the client secret, because the local database stores a hash of it.

Firefox keeps its own trust store. If it shows "Something doesn't look right",
install `nss`, rerun `mkcert -install`, and restart Firefox.

## Running

```sh
cd ../RelistenApi && ./start-local-databases.sh
cd ../RelistenApi && local-dev/accounts.sh dummy   # or `google` for your real account
pnpm dev:session
```

Open <https://web.relisten.localhost:5173/account> and sign in with a development
persona. `dev:session` runs Node with `--use-system-ca`, so server-side `fetch`
trusts the mkcert CA.

Locally the User Service listens on `https://accounts.relisten.localhost:5443`
(account API) and `https://localhost:5443` (sign-in issuer).

## Code map

- `src/data/session.ts`: `getCurrentUser()` reads `__Host-relisten_session` and
  asks `/v1/me`, deduped per request. An outage throws `SessionUnavailableError`
  so the error boundary renders it, rather than showing the user as signed out.
  The same file has the CSRF-protected mutations. Every call times out after
  10s.
- `src/features/account/`: the `/account` page, the sign-out / switch-account
  forms, and their server actions.
- `src/lib/session/config.ts`: origins and hosts. The web origin is the preview
  URL on previews, otherwise relisten.net (or the local origin in development).
  Each one can be overridden with `RELISTEN_WEB_ORIGIN`,
  `RELISTEN_USER_SERVICE_URL` or `RELISTEN_AUTH_ORIGIN`.
- `src/lib/searchParams/sessionSearchParams.ts`: builds the `return_to` query.
  Sign-in is just a link to `/auth/session/start?return_to=…`, with no client JS.
- `src/domain/account.ts`: hand-mirrored from `Relisten.Accounts.Contracts` in
  RelistenApi.
