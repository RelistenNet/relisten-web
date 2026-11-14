import BrowseColumn from '@/features/browse/BrowseColumn';
import { loadArtist } from '@/features/browse/load';
import { getSegmentParams } from '@timber-js/app/server';
import { SEGMENT_PATH } from './$segment';

// /{artist}/{year}: no show picked yet, so the songs, tapes and main columns
// are empty.
export default function YearPage() {
  return (
    <>
      <BrowseColumn />
      <BrowseColumn />
      <BrowseColumn />
    </>
  );
}

export const metadata = async () => {
  const { artistSlug, year } = getSegmentParams(SEGMENT_PATH);
  if (!artistSlug || !year) return {};
  const artist = await loadArtist(artistSlug);
  return artist?.name ? { title: [year, artist.name].join(' | ') } : {};
};
