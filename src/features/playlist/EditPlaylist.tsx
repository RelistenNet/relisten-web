import { href } from '@timber-js/app/routes';
import { deny, redirect } from '@timber-js/app/server';
import { getOwnPlaylist } from '@/data/playlists';
import { signInPageHref } from '@/lib/searchParams/sessionSearchParams';
import { loadPlaylistResolved } from './load';
import { OWN_PLAYLISTS_CRUMB } from './PlaylistArticle';
import PlaylistEditor from './PlaylistEditor';

/**
 * The editor for one of the signed-in listener's playlists (docs/playlist-editing.md).
 * The server resolves tracks and renders prose; the editor lays out its draft
 * from them. An archived playlist can't be edited, so it goes back to its page.
 */
export default async function EditPlaylist({ playlistId }: { playlistId: string }) {
  const pathname = href('/playlists/[playlist]/edit', { playlist: playlistId });
  const viewHref = href('/playlists/[playlist]', { playlist: playlistId });
  const result = await getOwnPlaylist(playlistId);
  if (result.kind === 'signed-out') redirect(signInPageHref(pathname));
  if (result.kind === 'missing') deny(404);
  if (result.archived) redirect(viewHref);
  const resolved = await loadPlaylistResolved(result.playlist);

  return (
    <PlaylistEditor
      // A draft per playlist: another playlist's editor starts fresh.
      key={result.playlist.playlistId}
      initial={result.playlist}
      resolved={resolved}
      viewHref={viewHref}
      publicCode={result.publicCode}
      takenDown={result.takenDown}
      // The page's, so opening the editor moves nothing.
      crumb={OWN_PLAYLISTS_CRUMB}
      byline={['Editing']}
    />
  );
}

export async function editPlaylistMetadata({ playlistId }: { playlistId: string }) {
  const result = await getOwnPlaylist(playlistId).catch(() => null);
  return {
    title: result?.kind === 'found' ? `[EDITING] ${result.playlist.name}` : '[EDITING] Playlist',
  };
}
