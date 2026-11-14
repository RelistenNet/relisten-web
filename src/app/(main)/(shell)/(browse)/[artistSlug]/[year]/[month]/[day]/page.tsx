import BrowseColumn from '@/features/browse/BrowseColumn';
import { loadArtists, loadShow } from '@/features/browse/load';
import { METADATA_BASE } from '@/lib/constants';
import { createShowDate } from '@/lib/utils';
import { getSegmentParams } from '@timber-js/app/server';
import { SEGMENT_PATH } from './$segment';

// The show layout renders its columns; the main column is empty until a song is picked.
export default () => <BrowseColumn />;

export const metadata = async () => {
  const params = getSegmentParams(SEGMENT_PATH);
  const artistSlug = params?.artistSlug as string | undefined;
  const year = params?.year as string | undefined;
  const month = params?.month as string | undefined;
  const day = params?.day as string | undefined;
  if (!artistSlug || !year || !month || !day) return {};

  const artists = await loadArtists();
  const name = artists?.find((a) => a.slug === artistSlug)?.name;

  if (!name) return {};

  const show = await loadShow(artistSlug, [year, month, day].join('-'));

  return {
    title: [createShowDate(year, month, day), name].join(' | '),
    description: [show?.venue?.name, show?.venue?.location].filter((x) => x).join(' '),
    openGraph: {
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
