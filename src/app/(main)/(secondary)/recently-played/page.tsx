'use client';

import { QueryClient, useQuery, useQueryClient } from '@tanstack/react-query';
import LiveTrack from '../../../../components/LiveTrack';
import { API_DOMAIN } from '../../../../lib/constants';
import ky from 'ky-universal';

function uniqBy(a: any[], key: (item: any) => boolean) {
  const seen = new Set();
  return a.filter((item) => {
    const k = key(item);
    return seen.has(k) ? false : seen.add(k);
  });
}

// TODO: Update types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const keyFn = (item: any): boolean => {
  return item && item.track && item.track.track && item.track.track.id;
};

const QUERY_KEY = ['recentlyPlayed'];

const fetchRecentlyPlayed = async (queryClient: QueryClient) => {
  const cache = queryClient.getQueryData(QUERY_KEY) as any[];
  const lastSeenId = cache ? cache.slice(-1)[0]?.id : '';
  let paramsStr = '';

  if (lastSeenId) {
    paramsStr = `?lastSeenId=${lastSeenId}`;
  }
  const parsed = await ky(`${API_DOMAIN}/api/v2/live/history${paramsStr}`).json();

  return parsed;
};

export default function RecentlyPlayed() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['recentlyPlayed'],
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
