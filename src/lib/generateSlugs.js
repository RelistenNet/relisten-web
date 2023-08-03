import fs from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import fetch from 'isomorphic-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

fetch('https://api.relisten.net/api/v2/artists')
  .then((res) => res.json())
  .then((json) => {
    const str = json.map((artist) => `"${artist.slug}"`).join(',');

    fs.writeFileSync(
      __dirname + '/rawSlugs.ts',
      `/* eslint-disable-next-line */\nexport default [${str}]`
    );
  });
