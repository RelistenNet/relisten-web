# Local browser sessions

Plain `pnpm dev` needs nothing extra. Sign-in, `/account`, and favorites need the
Relisten User Service reachable *same-origin* on the one local origin it accepts,
`https://web.relisten.localhost:5173`. In production Traefik routes these paths to
the User Service; locally Vite's proxy does (`dev/sessionDevServer.ts`).

Proxied paths: `/auth/session/*`, `/api/user/v1/csrf`, `/v1/me`, `/v1/library/*`.

## One-time setup

```sh
brew install mkcert nss     # nss (certutil) is only needed so Firefox trusts the CA too
pnpm setup:dev-session      # trusts a local CA, issues the cert, configures the User Service
```

Firefox keeps its own trust store: without `nss` installed before `mkcert -install`
it shows "Something doesn't look right". Install `nss`, rerun `mkcert -install`,
and restart Firefox.

The cert lives in `~/Library/Application Support/Relisten/dev-tls` (override with
`RELISTEN_LOCAL_TLS_DIR`). The script also writes the cert paths and a stable
OpenIddict client secret into the User Service's `dotnet user-secrets` store; it
expects the API checkout at `../RelistenApi` (override with `RELISTEN_API_CHECKOUT`).

## Running

```sh
cd ../RelistenApi && ./start-local-databases.sh
cd ../RelistenApi && dotnet run --project RelistenUserService/RelistenUserService.csproj
pnpm dev:session
```

Open <https://web.relisten.localhost:5173/account> and sign in with a development
persona. `dev:session` runs Node with `--use-system-ca` so both the Vite proxy and
server-side `fetch` trust the mkcert CA without any CA-file plumbing.

`RELISTEN_WEB_SESSION=production pnpm dev:session` proxies to `https://relisten.net`
instead — only once the production session routes are deployed.

## Code map

- `src/lib/session/server.ts` — `getCurrentUser()` (React.cache, reads the
  `__Host-relisten_session` cookie and calls `/v1/me` with the web-origin relay
  header), library reads, and CSRF-protected mutations.
- `src/lib/session/actions.ts` — server actions (`signOut`, `switchAccount`).
  They relay the User Service's `Set-Cookie` clears via `getCookieJar().setFromHeaders`.
- `src/app/(content)/account/page.tsx` — sign-in link / signed-in state.
- Sign-in is just a link to `/auth/session/start?return_to=…`; no client JS.

Server-side config (`src/lib/session/config.ts`): `RELISTEN_WEB_ORIGIN`,
`RELISTEN_USER_SERVICE_URL`, `RELISTEN_AUTH_ORIGIN`.
