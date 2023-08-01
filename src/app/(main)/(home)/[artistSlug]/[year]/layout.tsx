import { Suspense } from 'react';
import ShowsColumn from '@/components/ShowsColumn';
import Column from '@/components/Column';
import { MainLayoutProps } from '../../layout';

export default function Page({ params, children }: MainLayoutProps) {
  const { artistSlug, year } = params;

  return (
    <>
      <Suspense fallback={<Column heading="Shows" loading loadingAmount={20} />}>
        <ShowsColumn artistSlug={artistSlug} year={year} />
      </Suspense>
      {children}
    </>
  );
}
