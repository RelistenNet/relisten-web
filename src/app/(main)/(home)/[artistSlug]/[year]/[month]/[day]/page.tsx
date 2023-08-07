import { fetchArtists } from '@/app/queries';
import { createShowDate } from '@/lib/utils';
import { notFound } from 'next/navigation';

export default () => null;

export const generateMetadata = async ({ params }) => {
  const { artistSlug, year, month, day } = params;

  const artists = await fetchArtists();
  const name = artists?.find((a) => a.slug === artistSlug)?.name;

  if (!name) return notFound();

  return {
    title: [createShowDate(year, month, day), name].join(' | '),
  };
};
