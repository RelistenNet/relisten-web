import { deny } from '@timber-js/app/server';
import { getPublicPlaylist } from '@/data/playlists';
import PlaylistDetail from './PlaylistDetail';

/** A published playlist, open to anyone with the link. Private, archived and taken-down ones are 404s. */
export default async function PublicPlaylist({ publicCode }: { publicCode: string }) {
  const playlist = await getPublicPlaylist(publicCode);
  if (!playlist) deny(404);
  return <PlaylistDetail playlist={playlist} byline={[`By ${playlist.owner}`]} />;
}

export async function publicPlaylistMetadata({ publicCode }: { publicCode: string }) {
  const playlist = await getPublicPlaylist(publicCode).catch(() => null);
  if (!playlist) return {};
  return {
    title: `${playlist.name} | A playlist by ${playlist.owner}`,
    description: playlist.description,
  };
}
