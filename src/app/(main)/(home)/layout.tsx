import { PropsWithChildren, Suspense } from 'react';
import ArtistsColumn from '@/components/ArtistsColumn';
import Column from '@/components/Column';
import Flex from '@/components/Flex';

export interface RawParams {
  artistSlug?: string;
  year?: string;
  month?: string;
  day?: string;
  songSlug?: string;
  source?: string;
}

export type MainLayoutProps = PropsWithChildren & { params: RawParams };

export default function Layout({ children }: MainLayoutProps) {
  return (
    <Flex className="overflow-y-auto px-4 lg:grid lg:grid-flow-col lg:grid-cols-5 lg:grid-rows-1 lg:gap-8">
      <Suspense fallback={<Column heading="Artists" loading loadingAmount={20} />}>
        <ArtistsColumn />
      </Suspense>
      {children}
    </Flex>
  );
}
