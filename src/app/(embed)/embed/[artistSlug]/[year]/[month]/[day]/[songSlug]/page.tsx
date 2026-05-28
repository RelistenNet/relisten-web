import PlayerManager from '@/components/PlayerManager';
import SongsColumn from '@/components/SongsColumn';
import { proxyStreamUrl } from '@/lib/proxyStreamUrl';
import RelistenAPI from '@/lib/RelistenAPI';
import { isMobile } from '@/lib/isMobile';
import { createShowDate } from '@/lib/utils';
import { deny, getSegmentParams } from '@timber-js/app/server';
import { playImmediatelySearchParamsLoader } from '@/lib/searchParams/playImmediatelySearchParam';
import { SEGMENT_PATH } from './$segment';

export default async function EmbedSongPage() {
  const { artistSlug, year, month, day, songSlug } = getSegmentParams(SEGMENT_PATH);

  const resolvedParams = { artistSlug, year, month, day, songSlug };

  if (!year || !month || !day) return deny(404);

  const [show, mobile] = await Promise.all([
    RelistenAPI.fetchShow(artistSlug, year, createShowDate(year, month, day)),
    isMobile(),
  ]);

  if (!show) {
    deny(404);
  }

  // Parse search params on server
  const parsedSearchParams = await playImmediatelySearchParamsLoader.get();
  const playImmediately = parsedSearchParams.playImmediately ?? true;

  return (
    <div className="flex h-full">
      <div className="w-full shrink-0 overflow-y-auto border-r px-2">
        <SongsColumn
          artistSlug={artistSlug}
          year={year}
          month={month}
          day={day}
          show={show}
          routePrefix="/embed"
        />
      </div>
      <PlayerManager
        {...resolvedParams}
        show={show}
        routePrefix="/embed"
        playImmediately={playImmediately}
        isMobile={mobile}
      />
    </div>
  );
}

export async function metadata() {
  const params = getSegmentParams(SEGMENT_PATH);
  const artists = await RelistenAPI.fetchArtists();
  const artistSlug = params?.artistSlug as string | undefined;
  const year = params?.year as string | undefined;
  const month = params?.month as string | undefined;
  const day = params?.day as string | undefined;
  const songSlug = params?.songSlug as string | undefined;

  const name = artists?.find((a) => a.slug === artistSlug)?.name;

  if (!name || !year || !month || !day) return {};

  const show = await RelistenAPI.fetchShow(artistSlug, year, createShowDate(year, month, day));

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
          url: proxyStreamUrl(song?.mp3_url),
        },
      ],
    },
  };
}
