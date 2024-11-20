import ShowsColumn from '@/components/ShowsColumn';
import { MainLayoutProps } from '../../layout';
import React from 'react';

export default async function Page(props: MainLayoutProps) {
  const params = await props.params;

  const {
    children
  } = props;

  const { artistSlug, year } = params;

  return (
    <React.Fragment key={[artistSlug, year].join('::')}>
      <ShowsColumn artistSlug={artistSlug} year={year} />
      {children}
    </React.Fragment>
  );
}
