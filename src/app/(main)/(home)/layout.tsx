import ArtistsColumn from '@/components/ArtistsColumn';
import Flex from '@/components/Flex';
import { PropsWithChildren } from 'react';

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
    <Flex className="overflow-y-auto px-4 lg:grid lg:grid-flow-col lg:grid-cols-5 lg:grid-rows-1 lg:gap-8 max-md:[&>div:last-child]:block max-md:[&>div]:hidden">
      <ArtistsColumn />
      {children}
    </Flex>
  );
}
