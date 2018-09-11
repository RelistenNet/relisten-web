const { createServer } = require('http')
const { parse } = require('url')
const { readFileSync } = require('fs')
const next = require('next')
require('isomorphic-fetch')

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

const artistSlugs = require('./lib/artistSlugs')

app.prepare().then(() => {
  createServer((req, res) => {
    // Be sure to pass `true` as the second argument to `url.parse`.
    // This tells it to parse the query portion of the URL.
    const parsedUrl = parse(req.url, true)
    const { pathname, query, hostname } = parsedUrl
    const [artistSlug] = pathname.replace(/^\//, '').split('/')

    if (pathname === '/apple-app-site-association') {
      res.setHeader('Content-Type', 'application/json')

      if (hostname === 'beta.relisten.live' || hostname === 'beta.relisten.net') {
        res.end(readFileSync('./static/beta-apple-app-site-association'));
      }
      else {
        res.end(readFileSync('./static/apple-app-site-association'));
      }

      return;
    }

    // redirect relisten.live to relisten.net
    if (hostname === 'relisten.live') {
      return res.redirect(`https://relisten.net/${pathname}${query}`);
    }

    // catch custom routes
    if (artistSlugs.indexOf(artistSlug) !== -1) {
      return app.render(req, res, '/', query)
    }

    return handle(req, res, parsedUrl)
  })
  .listen(process.env.PORT || 3000, (err) => {
    if (err) throw err
    console.log('> Ready on http://localhost:' + (process.env.PORT || 3000))
  })
})
