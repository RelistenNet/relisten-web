import ArtistShowList from '@/components/detail/ArtistShowList';
import { showColumns } from '@/components/table/showColumns';
import RelistenAPI from '@/lib/RelistenAPI';
import { artistRecentlyAddedUrl } from '@/lib/urls';
import { deny, getSegmentParams } from '@timber-js/app/server';
import { SEGMENT_PATH } from './$segment';

/** Shows most recently added to Relisten. */
export default async function RecentlyAddedPage() {
  const { artistSlug } = getSegmentParams(SEGMENT_PATH);
  const [artist, rows] = await Promise.all([
    RelistenAPI.findArtist(artistSlug),
    RelistenAPI.fetchRecentlyAddedRows(artistSlug),
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

export const metadata = async () => {
  const artist = await RelistenAPI.findArtist(getSegmentParams(SEGMENT_PATH).artistSlug);
  return artist ? { title: `Recently Added | ${artist.name}` } : {};
};
