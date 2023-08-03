import { MainLayoutProps } from '@/app/(main)/(home)/layout';
import SongsColumn from '@/components/SongsColumn';
import TapesColumn from '@/components/TapesColumn';
import { API_DOMAIN } from '@/lib/constants';
import { Tape } from '@/types';
import ky from 'ky';

export const fetchShow = async (
  slug?: string,
  year?: string,
  displayDate?: string
): Promise<Partial<Tape>> => {
  if (!slug || !year || !displayDate) return { sources: [] };

  const parsed = (await ky(
    `${API_DOMAIN}/api/v2/artists/${slug}/years/${year}/${displayDate}`
  ).json()) as Tape;

  return parsed;
};

export default async function Page({ params, children }: MainLayoutProps) {
  const { artistSlug, year, month, day } = params;

  const show = await fetchShow(artistSlug, year, [year, month, day].join('-'));

  return (
    <>
      <SongsColumn artistSlug={artistSlug} year={year} month={month} day={day} show={show} />
      <TapesColumn artistSlug={artistSlug} year={year} month={month} day={day} show={show} />
      {children}
    </>
  );
}
