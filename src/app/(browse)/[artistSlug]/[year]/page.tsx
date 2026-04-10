import RelistenAPI from '@/lib/RelistenAPI';
import { deny, getSegmentParams } from '@timber-js/app/server';
import { route } from './_segment';

export default function Page() {
  return null;
}

function capitalizeFirstLetterOfEachWord(val: string): string {
  if (!val) return '';
  return String(val)
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export const metadata = async () => {
  const params = getSegmentParams(route);
  const artistSlug = params?.artistSlug as string | undefined;
  const year = params?.year as string | undefined;
  if (!artistSlug || !year) return {};

  const artists = await RelistenAPI.fetchArtists();
  const name = artists.find((a) => a.slug === artistSlug)?.name;

  if (!name) return {};

  return {
    title: [capitalizeFirstLetterOfEachWord(year?.replaceAll('-', ' ')), name].join(' | '),
  };
};
