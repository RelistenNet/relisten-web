import { MainLayoutProps } from '@/app/(main)/(home)/layout';
import { useIsMobile } from '@/app/(main)/(home)/page';
import SongsColumn from '@/components/SongsColumn';
import TapesColumn from '@/components/TapesColumn';
import { API_DOMAIN } from '@/lib/constants';
import { createShowDate } from '@/lib/utils';
import { Tape } from '@/types';
import ky from 'ky-universal';
import { notFound } from 'next/navigation';
import React from 'react';

export const fetchShow = async (
  slug?: string,
  year?: string,
  displayDate?: string
): Promise<Partial<Tape>> => {
  if (!slug || !year || !displayDate) return { sources: [] };

  const parsed = (await ky(`${API_DOMAIN}/api/v2/artists/${slug}/years/${year}/${displayDate}`, {
    cache: 'no-cache',
  }).json()) as Tape;

  return parsed;
};

export default async function Page({ params, children }: MainLayoutProps) {
  const isMobile = useIsMobile();
  const { artistSlug, year, month, day } = params;

  if (!year || !month || !day) return notFound();

  const show = await fetchShow(artistSlug, year, createShowDate(year, month, day));

  return (
    <React.Fragment key={[artistSlug, year, month, day].join('::')}>
      <SongsColumn artistSlug={artistSlug} year={year} month={month} day={day} show={show} />
      {!isMobile && (
        <TapesColumn artistSlug={artistSlug} year={year} month={month} day={day} show={show} />
      )}
      {children}
    </React.Fragment>
  );
}
