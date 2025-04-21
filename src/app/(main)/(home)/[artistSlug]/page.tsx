import { fetchArtists } from '@/app/queries';
import ShowsColumn from '@/components/ShowsColumn';
import SongsColumn from '@/components/SongsColumn';
import TapesColumn from '@/components/TapesColumn';
import { notFound } from 'next/navigation';
import React from 'react';
import { isMobile } from '../page';
import { fetchRandomShow } from './fetchRandomShow';

type PageProps = {
  params: Promise<{
    artistSlug: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  const { artistSlug } = await params;

  if (await isMobile()) return null;

  const randomShow = await fetchRandomShow(artistSlug).catch((err) => {
    const statusCode = err?.response?.status;

    if (statusCode !== 404) {
      console.log('failed random show', artistSlug, statusCode);
    }

    notFound();

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

export const generateMetadata = async (props) => {
  const params = await props.params;
  const { artistSlug } = params;

  const artists = await fetchArtists();
  const name = artists.find((a) => a.slug === artistSlug)?.name;

  if (!name) return notFound();

  return {
    title: name,
  };
};
