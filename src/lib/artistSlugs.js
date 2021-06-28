const artistSlugs = require('./rawSlugs');

if (typeof window === 'undefined') {
  fetch('https://api.relisten.net/api/v2/artists')
    .then((res) => res.json())
    .then((json) =>
      json.map((artist) => {
        if (artistSlugs.indexOf(artist.slug) === -1) {
          artistSlugs.push(artist.slug);
        }
      })
    );
}

module.exports = artistSlugs;
