import PlayerManager from '@/components/PlayerManager';
import RelistenAPI from '@/lib/RelistenAPI';
import { isMobile } from '@/lib/isMobile';
import { createShowDate } from '@/lib/utils';
import { RawParams } from '@/types/params';
import { notFound, rawSegmentParams } from '@timber-js/app/server';

export default async function Page() {
  const params = await rawSegmentParams();
  const { artistSlug, year, month, day } = params;

  if (!year || !month || !day) return notFound();

  const [show, mobile] = await Promise.all([
    RelistenAPI.fetchShow(artistSlug, year, createShowDate(year, month, day)),
    isMobile(),
  ]);

  return <PlayerManager {...params} show={show} isMobile={mobile} />;
}

export const metadata = async () => {
  const [params, artists] = await Promise.all([rawSegmentParams().catch(() => null), RelistenAPI.fetchArtists()]);
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
          url: song?.mp3_url, // Must be an absolute URL
        },
      ],
      images: show?.uuid
        ? [{ url: `/api/og?showUuid=${show.uuid}`, width: 550, height: 550 }]
        : [],
    },
  };
};
