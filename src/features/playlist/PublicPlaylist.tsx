import { href } from '@timber-js/app/routes';
import { deny } from '@timber-js/app/server';
import { METADATA_BASE } from '@/lib/constants';
import { ogImageSearchParams } from '@/lib/searchParams/ogImageSearchParams';
import { getPublicPlaylist } from '@/data/playlists';
import { PLAYLIST_CARD_SIZE } from './PlaylistCard';
import { PUBLIC_PLAYLISTS_CRUMB } from './PlaylistArticle';
import PlaylistDetail from './PlaylistDetail';
import ReportPlaylist from './ReportPlaylist';

/** A published playlist, open to anyone with the link. Private, archived and taken-down ones are 404s. */
export default async function PublicPlaylist({ publicCode }: { publicCode: string }) {
  const playlist = await getPublicPlaylist(publicCode);
  if (!playlist) deny(404);
  return (
    <PlaylistDetail
      playlist={playlist}
      publicPlaylistId={playlist.playlistId}
      crumb={PUBLIC_PLAYLISTS_CRUMB}
      byline={[`By ${playlist.creator}`]}
      actions={<ReportPlaylist publicCode={publicCode} />}
    />
  );
}

export async function publicPlaylistMetadata({ publicCode }: { publicCode: string }) {
  const playlist = await getPublicPlaylist(publicCode).catch(() => null);
  if (!playlist) return {};
  // The card (./PlaylistCard, at the route's opengraph-image) changes with the
  // playlist, so its URL carries the revision: link unfurlers cache by URL. The
  // image route isn't in the typed route map, so it's the page's href plus its file.
  // (timber.js#1330: href() can't name segment files yet.)
  const image = new URL(
    ogImageSearchParams.href(
      `${href('/playlists/[playlist]', { playlist: publicCode })}/opengraph-image.png`,
      {
        v: playlist.revision,
      }
    ),
    METADATA_BASE
  );
  return {
    title: `${playlist.name} | A playlist by ${playlist.creator}`,
    description: playlist.description,
    openGraph: {
      images: [
        {
          url: image.href,
          ...PLAYLIST_CARD_SIZE,
          alt: `${playlist.name}, a playlist by ${playlist.creator}`,
        },
      ],
    },
  };
}
