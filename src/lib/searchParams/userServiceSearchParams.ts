import { defineSearchParams } from '@timber-js/app/search-params';
import { z } from 'zod/v4';
import { SEARCH_SCOPES } from '@/lib/search';

/**
 * The User Service's `/v1/search` query (catalog and playlist search, merged).
 * The path is the User Service's, not a timber route, so `href()` can't type it;
 * the query still goes through this definition.
 */
export const userServiceSearchParams = defineSearchParams({
  q: z.string(),
  scope: z.enum(SEARCH_SCOPES),
  page: z.coerce.number().int().min(1),
  /** Typeahead: the API answers faster and leaves recordings and reviews out of All. */
  typing: z.stringbool(),
});
