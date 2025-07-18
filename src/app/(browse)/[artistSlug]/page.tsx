import RelistenAPI from '@/lib/RelistenAPI';
import { isMobile } from '@/lib/isMobile';
import { notFound } from 'next/navigation';

type PageProps = {
  params: Promise<{
    artistSlug: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  const { artistSlug } = await params;

  if (await isMobile()) return null;

  const randomShow = await RelistenAPI.fetchRandomShow(artistSlug).catch((err) => {
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

  // On mobile, redirect to random show for better UX
  if (await isMobile()) {
    return null;
  }

  return null;
}

export const generateMetadata = async (props) => {
  const params = await props.params;
  const { artistSlug } = params;

  const artists = await RelistenAPI.fetchArtists();
  const name = artists.find((a) => a.slug === artistSlug)?.name;

  if (!name) return notFound();

  return {
    title: name,
  };
};
