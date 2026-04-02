import RelistenAPI from '@/lib/RelistenAPI';
import { isMobile } from '@/lib/isMobile';
import { paramAsString } from '@/lib/paramHelpers';
import { deny, getSegmentParams } from '@timber-js/app/server';

type PageProps = {
  params: Promise<{
    artistSlug: string;
  }>;
};

export default async function Page() {
  const artistSlug = paramAsString((await getSegmentParams()).artistSlug);

  if (await isMobile()) return null;

  const randomShow = await RelistenAPI.fetchRandomShow(artistSlug).catch((err) => {
    const statusCode = err?.response?.status;

    if (statusCode !== 404) {
      console.log('failed random show', artistSlug, statusCode);
    }

    deny(404);

    return null;
  });

  if (!randomShow) return deny(404);

  const { display_date } = randomShow ?? {};
  const [year, month, day] = display_date?.split('-') ?? [];

  if (!year || !month || !day) return deny(404);

  // On mobile, redirect to random show for better UX
  if (await isMobile()) {
    return null;
  }

  return null;
}

export const metadata = async () => {
  const params = await getSegmentParams().catch(() => null);
  const artistSlug = params?.artistSlug as string | undefined;
  if (!artistSlug) return {};

  const artists = await RelistenAPI.fetchArtists();
  const name = artists.find((a) => a.slug === artistSlug)?.name;

  if (!name) return {};

  return {
    title: name,
  };
};
