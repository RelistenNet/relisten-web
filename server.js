const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

const routesRegex = require('./lib/customRoutes')

app.prepare().then(() => {
  createServer((req, res) => {
    // Be sure to pass `true` as the second argument to `url.parse`.
    // This tells it to parse the query portion of the URL.
    const parsedUrl = parse(req.url, true)
    const { pathname, query } = parsedUrl

    // catch custom routes
    if (routesRegex.test(pathname)) {
      return handle(req, res, parsedUrl)
    }

    // override custom routing to always go to '/'
    return app.render(req, res, '/', query)
    // if you want the server to handle normally use below:
    // handle(req, res, parsedUrl)
  })
  .listen(process.env.PORT || 3000, (err) => {
    if (err) throw err
    console.log('> Ready on http://localhost:' + (process.env.PORT || 3000))
  })
})
