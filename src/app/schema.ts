import { defineSchema } from '@timber-js/app/params';
import z from 'zod/v4';
import { codec } from '@timber-js/app/codec';

// Segment params flow into backend API URLs, so keep them to a strict
// character set. Anything else is a 404 before it reaches the data layer (src/data).
const SLUG = /^[a-z0-9-]+$/i;
const MONTH_OR_DAY = /^[\dx]{1,2}$/i;

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
    // Not just /^\d{4}$/: the old section URLs (/gd/top, /gd/songs, …) must still
    // match so the browse middleware can redirect them to their detail pages.
    '[year]': z.string().regex(SLUG),
    // A v4 show id, or a pre-v4 show uuid from social cards cached before v4.
    // guid() rather than uuid(): accepts any 8-4-4-4-12 hex without enforcing
    // RFC version/variant bits.
    '[showId]': z.union([z.string().regex(/^show_[0-7][0-9a-hjkmnp-tv-z]{25}$/), z.guid()]),
    // A show page's date: YYYY-MM-DD.
    '[showDate]': z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    '[slug]': codec.string,
  },
});
