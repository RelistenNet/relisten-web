'use client';

import { QueryClient, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import LiveTrack from '@/components/LiveTrack';
import RelistenAPI from '@/lib/RelistenAPI';

function uniqBy(a: any[], key: (item: any) => boolean) {
  const seen = new Set();
  return a
    .filter((item) => {
      const k = key(item);
      return seen.has(k) ? false : seen.add(k);
    })
    .sort((itemA, itemB) => itemB?.id - itemA?.id);
}

// TODO: Update types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const keyFn = (item: any): boolean => {
  return item && item.track && item.track.track && item.track.track.id;
};

const QUERY_KEY = ['recentlyPlayed'];

const fetchRecentlyPlayed = async (queryClient: QueryClient) => {
  const cache = queryClient.getQueryData(QUERY_KEY) as any[];
  const lastSeenId = cache ? Math.max(...cache.map((t) => t.id)) : '';

  const parsed = await RelistenAPI.fetchLiveHistory(String(lastSeenId) || undefined);

  if (Array.isArray(parsed)) {
    return parsed.concat(cache ?? []).slice(0, 100);
  }

  return cache ?? [];
};

export default function RecentlyPlayed() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => fetchRecentlyPlayed(queryClient),
    refetchInterval: 7000, // refetch every 7 seconds
  });

  return (
    <div>
      <h1>Recently Played</h1>

      <div className="grid grid-flow-row-dense grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-3">
        <AnimatePresence initial={false}>
          {!query.data
            ? null
            : uniqBy(query.data as any[], keyFn)
                .slice(0, 40)
                .map((data) => <LiveTrack {...data} key={data.track.track.id} />)}
        </AnimatePresence>
      </div>
    </div>
  );
}
