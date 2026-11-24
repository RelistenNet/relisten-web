import { getSegmentParams } from '@timber-js/app/server';
import { getOwnPlaylist, getPublicPlaylist } from '@/data/playlists';
import { isPlaylistId, type PlaylistContent } from '@/domain/playlists';
import { loadPlaylistView } from '@/features/playlist/load';
import { isTrackRow } from '@/features/playlist/spec';
import { songRowItem } from '@/player/queue/items';
import type { QueueContext } from '@/player/queue/model';
import { SEGMENT_PATH } from './$segment';

// A playlist's play queue, for a playlists table's Play button: the same items
// its page plays, fetched on click. The param is the playlists route's: a share
// code (published, the same for everyone) or an id (the listener's own).

const NO_STORE = { 'Cache-Control': 'no-store' };

/** The page's queue for this playlist. A public one credits its plays to it. */
async function queueFor(content: PlaylistContent, playlistId?: string): Promise<QueueContext> {
  const { view } = await loadPlaylistView(content);
  const items = view.rows.flatMap((r) => (isTrackRow(r) ? (songRowItem(r) ?? []) : []));
  return playlistId ? { label: view.name, items, playlistId } : { label: view.name, items };
}

export async function GET() {
  const { playlist } = getSegmentParams(SEGMENT_PATH);
  try {
    if (isPlaylistId(playlist)) {
      const own = await getOwnPlaylist(playlist);
      if (own.kind !== 'found')
        return new Response('Not found', { status: 404, headers: NO_STORE });
      return Response.json(await queueFor(own.playlist), {
        headers: { 'Cache-Control': 'private, no-cache' },
      });
    }
    const published = await getPublicPlaylist(playlist);
    if (!published) return new Response('Not found', { status: 404, headers: NO_STORE });
    return Response.json(await queueFor(published, published.playlistId), {
      // The public page's cache is a minute too (publicPlaylistCached).
      headers: { 'Cache-Control': 'public, max-age=60' },
    });
  } catch {
    // deny() surfaces as a 500 in route handlers; an outage reads as unavailable.
    return new Response('Playlists aren’t available right now', { status: 503, headers: NO_STORE });
  }
}
