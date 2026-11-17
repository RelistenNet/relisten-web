import PlayerManager from '@/components/PlayerManager';
import { loadBrowseTargetFor } from '@/lib/browseTarget';
import RelistenAPI from '@/lib/RelistenAPI';
import { showMetadata } from '@/lib/showMetadata';
import { sourceSearchParamsLoader } from '@/lib/searchParams/sourceSearchParam';
import { getSegmentParams } from '@timber-js/app/server';
import { SEGMENT_PATH } from './$segment';

function capitalizeFirstLetterOfEachWord(val: string): string {
  if (!val) return '';
  return String(val)
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// A quick-hit tab (/gd/songs?slug=&date=&track=) plays a track here; a year
// renders nothing in this column.
export default async function Page() {
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
  if (target.kind === 'show') return showMetadata(target);
  if (target.kind === 'artist') return {};

  const artists = await RelistenAPI.fetchAllArtists();
  const name = artists.find((a) => a.slug === target.artistSlug)?.name;
  if (!name) return {};

  const label =
    target.kind === 'year'
      ? target.year
      : target.kind === 'quick-hit'
        ? target.segment
        : target.kind;
  return {
    title: [capitalizeFirstLetterOfEachWord(label.replaceAll('-', ' ')), name].join(' | '),
  };
};
