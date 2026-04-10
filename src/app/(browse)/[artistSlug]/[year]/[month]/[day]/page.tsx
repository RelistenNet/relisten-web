import RelistenAPI from '@/lib/RelistenAPI';
import { createShowDate } from '@/lib/utils';
import { deny, getSegmentParams } from '@timber-js/app/server';

export default () => null;

export const metadata = async () => {
  const params = getSegmentParams();
  const artistSlug = params?.artistSlug as string | undefined;
  const year = params?.year as string | undefined;
  const month = params?.month as string | undefined;
  const day = params?.day as string | undefined;
  if (!artistSlug || !year || !month || !day) return {};

  const artists = await RelistenAPI.fetchArtists();
  const name = artists?.find((a) => a.slug === artistSlug)?.name;

  if (!name) return {};

  const show = await RelistenAPI.fetchShow(artistSlug, year, [year, month, day].join('-'));

  return {
    title: [createShowDate(year, month, day), name].join(' | '),
    description: [show?.venue?.name, show?.venue?.location].filter((x) => x).join(' '),
    openGraph: {
      images: show?.uuid
        ? [{ url: `/api/og?showUuid=${show.uuid}`, width: 550, height: 550 }]
        : [],
    },
  };
};
