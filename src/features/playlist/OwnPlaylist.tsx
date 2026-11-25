import { Link } from '@timber-js/app/client';
import { href } from '@timber-js/app/routes';
import { deny, redirect } from '@timber-js/app/server';
import { denyIfUnavailable, getOwnPlaylist } from '@/data/playlists';
import { signInPageHref } from '@/lib/searchParams/sessionSearchParams';
import { PencilIcon } from 'lucide-react';
import ArchiveControl from './ArchiveControl';
import PublishControl from './PublishControl';
import { OWN_PLAYLISTS_CRUMB } from './PlaylistArticle';
import PlaylistDetail from './PlaylistDetail';

/**
 * One of the signed-in listener's playlists. Someone else's is a 404, as the User
 * Service answers. While its public page is up, its id URL goes there, so the
 * address bar holds the link to share.
 */
export default async function OwnPlaylist({
  playlistId,
  atPublicUrl = false,
  creator,
}: {
  playlistId: string;
  /** Rendered at its share code's URL (PlaylistPage), not its id's. */
  atPublicUrl?: boolean;
  /** Its creator's username, for the byline the public page shows everyone else. */
  creator?: string;
}) {
  const pathname = href('/playlists/[playlist]', { playlist: playlistId });
  const result = await getOwnPlaylist(playlistId).catch(denyIfUnavailable);
  if (result.kind === 'signed-out') redirect(signInPageHref(pathname));
  if (result.kind === 'missing') deny(404);
  const { playlist, archived, publicCode, takenDown } = result;
  // Archived and taken-down playlists have no public page (PublicPlaylist's 404s).
  if (!atPublicUrl && publicCode && !archived && !takenDown) {
    redirect(href('/playlists/[playlist]', { playlist: publicCode }));
  }

  return (
    <PlaylistDetail
      playlist={playlist}
      crumb={OWN_PLAYLISTS_CRUMB}
      byline={[
        creator && `By ${creator}`,
        archived && 'Archived',
        publicCode ? (
          <Link key="public" href={href('/playlists/[playlist]', { playlist: publicCode })}>
            Published
          </Link>
        ) : (
          'Private'
        ),
      ]}
      actions={
        archived ? (
          // Archived, it can't be edited or published: bringing it back is the one thing to do.
          <ArchiveControl playlistId={playlist.playlistId} archived />
        ) : (
          <>
            <ArchiveControl playlistId={playlist.playlistId} archived={false} />
            <PublishControl
              playlistId={playlist.playlistId}
              publicCode={publicCode}
              takenDown={takenDown}
            />
            <Link
              href={href('/playlists/[playlist]/edit', { playlist: playlistId })}
              className="header-action"
            >
              <PencilIcon className="size-4" aria-hidden />
              Edit
            </Link>
          </>
        )
      }
    />
  );
}

export async function ownPlaylistMetadata({ playlistId }: { playlistId: string }) {
  const result = await getOwnPlaylist(playlistId).catch(() => null);
  return result?.kind === 'found' ? { title: result.playlist.name } : { title: 'Playlist' };
}
