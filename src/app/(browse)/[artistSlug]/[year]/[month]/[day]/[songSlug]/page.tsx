import PlayerManager from '@/components/PlayerManager';
import { loadBrowseTargetFor } from '@/lib/browseTarget';
import RelistenAPI from '@/lib/RelistenAPI';
import { showMetadata } from '@/lib/showMetadata';
import { sourceSearchParamsLoader } from '@/lib/searchParams/sourceSearchParam';
import { getSegmentParams } from '@timber-js/app/server';
import { SEGMENT_PATH } from './$segment';

export default async function Page() {
  // [artistSlug]/access.ts already 404ed a missing show or track.
  const target = await loadBrowseTargetFor(getSegmentParams(SEGMENT_PATH));
  if (target.kind !== 'show' || !target.track) return null;

  const { artistSlug, date, show, track } = target;
  const artists = await RelistenAPI.fetchAllArtists();
  const artistName = artists?.find((a) => a.slug === artistSlug)?.name;
  const { source } = sourceSearchParamsLoader.get();

  return (
    <PlayerManager
      artistSlug={artistSlug}
      year={date.year}
      month={date.month}
      day={date.day}
      songSlug={track}
      show={show}
      artistName={artistName}
      source={source}
    />
  );
}

export const metadata = async () => {
  const target = await loadBrowseTargetFor(getSegmentParams(SEGMENT_PATH));
  return target.kind === 'show' ? showMetadata(target) : {};
};
