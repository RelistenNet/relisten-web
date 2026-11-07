import { loadRandomShow } from '@/features/browse/load';
import TrackList from '@/ui/shows/TrackList';
import { splitShowDate } from '@/lib/utils';
import { getSegmentParams } from '@timber-js/app/server';
import { SEGMENT_PATH } from './$segment';

export default async function SongsDaySlot() {
  const { artistSlug } = getSegmentParams(SEGMENT_PATH);

  // Fetch show data
  const show = await loadRandomShow(artistSlug);

  if (!show) return null;

  const { year, month, day } = splitShowDate(show.date);

  return <TrackList artistSlug={artistSlug} year={year} month={month} day={day} show={show} />;
}
