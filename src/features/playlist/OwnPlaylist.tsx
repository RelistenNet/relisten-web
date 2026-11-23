import { Link } from '@timber-js/app/client';
import { href } from '@timber-js/app/routes';
import { deny, redirect } from '@timber-js/app/server';
import { getOwnPlaylist } from '@/data/playlists';
import { signInHref } from '@/lib/searchParams/sessionSearchParams';
import { PencilIcon } from 'lucide-react';
import PublishControl from './PublishControl';
import { OWN_PLAYLISTS_CRUMB } from './PlaylistArticle';
import PlaylistDetail from './PlaylistDetail';

/** One of the signed-in listener's playlists. Someone else's is a 404, as the User Service answers. */
export default async function OwnPlaylist({ playlistId }: { playlistId: string }) {
  const pathname = href('/account/playlists/[playlistId]', { playlistId });
  const result = await getOwnPlaylist(playlistId);
  if (result.kind === 'signed-out') redirect(signInHref(pathname));
  if (result.kind === 'missing') deny(404);
  const { playlist, archived, publicCode, takenDown } = result;

  return (
    <PlaylistDetail
      playlist={playlist}
      crumb={OWN_PLAYLISTS_CRUMB}
      byline={[
        archived && 'Archived',
        publicCode ? (
          <Link key="public" href={href('/playlists/[publicCode]', { publicCode })}>
            Published
          </Link>
        ) : (
          'Private'
        ),
      ]}
      actions={
        !archived && (
          <>
            <PublishControl
              playlistId={playlist.playlistId}
              publicCode={publicCode}
              takenDown={takenDown}
            />
            <Link
              href={href('/account/playlists/[playlistId]/edit', { playlistId })}
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
