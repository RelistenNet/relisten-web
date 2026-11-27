import { defineSearchParams } from '@timber-js/app/search-params';
import { z } from 'zod/v4';

/**
 * The playlists listing: whose (`scope`: every published one, or the signed-in
 * listener's own), its order and its page. On "all", `sort` is the table's
 * ("-plays") and `cursor` the User Service's opaque next_cursor, valid only with
 * the sort it came from. Bounded: they reach the request and the cache key.
 */
export const publicPlaylistsSearchParams = defineSearchParams({
  scope: z.enum(['all', 'mine']).default('all'),
  sort: z.string().max(40).optional(),
  cursor: z.string().max(512).optional(),
});

/** The signed-in listener's own playlists, in the playlists listing. */
export const myPlaylistsHref = () =>
  publicPlaylistsSearchParams.href('/playlists', { scope: 'mine' });
