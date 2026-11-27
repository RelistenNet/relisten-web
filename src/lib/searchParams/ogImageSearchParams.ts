import { defineSearchParams } from '@timber-js/app/search-params';
import { z } from 'zod/v4';

/**
 * A page's OG image query. `v` is the revision it shows: link unfurlers cache by
 * URL, so a new revision is a new URL. The image route doesn't read it.
 */
export const ogImageSearchParams = defineSearchParams({
  v: z.coerce.number().int().nonnegative().optional(),
});
