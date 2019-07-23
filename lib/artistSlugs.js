const artistSlugs = require('./rawSlugs');

fetch('https://relistenapi.alecgorge.com/api/v2/artists')
  .then(res => res.json())
  .then(json => json.map(artist => {
    if (artistSlugs.indexOf(artist.slug) === -1) {
      artistSlugs.push(artist.slug);
    }
  }));

module.exports = artistSlugs;
