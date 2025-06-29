import Flex from '@/components/Flex';
import NavBar from '@/components/NavBar';
import { ReactNode } from 'react';

export default function BrowseLayout({
  children,
  artists,
  years,
  shows,
  songs,
  sources,
}: {
  children: ReactNode;
  artists: ReactNode;
  years: ReactNode;
  shows: ReactNode;
  songs: ReactNode;
  sources: ReactNode;
}) {
  return (
    <Flex column className="h-screen">
      <NavBar />
      <div className="overflow-y-auto px-4 lg:grid lg:grid-flow-col lg:grid-cols-5 lg:grid-rows-1 lg:gap-8 max-md:[&>div:last-child]:block max-md:[&>div]:hidden">
        {artists}
        {years}
        {shows}
        {songs}
        {sources}
        {children}
      </div>
    </Flex>
  );
}
