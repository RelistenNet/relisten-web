import { getPublicPlaylist } from '@/data/playlists';
import { getCurrentUser } from '@/data/session';
import { isPlaylistId } from '@/domain/playlists';
import { sessionCookie } from '@/lib/session/sessionCookie';
import OwnPlaylist, { ownPlaylistMetadata } from './OwnPlaylist';
import PublicPlaylist, { publicPlaylistMetadata } from './PublicPlaylist';

// /playlists/{playlist}: one route for every playlist. A share code is the
// published playlist, which its creator sees with their controls (Edit,
// Publish); a playlist id is its creator's own, which goes to its share code
// while it's published.

/**
 * Whether the signed-in listener made it. Signed out costs no request; a User
 * Service outage reads as "not theirs", so the public page still renders.
 */
async function viewerCreated(creator: string): Promise<boolean> {
  if (sessionCookie.get() === null) return false;
  const user = await getCurrentUser().catch(() => null);
  return user?.username === creator;
}

export default async function PlaylistPage({ playlist }: { playlist: string }) {
  if (isPlaylistId(playlist)) return <OwnPlaylist playlistId={playlist} />;
  const published = await getPublicPlaylist(playlist);
  if (published && (await viewerCreated(published.creator))) {
    return <OwnPlaylist playlistId={published.playlistId} atPublicUrl />;
  }
  return <PublicPlaylist publicCode={playlist} />;
}

export function playlistPageMetadata({ playlist }: { playlist: string }) {
  return isPlaylistId(playlist)
    ? ownPlaylistMetadata({ playlistId: playlist })
    : publicPlaylistMetadata({ publicCode: playlist });
}
