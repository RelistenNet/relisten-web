const fs = require('fs');
require('isomorphic-fetch');

fetch('https://api.relisten.net/api/v2/artists')
  .then((res) => res.json())
  .then((json) => {
    const str = json.map((artist) => `"${artist.slug}"`).join(',');

    fs.writeFileSync(__dirname + '/rawSlugs.js', `module.exports = [${str}]`);
  });
