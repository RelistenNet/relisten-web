import RelistenAPI from '@/lib/RelistenAPI';
import { notFound } from 'next/navigation';

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

export const generateMetadata = async (props) => {
  const params = await props.params;
  const { artistSlug, year } = params;

  const artists = await RelistenAPI.fetchArtists();
  const name = artists.find((a) => a.slug === artistSlug)?.name;

  if (!name) return notFound();

  return {
    title: [capitalizeFirstLetterOfEachWord(year?.replaceAll('-', ' ')), name].join(' | '),
  };
};
