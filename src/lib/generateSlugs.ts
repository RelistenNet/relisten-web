import fs from 'fs';
import { Artist } from '../types';
require('isomorphic-fetch');

fetch('https://api.relisten.net/api/v2/artists')
  .then((res) => res.json())
  .then((json) => {
    const str = json.map((artist: Artist) => `"${artist.slug}"`).join(',');

    fs.writeFileSync(__dirname + '/rawSlugs.ts', `module.exports = [${str}]`);
  });
