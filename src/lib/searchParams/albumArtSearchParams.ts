import { defineSearchParams } from '@timber-js/app/search-params';
import { z } from 'zod/v4';

/** The album-art route's query: shared so pages build its URLs with `href()`. */
export const albumArtSearchParams = defineSearchParams({
  // Small allow-list so each show has at most a few distinct renders.
  // Anything else falls back to the default.
  size: z.enum(['256', '512', '1024']).default('1024'),
  debug: z.stringbool().default(false),
});
