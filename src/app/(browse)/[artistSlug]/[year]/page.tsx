import RelistenAPI from '@/lib/RelistenAPI';
import { getSegmentParams } from '@timber-js/app/server';
import { SEGMENT_PATH } from './$segment';

// /{artist}/{year}: the browse columns (slots) render the year; this page only
// supplies the title.
export default function YearPage() {
  return null;
}

export const metadata = async () => {
  const { artistSlug, year } = getSegmentParams(SEGMENT_PATH);
  if (!artistSlug || !year) return {};
  const artist = await RelistenAPI.findArtist(artistSlug);
  return artist?.name ? { title: [year, artist.name].join(' | ') } : {};
};
