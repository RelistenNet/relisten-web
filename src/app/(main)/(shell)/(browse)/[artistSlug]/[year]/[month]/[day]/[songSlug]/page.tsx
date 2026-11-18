import BrowseColumn from '@/features/browse/BrowseColumn';
import { loadArtists, loadShow, loadTrackPage } from '@/features/browse/load';
import { METADATA_BASE } from '@/lib/constants';
import PlayerManager from '@/player/PlayerManager';
import { proxyStreamUrl } from '@/player/proxyStreamUrl';
import { createShowDate } from '@/lib/utils';
import { deny, getSegmentParams } from '@timber-js/app/server';
import { trackSearchParams } from '@/lib/searchParams/trackSearchParams';
import { SEGMENT_PATH } from './$segment';

// Arriving here plays the track (a shared link, a reload, a link from another
// page). Clicking a track in the show's list plays it without coming here: the
// list holds the tapes, and the URL follows playback.
export default async function Page() {
  const { artistSlug, year, month, day, songSlug } = getSegmentParams(SEGMENT_PATH);

  if (!year || !month || !day) return deny(404);

  const { show, tape, artistName } = await loadTrackPage(
    'site',
    { artistSlug, year, month, day, songSlug },
    trackSearchParams
  );

  return (
    <BrowseColumn>
      <PlayerManager
        show={show}
        tape={tape}
        artistSlug={artistSlug}
        artistName={artistName}
        songSlug={songSlug}
        play
      />
    </BrowseColumn>
  );
}

export const metadata = async () => {
  const { artistSlug, year, month, day, songSlug } = getSegmentParams(SEGMENT_PATH);

  const artists = await loadArtists();

  const name = artists?.find((a) => a.slug === artistSlug)?.name;

  if (!name || !year || !month || !day) return {};

  const show = await loadShow(artistSlug, createShowDate(year, month, day));

  const songs = show?.sources
    ?.map((source) => source?.sets?.map((set) => set?.tracks).flat())
    .flat();

  const song = songs?.find((song) => song?.slug === songSlug);

  return {
    title: [song?.title, createShowDate(year, month, day), name].filter((x) => x).join(' | '),
    description: [show?.venue?.name, show?.venue?.location].filter((x) => x).join(' '),
    openGraph: {
      audio: [
        {
          url: proxyStreamUrl(song?.mp3Url),
        },
      ],
      images: show?.id
        ? [
            {
              url: `${METADATA_BASE.origin}/album-art/${show.id}.png`,
              width: 550,
              height: 550,
            },
          ]
        : [],
    },
  };
};
