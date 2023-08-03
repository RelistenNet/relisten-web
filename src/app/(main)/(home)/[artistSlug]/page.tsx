import { fetchArtists } from '@/app/queries';
import { notFound } from 'next/navigation';

export default function Page() {
  return null;
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
