import { Link } from '@timber-js/app/client';
import { href } from '@timber-js/app/routes';
import { deny, redirect } from '@timber-js/app/server';
import { getOwnPlaylist } from '@/data/playlists';
import { getCurrentUser } from '@/data/session';
import { signInHref } from '@/lib/searchParams/sessionSearchParams';
import PlaylistDetail from './PlaylistDetail';

/**
 * Preview as Public (RE-52): the playlist as a reader will see it once it's
 * published (a public snapshot is the playlist as written), from the owner's own.
 */
export default async function PreviewPlaylist({ playlistId }: { playlistId: string }) {
  const pathname = href('/account/playlists/[playlistId]/preview', { playlistId });
  const [result, me] = await Promise.all([getOwnPlaylist(playlistId), getCurrentUser()]);
  if (result.kind === 'signed-out') redirect(signInHref(pathname));
  if (result.kind === 'missing') deny(404);
  return (
    <PlaylistDetail
      playlist={result.playlist}
      byline={[`By ${me?.username ?? 'you'}`, 'Preview of the public page']}
      actions={
        <Link
          href={href('/account/playlists/[playlistId]/edit', { playlistId })}
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
