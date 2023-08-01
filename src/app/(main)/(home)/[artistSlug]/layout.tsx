import { Suspense } from 'react';
import Column from '@/components/Column';
import YearsColumn from '@/components/YearsColumn';
import { MainLayoutProps } from '../layout';

export default function Page({ params, children }: MainLayoutProps) {
  const { artistSlug } = params;

  return (
    <>
      <Suspense fallback={<Column heading="Years" loading loadingAmount={20} />}>
        <YearsColumn artistSlug={artistSlug} />
      </Suspense>
      {children}
    </>
  );
}
