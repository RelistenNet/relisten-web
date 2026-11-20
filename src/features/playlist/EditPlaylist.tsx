import { Link } from '@timber-js/app/client';
import { href } from '@timber-js/app/routes';
import { deny, redirect } from '@timber-js/app/server';
import { getOwnPlaylist } from '@/data/playlists';
import { signInHref } from '@/lib/searchParams/sessionSearchParams';
import { loadPlaylistView } from './load';
import PlaylistEditor from './PlaylistEditor';

/**
 * The editor for one of the signed-in listener's playlists (docs/playlist-editing.md).
 * The server resolves tracks and renders prose; the editor lays out its draft
 * from them. An archived playlist can't be edited, so it goes back to its page.
 */
export default async function EditPlaylist({ playlistId }: { playlistId: string }) {
  const pathname = href('/account/playlists/[playlistId]/edit', { playlistId });
  const viewHref = href('/account/playlists/[playlistId]', { playlistId });
  const result = await getOwnPlaylist(playlistId);
  if (result.kind === 'signed-out') redirect(signInHref(pathname));
  if (result.kind === 'missing') deny(404);
  if (result.archived) redirect(viewHref);
  const { resolved } = await loadPlaylistView(result.playlist);

  return (
    <PlaylistEditor
      // A draft per playlist: another playlist's editor starts fresh.
      key={result.playlist.playlistId}
      initial={result.playlist}
      resolved={resolved}
      viewHref={viewHref}
      byline={[
        <Link key="account" href={href('/account')}>
          Your playlists
        </Link>,
        'Editing',
      ]}
    />
  );
}

export async function editPlaylistMetadata({ playlistId }: { playlistId: string }) {
  const result = await getOwnPlaylist(playlistId).catch(() => null);
  return { title: result?.kind === 'found' ? `Editing ${result.playlist.name}` : 'Playlist' };
}
