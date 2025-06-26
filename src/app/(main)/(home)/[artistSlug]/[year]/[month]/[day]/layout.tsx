import { MainLayoutProps } from '@/app/(main)/(home)/layout';
import { isMobile } from '@/lib/isMobile';
import { fetchShow } from '@/app/queries';
import SongsColumn from '@/components/SongsColumn';
import TapesColumn from '@/components/TapesColumn';
import { createShowDate } from '@/lib/utils';
import { notFound } from 'next/navigation';
import React from 'react';

export default async function Page(props: MainLayoutProps) {
  const { children } = props;

  const [params, isMobileClient] = await Promise.all([props.params, isMobile()]);
  const { artistSlug, year, month, day } = params;

  if (!year || !month || !day) return notFound();

  const show = await fetchShow(artistSlug, year, createShowDate(year, month, day));

  return (
    <React.Fragment key={[artistSlug, year, month, day].join('::')}>
      <SongsColumn artistSlug={artistSlug} year={year} month={month} day={day} show={show} />
      {!isMobileClient && (
        <TapesColumn artistSlug={artistSlug} year={year} month={month} day={day} show={show} />
      )}
      {children}
    </React.Fragment>
  );
}
