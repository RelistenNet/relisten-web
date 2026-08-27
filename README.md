# Relisten (web)

[![Build Status](https://github.com/RelistenNet/relisten-web/actions/workflows/node.js.yml/badge.svg)](https://github.com/RelistenNet/relisten-web/actions/workflows/node.js.yml)

Relisten is a simple free music streaming platform for recorded live concerts.

Visit https://relisten.net to find out more.

## iOS

Our mobile app is on the App Store/Play Store and also open source @ https://github.com/RelistenNet/relisten-mobile

## Sonos

Our Sonos app is on the Sonos store and also open source @ https://github.com/RelistenNet/relisten-sonos

## Development

Relisten web uses Node.js 22.18 or newer and pnpm 11. Install dependencies with the locked versions:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Browser-session development also needs trusted local HTTPS and the local Relisten User Service. Follow [Browser-session development](docs/browser-session-development.md) before using authenticated account or library routes.

## License

AGPL3
