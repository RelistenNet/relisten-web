import { Suspense } from 'react';
import SongsColumn from '@/components/SongsColumn';
import TapesColumn from '@/components/TapesColumn';
import Column from '@/components/Column';
import { MainLayoutProps } from '@/app/(main)/(home)/layout';

export default function Page({ params, children }: MainLayoutProps) {
  const { artistSlug, year, month, day } = params;

  return (
    <>
      <Suspense fallback={<Column heading="Songs" loading loadingAmount={20} />}>
        <SongsColumn artistSlug={artistSlug} year={year} month={month} day={day} />
      </Suspense>
      <Suspense fallback={<Column heading="Sources" loading loadingAmount={20} />}>
        <TapesColumn artistSlug={artistSlug} year={year} month={month} day={day} />
      </Suspense>
      {children}
    </>
  );
}
