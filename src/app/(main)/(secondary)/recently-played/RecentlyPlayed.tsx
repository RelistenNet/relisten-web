'use client';

import { QueryClient, useQuery, useQueryClient } from '@tanstack/react-query';
import LiveTrack from '../../../../components/LiveTrack';
import { API_DOMAIN } from '../../../../lib/constants';

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
  let paramsStr = '';

  if (lastSeenId) {
    paramsStr = `?lastSeenId=${lastSeenId}`;
  }
  const res = await fetch(`${API_DOMAIN}/api/v2/live/history${paramsStr}`)
  const parsed = await res.json();

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

      {!query.data
        ? null
        : uniqBy(query.data as any[], keyFn).map((data) => (
            <LiveTrack {...data} key={data.track.track.id} />
          ))}
    </div>
  );
}
