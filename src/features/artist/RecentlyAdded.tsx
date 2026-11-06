import { loadRecentlyAdded } from './load';
import { findArtistBySlug } from '@/data/artists';
import ArtistShowList from '@/ui/show-table/ArtistShowList';
import { showColumns } from '@/ui/show-table/showColumns';
import { artistRecentlyAddedUrl } from '@/lib/urls';
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
      artistSlug={artistSlug}
      artistName={artist.name ?? artistSlug}
      title="Recently Added"
      subtitle="Shows most recently added to Relisten."
      rows={rows}
      columns={[showColumns.show, showColumns.added, showColumns.tapes, showColumns.plays]}
      defaultSort={{ id: 'added', dir: 'desc' }}
      pathname={artistRecentlyAddedUrl(artistSlug)}
    />
  );
}

export async function recentlyAddedMetadata({ artistSlug }: { artistSlug: string }) {
  const artist = await findArtistBySlug(artistSlug);
  return artist ? { title: `Recently Added | ${artist.name}` } : {};
}
