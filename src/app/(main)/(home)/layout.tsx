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
    <Flex className="grid grid-flow-col grid-cols-5 grid-rows-1 gap-8 overflow-y-auto px-4">
      <Suspense fallback={<Column heading="Artists" loading loadingAmount={20} />}>
        <ArtistsColumn />
      </Suspense>
      {children}
    </Flex>
  );
}
