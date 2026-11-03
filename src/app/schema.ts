import { defineSchema } from '@timber-js/app/params';
import z from 'zod/v4';
import { codec } from '@timber-js/app/codec';
import type { Codec } from '@timber-js/app/codec';

// Segment params flow into backend API URLs, so keep them to a strict
// character set. Anything else is a 404 before it reaches RelistenAPI.
const SLUG = /^[a-z0-9-]+$/i;
const MONTH_OR_DAY = /^[\dx]{1,2}$/i;

const slugSegment: Codec<string> = {
  parse(value) {
    const str = Array.isArray(value) ? value[0] : value;
    if (!str || !SLUG.test(str)) throw new Error(`Invalid segment: '${str}'`);
    return str;
  },
  serialize(value) {
    return value;
  },
};

export default defineSchema({
  segmentParams: {
    '[artistSlug]': z.string().regex(SLUG),
    '[day]': z.string().regex(MONTH_OR_DAY),
    '[month]': z.string().regex(MONTH_OR_DAY),
    '[songSlug]': z.string().regex(SLUG),
    // Not just /^\d{4}$/: also carries quick-hit segments
    // (venues, songs, tours, top, recently-added, today-in-history).
    '[year]': z.string().regex(SLUG),
    // guid() rather than uuid(): accepts any 8-4-4-4-12 hex without
    // enforcing RFC version/variant bits.
    '[showUuid]': z.guid(),
    '[slug]': codec.string,

    '[...days]': codec.catchAll(slugSegment),
    '[...years]': codec.catchAll(slugSegment),

    '[[...rest]]': codec.optionalCatchAll(slugSegment),
  },
});
