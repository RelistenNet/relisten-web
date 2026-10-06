# Relisten (web)

[![Build Status](https://github.com/RelistenNet/relisten-web/actions/workflows/node.js.yml/badge.svg)](https://github.com/RelistenNet/relisten-web/actions/workflows/node.js.yml)

Relisten is a simple free music streaming platform for recorded live concerts.

Visit https://relisten.net to find out more.

## iOS

Our mobile app is on the App Store/Play Store and also open source @ https://github.com/RelistenNet/relisten-mobile

## Sonos

Our Sonos app is on the Sonos store and also open source @ https://github.com/RelistenNet/relisten-sonos

## Development

### To run

```
  #### install node
  #### install pnpm (npm i -g pnpm)
  $ pnpm i
  $ npm start
```

### Commit formatting

Run `pnpm install` to enable the repository’s native Git hooks. Commits use lint-staged and oxfmt to format
and re-stage supported files while preserving unstaged changes. Formatter
ignores and the root `.gitignore` apply. Use `git commit --no-verify` for an
intentional one-off bypass.

## License

AGPL3
