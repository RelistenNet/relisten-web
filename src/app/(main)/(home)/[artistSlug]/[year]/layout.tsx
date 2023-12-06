import ShowsColumn from '@/components/ShowsColumn';
import { MainLayoutProps } from '../../layout';
import React from 'react';

export default function Page({ params, children }: MainLayoutProps) {
  const { artistSlug, year } = params;

  return (
    <React.Fragment key={[artistSlug, year].join('::')}>
      <ShowsColumn artistSlug={artistSlug} year={year} />
      {children}
    </React.Fragment>
  );
}
