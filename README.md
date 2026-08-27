# Relisten (web)

[![Build Status](https://github.com/RelistenNet/relisten-web/actions/workflows/node.js.yml/badge.svg)](https://github.com/RelistenNet/relisten-web/actions/workflows/node.js.yml)

Relisten is a simple free music streaming platform for recorded live concerts.

Visit https://relisten.net to find out more.

## iOS

Our mobile app is on the App Store/Play Store and also open source @ https://github.com/RelistenNet/relisten-mobile

## Sonos

Our Sonos app is on the Sonos store and also open source @ https://github.com/RelistenNet/relisten-sonos

## Development

Relisten web uses Node.js 22.18 or newer and pnpm 11. The Vite development server always uses the fixed local HTTPS certificate. Run the browser-session setup once before starting Vite:

```sh
pnpm install --frozen-lockfile
pnpm setup:browser-session
pnpm dev
```

The setup command also configures the local Relisten User Service. Follow [Browser-session development](docs/browser-session-development.md) for prerequisites, service startup, and authenticated account or library routes.

To use local Timber with production authentication, install only the local TLS
certificate and start the production proxy target:

```sh
pnpm setup:browser-session:production
env RELISTEN_WEB_SESSION_TARGET=production pnpm dev
```

Production-backed development does not require the .NET SDK, a RelistenApi
checkout, local databases, or local Google credentials.

## License

AGPL3
