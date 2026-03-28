'use client';

import player from '@/lib/player';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { PropsWithChildren, useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { store } from '../redux';

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
    const onKeyDown = (e: KeyboardEvent) => {
      // Guard: player proxy returns undefined for methods when
      // initGaplessPlayer() hasn't been called yet (no track loaded).
      if (!player.togglePlayPause) return;

      if (e.code === 'Space') {
        player.togglePlayPause();
      }
      if (e.code === 'ArrowRight') {
        player.next();
      }
      if (e.code === 'ArrowLeft') {
        player.previous();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
          {children}
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </Provider>
  );
}
