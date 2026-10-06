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

Use Node.js 24 or newer and the pnpm version pinned in `package.json`. A root
`pnpm install` installs Husky automatically. Commits run the locally installed
`lint-staged` and `oxfmt` on staged supported files, then stage their formatting
changes. Unstaged hunks in partially staged files are preserved; formatter errors
abort the commit and restore the original changes. Formatter ignore rules and the root `.gitignore`
still apply. No packages are downloaded during commits.

Run `pnpm run prepare` to reinstall the hooks after an install with scripts
disabled. Setup skips CI, production-only installs, and source archives without
`.git`. If another hook manager or existing Git hooks are detected, setup warns
and leaves them alone; review that setup before opting into Husky. For an
intentional one-off bypass, use `HUSKY=0 git commit ...`.

## License

AGPL3
