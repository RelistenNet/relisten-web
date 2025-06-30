'use client';

import { QueryClient, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Activity, Clock } from 'lucide-react';
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
    return parsed.concat(cache ?? []).slice(0, 500);
  }

  return cache ?? [];
};

const LoadingSkeleton = () => (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="animate-pulse space-y-3 rounded-xl border border-gray-100 p-4">
        <div className="h-4 rounded bg-gray-200"></div>
        <div className="h-3 w-3/4 rounded bg-gray-200"></div>
        <div className="space-y-2">
          <div className="h-2 w-1/2 rounded bg-gray-200"></div>
          <div className="h-2 w-2/3 rounded bg-gray-200"></div>
        </div>
      </div>
    ))}
  </div>
);

const EmptyState = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center py-16 text-center"
  >
    <div className="mb-4 rounded-full bg-gray-50 p-4">
      <Clock className="h-8 w-8 text-gray-400" />
    </div>
    <h3 className="mb-2 text-lg font-medium text-gray-900">No recent activity</h3>
    <p className="max-w-sm text-gray-500">
      Tracks will appear here as people listen to shows across the Relisten community.
    </p>
  </motion.div>
);

export default function RecentlyPlayed() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => fetchRecentlyPlayed(queryClient),
    refetchInterval: 7000, // refetch every 7 seconds
  });

  const tracks = query.data ? uniqBy(query.data, keyFn).slice(0, 40) : [];

  return (
    <div className="min-h-screen bg-gray-50/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="mb-2 flex items-center justify-center gap-3">
            <div className="rounded-full bg-green-100 p-2">
              <Activity className="h-6 w-6 text-green-600" />
            </div>
            <h1 className="mb-0 text-3xl font-bold text-gray-900 sm:text-4xl">Recently Played</h1>
          </div>
          <p className="mx-auto mb-4 max-w-2xl text-gray-600">
            This is what people are listening to right now - join 'em.
          </p>
        </motion.div>

        {/* Content */}
        {query.isLoading && <LoadingSkeleton />}

        {query.data && tracks.length === 0 && <EmptyState />}

        {query.data && tracks.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3"
          >
            <AnimatePresence initial={false} mode="popLayout">
              {tracks.map((data, index) => (
                <motion.div
                  key={data.track.track.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                  transition={{
                    delay: index * 0.05,
                    duration: 0.3,
                    ease: 'easeOut',
                  }}
                  layout
                >
                  <LiveTrack {...data} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}
