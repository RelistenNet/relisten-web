import fs from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { Artist } from '../types';
import fetch from 'isomorphic-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

fetch('https://api.relisten.net/api/v2/artists')
  .then((res: Response) => res.json())
  .then((json: object[]) => {
    const str = json.map((artist: Artist) => `"${artist.slug}"`).join(',');

    fs.writeFileSync(__dirname + '/rawSlugs.ts', `export default [${str}]`);
  });
