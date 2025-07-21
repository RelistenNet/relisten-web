import Flex from '@/components/Flex';
import NavBar from '@/components/NavBar';
import cn from '@/lib/cn';
import { getIsInIframe } from '@/lib/isInIframe';
import { ReactNode } from 'react';

export default async function BrowseLayout({
  children,
  artists,
  years,
  venues,
  shows,
  songs,
  sources,
}: {
  children: ReactNode;
  artists: ReactNode;
  years: ReactNode;
  venues: ReactNode;
  shows: ReactNode;
  songs: ReactNode;
  sources: ReactNode;
}) {
  const isInIframe = await getIsInIframe();

  return (
    <Flex column className="h-screen">
      <NavBar />
      <div
        className={cn(
          'overflow-y-auto px-4 lg:grid lg:grid-flow-col lg:grid-cols-5 lg:grid-rows-1 lg:gap-8 max-md:[&>div]:hidden max-md:[&>div:last-child]:block',
          {
            ['lg:grid-cols-4']: isInIframe,
          }
        )}
      >
        {artists}
        {years}
        {venues}
        {/* {shows} */}
        {/* {songs} */}
        {/* {sources} */}
        {children}
      </div>
    </Flex>
  );
}
