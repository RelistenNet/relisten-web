import Flex from '@/components/Flex';
import Player from '@/components/Player';
import RelistenAPI from '@/lib/RelistenAPI';
import { ReactNode } from 'react';

export default async function EmbedLayout({ children }: { children: ReactNode }) {
  const artists = await RelistenAPI.fetchArtists();

  const artistSlugsToName = artists.reduce(
    (memo, next) => {
      memo[String(next.slug)] = next.name;
      return memo;
    },
    {} as Record<string, string | undefined>
  );

  return (
    <Flex column className="h-screen bg-surface">
      <div className="bg-amber-500 text-center text-xs font-semibold tracking-wider dark:bg-amber-600">
        POWERED BY{' '}
        <a
          href="https://relisten.net"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-amber-700 dark:hover:text-amber-200"
        >
          RELISTEN.NET
        </a>{' '}
        &amp;{' '}
        <a
          href="https://phish.in"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-amber-700 dark:hover:text-amber-200"
        >
          PHISH.IN
        </a>
      </div>
      <div className="flex h-[50px] min-h-[50px] items-center justify-center border-b border-border bg-surface">
        <div className="w-full max-w-2xl">
          <Player artistSlugsToName={artistSlugsToName} />
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto">{children}</div>
    </Flex>
  );
}
