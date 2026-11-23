import { defineSearchParams } from '@timber-js/app/search-params';
import { z } from 'zod/v4';
import { SEARCH_SCOPES } from '@/lib/search';

/**
 * /search: the query, which kind of result (All by default), and the page of
 * that kind. Bounded: each reaches the API request and the cache key. An
 * invalid value reads as its default.
 */
export const searchPageSearchParams = defineSearchParams({
  q: z.string().trim().max(100).default(''),
  scope: z.enum(SEARCH_SCOPES).default('all'),
  page: z.coerce.number().int().min(1).max(100).default(1),
});
