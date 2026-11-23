import { Link } from '@timber-js/app/client';
import { href } from '@timber-js/app/routes';
import { deny, redirect } from '@timber-js/app/server';
import { getOwnPlaylist } from '@/data/playlists';
import { getCurrentUser } from '@/data/session';
import { signInPageHref } from '@/lib/searchParams/sessionSearchParams';
import { PUBLIC_PLAYLISTS_CRUMB } from './PlaylistArticle';
import PlaylistDetail from './PlaylistDetail';

/**
 * Preview as Public (RE-52): the playlist as a reader will see it once it's
 * published (a public snapshot is the playlist as written), from the owner's own.
 */
export default async function PreviewPlaylist({ playlistId }: { playlistId: string }) {
  const pathname = href('/playlists/[playlist]/preview', { playlist: playlistId });
  const [result, me] = await Promise.all([getOwnPlaylist(playlistId), getCurrentUser()]);
  if (result.kind === 'signed-out') redirect(signInPageHref(pathname));
  if (result.kind === 'missing') deny(404);
  return (
    <PlaylistDetail
      playlist={result.playlist}
      // As the public page will read.
      crumb={PUBLIC_PLAYLISTS_CRUMB}
      byline={[`By ${me?.username ?? 'you'}`, 'Preview of the public page']}
      actions={
        <Link
          href={href('/playlists/[playlist]/edit', { playlist: playlistId })}
          className="header-action"
        >
          Back to Editing
        </Link>
      }
    />
  );
}

export async function previewPlaylistMetadata({ playlistId }: { playlistId: string }) {
  const result = await getOwnPlaylist(playlistId).catch(() => null);
  return {
    title: result?.kind === 'found' ? `[PREVIEW] ${result.playlist.name}` : '[PREVIEW] Playlist',
  };
}
