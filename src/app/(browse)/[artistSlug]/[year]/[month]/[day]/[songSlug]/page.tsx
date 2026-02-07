import PlayerManager from '@/components/PlayerManager';
import RelistenAPI from '@/lib/RelistenAPI';
import { createShowDate } from '@/lib/utils';
import { RawParams } from '@/types/params';
import { notFound } from 'next/navigation';

export default async function Page(props: { params: Promise<RawParams> }) {
  const params = await props.params;
  const { artistSlug, year, month, day } = params;

  if (!year || !month || !day) return notFound();

  const show = await RelistenAPI.fetchShow(artistSlug, year, createShowDate(year, month, day));

  return <PlayerManager {...params} show={show} />;
}

export const generateMetadata = async (props) => {
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
          url: song?.mp3_url, // Must be an absolute URL
        },
      ],
      images: show?.uuid
        ? [{ url: `/api/og?showUuid=${show.uuid}`, width: 550, height: 550 }]
        : [],
    },
  };
};
