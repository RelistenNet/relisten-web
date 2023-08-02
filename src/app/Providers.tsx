'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ReactQueryStreamedHydration } from '@tanstack/react-query-next-experimental';
import { MouseEventHandler, PropsWithChildren, useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { store } from '../redux';
import player from '@/lib/player';

export default function Providers({ children }: PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: Infinity,
          },
        },
      })
  );

  useEffect(() => {
    const playpause = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        player.togglePlayPause();
      }
    };
    document.addEventListener('keydown', playpause);

    return () => document.removeEventListener('keydown', playpause);
  }, []);

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ReactQueryStreamedHydration>{children}</ReactQueryStreamedHydration>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </Provider>
  );
}
