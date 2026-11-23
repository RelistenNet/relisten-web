import { defineSearchParams } from '@timber-js/app/search-params';
import { z } from 'zod/v4';

/**
 * A public playlist listing's order and page. `sort` is the table's ("-plays");
 * `cursor` is the User Service's opaque next_cursor, valid only with the sort it
 * came from. Both are bounded: they reach the request and the cache key.
 */
export const publicPlaylistsSearchParams = defineSearchParams({
  sort: z.string().max(40).optional(),
  cursor: z.string().max(512).optional(),
});
