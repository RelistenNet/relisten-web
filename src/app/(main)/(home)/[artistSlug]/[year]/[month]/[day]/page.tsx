import { fetchArtists, fetchShow } from '@/app/queries';
import { createShowDate } from '@/lib/utils';
import { notFound } from 'next/navigation';

export default () => null;

export const generateMetadata = async (props) => {
  const params = await props.params;
  const { artistSlug, year, month, day } = params;

  const artists = await fetchArtists();
  const name = artists?.find((a) => a.slug === artistSlug)?.name;

  if (!name) return notFound();

  const show = await fetchShow(artistSlug, year, [year, month, day].join('-'));

  return {
    title: [createShowDate(year, month, day), name].join(' | '),
    description: [show?.venue?.name, show?.venue?.location].filter((x) => x).join(' '),
  };
};
