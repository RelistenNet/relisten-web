import { RawParams } from '@/app/(main)/(home)/layout';
import { fetchShow } from '../layout';
import PlayerManager from './PlayerManager';
import { fetchArtists } from '@/app/queries';
import { notFound } from 'next/navigation';
import { createShowDate } from '@/lib/utils';

export default async function Page({ params }: { params: RawParams }) {
  const { artistSlug, year, month, day } = params;

  if (!year || !month || !day) return notFound();

  const show = await fetchShow(artistSlug, year, createShowDate(year, month, day));

  return <PlayerManager {...params} show={show} />;
}

export const generateMetadata = async ({ params }) => {
  const { artistSlug, year, month, day, songSlug } = params;

  const artists = await fetchArtists();
  const name = artists.find((a) => a.slug === artistSlug)?.name;

  if (!name) return notFound();
  if (!year || !month || !day) return notFound();

  const show = await fetchShow(artistSlug, year, createShowDate(year, month, day));

  const songs = show?.sources
    ?.map((source) => source?.sets?.map((set) => set?.tracks).flat())
    .flat();

  const songTitle = songs?.find((song) => song?.slug === songSlug)?.title;

  return {
    title: [songTitle, createShowDate(year, month, day), name].join(' | '),
  };
};
