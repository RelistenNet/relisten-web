import { fetchArtists } from '@/app/queries';
import ShowsColumn from '@/components/ShowsColumn';
import SongsColumn from '@/components/SongsColumn';
import TapesColumn from '@/components/TapesColumn';
import { API_DOMAIN } from '@/lib/constants';
import { Tape } from '@/types';
import ky from 'ky-universal';
import { notFound } from 'next/navigation';
import { useIsMobile } from '../page';
import React from 'react';

export const fetchRandomShow = async (slug?: string): Promise<Tape | undefined> => {
  if (!slug) return undefined;

  const parsed: Tape = await ky(`${API_DOMAIN}/api/v2/artists/${slug}/shows/random`, {
    cache: 'no-cache',
  }).json();

  return parsed;
};

export default async function Page({ params }) {
  const { artistSlug } = params;

  if (useIsMobile()) return null;

  const randomShow = await fetchRandomShow(artistSlug).catch((err) => {
    const statusCode = err?.response?.status;

    console.log('failed random show', artistSlug, statusCode);

    return null;
  });

  if (!randomShow) return notFound();

  const { display_date } = randomShow ?? {};
  const [year, month, day] = display_date?.split('-') ?? [];

  if (!year || !month || !day) return notFound();

  return (
    <React.Fragment key={artistSlug}>
      <ShowsColumn artistSlug={artistSlug} year={year} />
      <SongsColumn artistSlug={artistSlug} year={year} month={month} day={day} show={randomShow} />
      <TapesColumn artistSlug={artistSlug} year={year} month={month} day={day} show={randomShow} />
    </React.Fragment>
  );
}

export const generateMetadata = async ({ params }) => {
  const { artistSlug } = params;

  const artists = await fetchArtists();
  const name = artists.find((a) => a.slug === artistSlug)?.name;

  if (!name) return notFound();

  return {
    title: name,
  };
};
