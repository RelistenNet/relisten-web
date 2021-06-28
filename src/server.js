const { createServer } = require('http');
const { parse } = require('url');
const { readFileSync } = require('fs');
const next = require('next');
const nextConfig = require('../next.config.js');
require('isomorphic-fetch');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev, conf: nextConfig });
const handle = app.getRequestHandler();

const artistSlugs = require('./lib/artistSlugs');

app.prepare().then(() => {
  createServer((req, res) => {
    // Be sure to pass `true` as the second argument to `url.parse`.
    // This tells it to parse the query portion of the URL.
    const parsedUrl = parse(req.url, true);
    const { pathname, query } = parsedUrl;
    const [artistSlug] = pathname.replace(/^\//, '').split('/');

    if (pathname === '/apple-app-site-association') {
      res.setHeader('Content-Type', 'application/json');

      return res.end(readFileSync('./static/apple-app-site-association'));
    } else if (pathname == '/privacy_policy.html') {
      res.setHeader('Content-Type', 'text/html');

      return res.end(readFileSync('./static/privacy_policy.html'));
    }

    // redirect relisten.live to relisten.net
    if (req.headers.host === 'relisten.live') {
      res.writeHead(301, {
        Location: `https://relisten.net${req.url}`,
      });

      res.end();

      return;
    }

    // catch custom routes
    if (artistSlugs.indexOf(artistSlug) !== -1) {
      return app.render(req, res, '/', query);
    }

    return handle(req, res, parsedUrl);
  }).listen(process.env.PORT || 3000, (err) => {
    if (err) throw err;
    console.log('> Ready on http://localhost:' + (process.env.PORT || 3000));
  });
});
