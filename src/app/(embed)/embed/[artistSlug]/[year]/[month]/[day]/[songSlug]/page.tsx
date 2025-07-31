import PlayerManager from '@/components/PlayerManager';
import SongsColumn from '@/components/SongsColumn';
import RelistenAPI from '@/lib/RelistenAPI';
import { createShowDate } from '@/lib/utils';
import { RawParams } from '@/types/params';
import { notFound } from 'next/navigation';
import { playImmediatelySearchParamsLoader } from '@/lib/searchParams/playImmediatelySearchParam';

interface EmbedSongPageProps {
  params: Promise<RawParams>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function EmbedSongPage({ params, searchParams }: EmbedSongPageProps) {
  const resolvedParams = await params;
  const { artistSlug, year, month, day } = resolvedParams;

  if (!year || !month || !day) return notFound();

  const show = await RelistenAPI.fetchShow(artistSlug, year, createShowDate(year, month, day));

  if (!show) {
    notFound();
  }

  // Parse search params on server
  const parsedSearchParams = await playImmediatelySearchParamsLoader.parseAndValidate(searchParams);
  const playImmediately = parsedSearchParams.playImmediately ?? true;

  return (
    <div className="flex h-full">
      <div className="w-full flex-shrink-0 overflow-y-auto border-r px-2">
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
      />
    </div>
  );
}

export async function generateMetadata(props) {
  const [params, artists] = await Promise.all([props.params, RelistenAPI.fetchArtists()]);
  const { artistSlug, year, month, day, songSlug } = params;

  const name = artists.find((a) => a.slug === artistSlug)?.name;

  if (!name) return notFound();
  if (!year || !month || !day) return notFound();

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
          url: song?.mp3_url,
        },
      ],
    },
  };
}
