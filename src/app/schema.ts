import { defineSchema } from '@timber-js/app/params';
import z from 'zod/v4';
import { codec } from '@timber-js/app/codec';

// Segment params flow into backend API URLs, so keep them to a strict
// character set. Anything else is a 404 before it reaches the data layer (src/data).
const SLUG = /^[a-z0-9-]+$/i;
const MONTH_OR_DAY = /^[\dx]{1,2}$/i;
const PLAYLIST_PREFIX = 'playlist_';
/** A TypeID's 26-character body: Crockford base32, first character 0–7. */
const PLAYLIST_ID_BODY = /^[0-7][0-9a-hjkmnp-tv-z]{25}$/;
/** A published playlist's share code. */
const PUBLIC_CODE = /^[0-9a-f]{32}$/;

export default defineSchema({
  segmentParams: {
    '[artistSlug]': z.string().regex(SLUG),
    '[day]': z.string().regex(MONTH_OR_DAY),
    '[month]': z.string().regex(MONTH_OR_DAY),
    // A song slug, or a song id (song_…): track menus link by id, since the
    // API's track songs carry no slug. The page redirects an id to its slug.
    '[songSlug]': z.union([
      z.string().regex(SLUG),
      z.string().regex(/^song_[0-9a-hjkmnp-tv-z]{8}$/),
    ]),
    '[tourSlug]': z.string().regex(SLUG),
    // Canonical venue slugs, or an imported venue's id (imported_venue_…).
    '[venueSlug]': z.string().regex(/^[a-z0-9_-]+$/i),
    // A four-digit year: anything else (/gd/top, /gd/foobar) is a 404 here.
    '[year]': z.string().regex(/^\d{4}$/),
    // A v4 show id, or a pre-v4 show uuid from social cards cached before v4.
    // guid() rather than uuid(): accepts any 8-4-4-4-12 hex without enforcing
    // RFC version/variant bits.
    '[showId]': z.union([z.string().regex(/^show_[0-7][0-9a-hjkmnp-tv-z]{25}$/), z.guid()]),
    // A show page's date: YYYY-MM-DD.
    '[showDate]': z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    '[slug]': codec.string,
    // A playlist: its share code (32 lowercase hex characters; anyone, while it's
    // published) or its id without the `playlist_` prefix (its creator's own:
    // /playlists/01m7tyqs5cep4vgwpf7m05ket2). The two never collide (32 vs 26
    // characters). Pages get the code, or the full id.
    '[playlist]': {
      parse: (value: string | string[] | undefined): string => {
        if (typeof value === 'string' && PUBLIC_CODE.test(value)) return value;
        if (typeof value === 'string' && PLAYLIST_ID_BODY.test(value)) {
          return PLAYLIST_PREFIX + value;
        }
        throw new Error('Not a playlist');
      },
      serialize: (playlist: string) => playlist.replace(PLAYLIST_PREFIX, ''),
    },
  },
});
