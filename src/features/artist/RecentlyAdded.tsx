import { href } from '@timber-js/app/routes';
import { loadRecentlyAdded } from './load';
import { findArtistBySlug } from '@/data/artists';
import ArtistShowList from './ArtistShowList';
import { showColumns } from '@/ui/shows/columns';
import { playShowColumn, queueShowColumn } from '@/player/showColumns';
import { deny } from '@timber-js/app/server';

/** Shows most recently added to Relisten. */
export default async function RecentlyAdded({ artistSlug }: { artistSlug: string }) {
  const [artist, rows] = await Promise.all([
    findArtistBySlug(artistSlug),
    loadRecentlyAdded(artistSlug),
  ]);
  if (!artist) deny(404);
  return (
    <ArtistShowList
      artist={artist}
      title="Recently Added"
      // meta={['Shows most recently added to Relisten']}
      rows={rows}
      columns={[
        playShowColumn,
        showColumns.show,
        showColumns.added,
        showColumns.tapes,
        showColumns.plays,
        queueShowColumn,
      ]}
      defaultSort={{ id: 'added', dir: 'desc' }}
      pathname={href('/artists/[artistSlug]/recently-added', { artistSlug })}
    />
  );
}

export async function recentlyAddedMetadata({ artistSlug }: { artistSlug: string }) {
  const artist = await findArtistBySlug(artistSlug);
  return artist ? { title: `Recently Added | ${artist.name}` } : {};
}
