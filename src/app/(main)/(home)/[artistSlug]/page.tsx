import { fetchArtists } from '@/app/queries';
import ShowsColumn from '@/components/ShowsColumn';
import SongsColumn from '@/components/SongsColumn';
import TapesColumn from '@/components/TapesColumn';
import { API_DOMAIN } from '@/lib/constants';
import { Tape } from '@/types';
import ky from 'ky';
import { notFound } from 'next/navigation';

export const fetchRandomShow = async (slug?: string): Promise<Tape | undefined> => {
  if (!slug) return undefined;

  const parsed: Tape = await ky(`${API_DOMAIN}/api/v2/artists/${slug}/shows/random`, {
    cache: 'no-cache',
  }).json();

  return parsed;
};

export default async function Page({ params }) {
  const { artistSlug } = params;

  const randomShow = await fetchRandomShow(artistSlug);

  if (!randomShow) return null;

  const { display_date } = randomShow;
  const [year, month, day] = display_date?.split('-') ?? [];

  return (
    <>
      <ShowsColumn artistSlug={artistSlug} year={year} />
      <SongsColumn artistSlug={artistSlug} year={year} month={month} day={day} show={randomShow} />
      <TapesColumn artistSlug={artistSlug} year={year} month={month} day={day} show={randomShow} />
    </>
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
